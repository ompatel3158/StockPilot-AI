# Use a slim base image containing Node.js 20 and Python 3.12
FROM nikolaik/python-nodejs:python3.12-nodejs20-slim AS base

WORKDIR /app

# Install system dependencies if any needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Install Node dependencies and build Next.js
FROM base AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# We don't want to copy local env files during build so the image remains clean and secure
RUN rm -f .env
RUN npm run build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy Next.js files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/app ./app
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Install Python requirements
RUN pip3 install --no-cache-dir requests pyotp Flask python-dotenv

# Copy start script
COPY start.sh ./
RUN chmod +x start.sh

# Expose Next.js port
EXPOSE 8080

# Run the startup script
ENTRYPOINT ["./start.sh"]
```,Description:
