import os
import pyotp
import logging
import requests
import random
from flask import Flask, jsonify, request
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Global session variables for Kotak Neo REST API
session_token = None
session_sid = None
session_base_url = None
mock_mode = False

# Check if mock mode is requested or if credentials are placeholders/missing
def check_mock_mode():
    global mock_mode
    is_mock = os.getenv("MOCK_MODE", "false").lower() == "true"
    
    # Get all credentials
    consumer_key = os.getenv("KOTAK_CONSUMER_KEY", "")
    mobile = os.getenv("KOTAK_MOBILE", "")
    ucc = os.getenv("KOTAK_UCC", "")
    mpin = os.getenv("KOTAK_MPIN", "")
    totp_secret = os.getenv("KOTAK_TOTP_SECRET", "")
    
    # Detect placeholders or missing values
    has_placeholders = (
        not consumer_key or consumer_key.startswith("your_") or
        not mobile or mobile.startswith("your_") or
        not ucc or ucc.startswith("your_") or
        not mpin or mpin.startswith("your_") or
        not totp_secret or totp_secret.startswith("your_")
    )
    
    if is_mock or has_placeholders:
        mock_mode = True
        logging.info("--- RUNNING IN MOCK MODE (REST API Mock) ---")
        logging.info("Reason: MOCK_MODE=true or placeholder credentials detected.")
    else:
        mock_mode = False
        logging.info("--- RUNNING IN LIVE KOTAK NEO MODE (REST API Live) ---")

check_mock_mode()

def get_proxies():
    """Returns proxy dictionary if KOTAK_PROXY is set in env."""
    proxy_url = os.getenv("KOTAK_PROXY")
    if proxy_url and not proxy_url.startswith("your_"):
        return {
            "http": proxy_url,
            "https": proxy_url
        }
    return None

def get_totp():
    """Generate 6-digit TOTP code server-side using KOTAK_TOTP_SECRET."""
    totp_secret = os.getenv("KOTAK_TOTP_SECRET")
    if not totp_secret:
        raise ValueError("KOTAK_TOTP_SECRET is not set in environment variables.")
    totp_secret = totp_secret.replace(" ", "").strip()
    totp = pyotp.TOTP(totp_secret)
    return totp.now()

def login_to_kotak():
    """Authenticate using official Kotak Neo REST API endpoints (Step 2 and Step 3)."""
    global session_token, session_sid, session_base_url
    if mock_mode:
        logging.info("[Mock] Successfully authenticated in mock mode.")
        session_token = "MOCK_SESSION_TOKEN"
        session_sid = "MOCK_SESSION_SID"
        session_base_url = "https://mock.kotaksecurities.com"
        return
        
    consumer_key = os.getenv("KOTAK_CONSUMER_KEY")
    mobile = os.getenv("KOTAK_MOBILE")
    ucc = os.getenv("KOTAK_UCC")
    mpin = os.getenv("KOTAK_MPIN")
    
    if mobile:
        mobile = mobile.strip()
        if len(mobile) == 10 and mobile.isdigit():
            mobile = f"+91{mobile}"
            
    if not all([consumer_key, mobile, ucc, mpin]):
        raise ValueError("Missing Kotak Neo credentials (KOTAK_CONSUMER_KEY, KOTAK_MOBILE, KOTAK_UCC, KOTAK_MPIN) in env.")

    # Step 1: Register/Login with TOTP
    # Endpoint: POST https://mis.kotaksecurities.com/login/1.0/tradeApiLogin
    totp_code = get_totp()
    logging.info(f"Step 1: REST auth for mobile {mobile} with TOTP: {totp_code}")
    
    login_url = "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin"
    login_headers = {
        "Authorization": consumer_key,
        "neo-fin-key": "neotradeapi",
        "Content-Type": "application/json"
    }
    login_body = {
        "mobileNumber": mobile,
        "ucc": ucc,
        "totp": totp_code
    }
    
    response = requests.post(login_url, headers=login_headers, json=login_body, timeout=12, proxies=get_proxies())
    response.raise_for_status()
    login_data = response.json()
    
    if login_data.get("status") == "error" or "data" not in login_data:
        raise Exception(f"TOTP Login failed: {login_data.get('message', 'Unknown error')}")
        
    view_token = login_data["data"]["token"]
    view_sid = login_data["data"]["sid"]
    
    # Step 2: Validate MPIN
    # Endpoint: POST https://mis.kotaksecurities.com/login/1.0/tradeApiValidate
    logging.info("Step 2: REST validation for MPIN...")
    validate_url = "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate"
    validate_headers = {
        "Authorization": consumer_key,
        "neo-fin-key": "neotradeapi",
        "sid": view_sid,
        "Auth": view_token,
        "Content-Type": "application/json"
    }
    validate_body = {
        "mpin": mpin
    }
    
    val_response = requests.post(validate_url, headers=validate_headers, json=validate_body, timeout=12, proxies=get_proxies())
    val_response.raise_for_status()
    validate_data = val_response.json()
    
    if validate_data.get("status") == "error" or "data" not in validate_data:
        raise Exception(f"MPIN Validation failed: {validate_data.get('message', 'Unknown error')}")
        
    session_token = validate_data["data"]["token"]
    session_sid = validate_data["data"]["sid"]
    session_base_url = validate_data["data"].get("baseUrl", "https://cis.kotaksecurities.com")
    
    if session_base_url.endswith('/'):
        session_base_url = session_base_url[:-1]
        
    logging.info(f"Successfully authenticated via REST. Base URL: {session_base_url}")

def api_request_with_reauth(method, path, **kwargs):
    """Executes a REST API call, automatically re-authenticating if it fails with session expiry (401/1003)."""
    global session_token, session_sid, session_base_url
    if mock_mode:
        return {}
        
    if not session_token:
        login_to_kotak()
        
    url = f"{session_base_url}{path}"
    headers = kwargs.get("headers", {})
    headers.update({
        "accept": "application/json",
        "Sid": session_sid,
        "Auth": session_token,
        "neo-fin-key": "neotradeapi"
    })
    kwargs["headers"] = headers
    
    # Inject proxies
    kwargs["proxies"] = get_proxies()
    
    try:
        response = requests.request(method, url, **kwargs)
        if response.status_code == 401:
            raise requests.exceptions.HTTPError("Unauthorized - Session expired", response=response)
            
        response_json = response.json()
        if isinstance(response_json, dict) and response_json.get("stCode") == 1003:
            raise requests.exceptions.HTTPError("Invalid Session (stCode 1003)", response=response)
            
        return response_json
    except (requests.exceptions.HTTPError, Exception) as e:
        err_msg = str(e).lower()
        logging.warning(f"REST API request failed: {e}. Checking if re-auth is needed.")
        
        is_auth_error = "session" in err_msg or "token" in err_msg or "unauthorized" in err_msg or "1003" in err_msg or \
                        (isinstance(e, requests.exceptions.HTTPError) and e.response.status_code in [401, 403])
                        
        if is_auth_error:
            logging.info("Attempting automatic re-authentication...")
            try:
                login_to_kotak()
                logging.info("Re-authenticated successfully. Retrying request.")
                
                url = f"{session_base_url}{path}"
                headers = kwargs.get("headers", {})
                headers.update({
                    "Sid": session_sid,
                    "Auth": session_token
                })
                kwargs["headers"] = headers
                kwargs["proxies"] = get_proxies()
                
                retry_response = requests.request(method, url, **kwargs)
                return retry_response.json()
            except Exception as retry_err:
                logging.error(f"Re-auth retry failed: {retry_err}")
                raise retry_err
        else:
            raise e

# MOCK DATA GENERATION
def get_mock_holdings():
    return [
        {
            "trading_symbol": "RELIANCE.NS",
            "symbol": "RELIANCE",
            "quantity": 15,
            "average_price": 2350.00,
            "current_price": 2420.50,
            "displaySymbol": "RELIANCE",
            "mktValue": 15 * 2420.50,
            "pnl": 15 * (2420.50 - 2350.00),
            "pnl_percentage": ((2420.50 - 2350.00) / 2350.00) * 100
        },
        {
            "trading_symbol": "TCS.NS",
            "symbol": "TCS",
            "quantity": 8,
            "average_price": 3150.00,
            "current_price": 3310.20,
            "displaySymbol": "TCS",
            "mktValue": 8 * 3310.20,
            "pnl": 8 * (3310.20 - 3150.00),
            "pnl_percentage": ((3310.20 - 3150.00) / 3150.00) * 100
        },
        {
            "trading_symbol": "INFY.NS",
            "symbol": "INFY",
            "quantity": 25,
            "average_price": 1450.00,
            "current_price": 1410.80,
            "displaySymbol": "INFY",
            "mktValue": 25 * 1410.80,
            "pnl": 25 * (1410.80 - 1450.00),
            "pnl_percentage": ((1410.80 - 1450.00) / 1450.00) * 100
        },
        {
            "trading_symbol": "HDFCBANK.NS",
            "symbol": "HDFCBANK",
            "quantity": 30,
            "average_price": 1600.00,
            "current_price": 1645.00,
            "displaySymbol": "HDFCBANK",
            "mktValue": 30 * 1645.00,
            "pnl": 30 * (1645.00 - 1600.00),
            "pnl_percentage": ((1645.00 - 1600.00) / 1600.00) * 100
        }
    ]

def get_mock_positions():
    return [
        {
            "trading_symbol": "TATAMOTORS.NS",
            "symbol": "TATAMOTORS",
            "quantity": 50,
            "average_price": 620.00,
            "current_price": 628.40,
            "displaySymbol": "TATAMOTORS",
            "mktValue": 50 * 628.40,
            "pnl": 50 * (628.40 - 620.00),
            "position_type": "LONG",
            "pnl_percentage": ((628.40 - 620.00) / 620.00) * 100
        }
    ]

def get_mock_quote(symbol):
    base_prices = {
        "RELIANCE": 2420.50,
        "TCS": 3310.20,
        "INFY": 1410.80,
        "HDFCBANK": 1645.00,
        "TATAMOTORS": 628.40,
        "NIFTY": 24300.00,
        "SENSEX": 79800.00
    }
    
    base_price = base_prices.get(symbol.upper(), 100.00)
    random.seed(symbol.upper())
    pct_change = random.uniform(-2.5, 3.0)
    close_price = base_price / (1 + pct_change / 100.0)
    open_price = close_price * random.uniform(0.99, 1.01)
    high_price = max(open_price, base_price) * random.uniform(1.0, 1.015)
    low_price = min(open_price, base_price) * random.uniform(0.985, 1.0)
    
    return {
        "data": [
            {
                "symbol": symbol.upper(),
                "lp": f"{base_price:.2f}",
                "open": f"{open_price:.2f}",
                "high": f"{high_price:.2f}",
                "low": f"{low_price:.2f}",
                "close": f"{close_price:.2f}",
                "netChange": f"{(base_price - close_price):.2f}",
                "percentChange": f"{pct_change:.2f}"
            }
        ]
    }

@app.route('/login', methods=['POST'])
def force_login():
    """Manual trigger to force authentication."""
    try:
        login_to_kotak()
        return jsonify({"status": "success", "message": "Successfully authenticated via REST.", "mode": "mock" if mock_mode else "live"})
    except Exception as e:
        logging.error(f"Force login error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/holdings', methods=['GET'])
def get_holdings():
    """Fetch current portfolio holdings."""
    try:
        if mock_mode:
            return jsonify(get_mock_holdings())
            
        res = api_request_with_reauth("GET", "/portfolio/v1/holdings", headers={
            "Content-Type": "application/x-www-form-urlencoded"
        })
        
        raw_holdings = res.get("data", [])
        mapped_holdings = []
        for item in raw_holdings:
            average_price = float(item.get("averagePrice", 0.0))
            quantity = int(item.get("quantity", 0))
            current_price = float(item.get("closingPrice", 0.0))
            mkt_val = float(item.get("mktValue", 0.0))
            holding_cost = float(item.get("holdingCost", 1.0))
            pnl = float(item.get("unrealisedGainLoss", 0.0))
            
            mapped_holdings.append({
                "trading_symbol": item.get("commonScripCode", item.get("symbol", "")),
                "symbol": item.get("symbol", ""),
                "quantity": quantity,
                "average_price": average_price,
                "current_price": current_price,
                "displaySymbol": item.get("displaySymbol", ""),
                "mktValue": mkt_val,
                "pnl": pnl,
                "pnl_percentage": (pnl / holding_cost) * 100 if holding_cost > 0 else 0.0
            })
            
        return jsonify(mapped_holdings)
    except Exception as e:
        logging.error(f"Holdings fetch error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/positions', methods=['GET'])
def get_positions():
    """Fetch day's trade positions."""
    try:
        if mock_mode:
            return jsonify(get_mock_positions())
            
        res = api_request_with_reauth("GET", "/quick/user/positions", headers={
            "Content-Type": "application/x-www-form-urlencoded"
        })
        
        raw_positions = res.get("data", [])
        mapped_positions = []
        for item in raw_positions:
            qty = int(item.get("qty", 0))
            buy_amt = float(item.get("buyAmt", 0.0))
            sell_amt = float(item.get("sellAmt", 0.0))
            fl_buy_qty = int(item.get("flBuyQty", 1))
            fl_sell_qty = int(item.get("flSellQty", 1))
            
            avg_price = buy_amt / fl_buy_qty if fl_buy_qty > 0 else 0.0
            curr_price = sell_amt / fl_sell_qty if fl_sell_qty > 0 else 0.0
            
            mapped_positions.append({
                "trading_symbol": item.get("trdSym", ""),
                "symbol": item.get("sym", ""),
                "quantity": qty,
                "average_price": avg_price,
                "current_price": curr_price,
                "displaySymbol": item.get("sym", ""),
                "mktValue": buy_amt + sell_amt,
                "pnl": sell_amt - buy_amt,
                "position_type": "LONG" if qty >= 0 else "SHORT",
                "pnl_percentage": ((sell_amt - buy_amt) / buy_amt) * 100 if buy_amt > 0 else 0.0
            })
            
        return jsonify(mapped_positions)
    except Exception as e:
        logging.error(f"Positions fetch error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/quote', methods=['GET'])
def get_quote():
    """Fetch live quote (LTP, OHLC) using the official Kotak Quotes REST endpoint."""
    symbol = request.args.get('symbol')
    segment = request.args.get('segment', 'nse_cm')
    
    if not symbol:
        return jsonify({"error": "symbol parameter is required"}), 400
        
    try:
        if mock_mode:
            return jsonify(get_mock_quote(symbol))
            
        global session_base_url
        if not session_base_url:
            login_to_kotak()
            
        segment_lower = segment.lower()
        url = f"{session_base_url}/script-details/1.0/quotes/neosymbol/{segment_lower}|{symbol.upper()}/all"
        headers = {
            "Authorization": os.getenv("KOTAK_CONSUMER_KEY"),
            "Content-Type": "application/json"
        }
        
        response = requests.get(url, headers=headers, timeout=10, proxies=get_proxies())
        
        if response.status_code in [401, 403]:
            login_to_kotak()
            url = f"{session_base_url}/script-details/1.0/quotes/neosymbol/{segment_lower}|{symbol.upper()}/all"
            response = requests.get(url, headers=headers, timeout=10, proxies=get_proxies())
            
        response.raise_for_status()
        quote_data = response.json()
        
        if isinstance(quote_data, list) and len(quote_data) > 0:
            quote_item = quote_data[0]
            ohlc = quote_item.get("ohlc", {})
            mapped_data = {
                "data": [
                    {
                        "symbol": quote_item.get("exchange_token", symbol.upper()),
                        "lp": quote_item.get("ltp", "0.00"),
                        "open": ohlc.get("open", "0.00"),
                        "high": ohlc.get("high", "0.00"),
                        "low": ohlc.get("low", "0.00"),
                        "close": ohlc.get("close", "0.00"),
                        "netChange": quote_item.get("change", "0.00"),
                        "percentChange": quote_item.get("per_change", "0.00")
                    }
                ]
            }
            return jsonify(mapped_data)
        else:
            return jsonify({"error": "No quote data returned", "response": quote_data}), 500
            
    except Exception as e:
        logging.error(f"Quote fetch error for {symbol}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Check microservice health status."""
    check_mock_mode()
    return jsonify({
        "status": "healthy",
        "logged_in": session_token is not None,
        "mock_mode": mock_mode
    })

if __name__ == '__main__':
    port = int(os.getenv("KOTAK_SERVICE_PORT", 5000))
    app.run(host='127.0.0.1', port=port, debug=False)
