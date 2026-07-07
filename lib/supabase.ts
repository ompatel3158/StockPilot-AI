import fs from 'fs';
import path from 'path';

// Define path for local persistent storage in the project directory
const DB_FILE = path.join(process.cwd(), 'db.json');

/**
 * Initialize and read local JSON database.
 */
function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      watchlist: [
        { id: '1', symbol: 'RELIANCE', created_at: new Date().toISOString() },
        { id: '2', symbol: 'TCS', created_at: new Date().toISOString() },
        { id: '3', symbol: 'INFY', created_at: new Date().toISOString() }
      ],
      journal_entries: [
        {
          id: '1',
          symbol: 'RELIANCE',
          position_type: 'LONG',
          quantity: 15,
          purchase_price: 2350.00,
          target_price: 2600.00,
          stop_loss: 2200.00,
          thesis: 'Strong refinery margins and Jio subscriber growth.',
          ai_reflections: 'Neutral stance. Ensure stop-loss is strictly trailed.',
          status: 'OPEN',
          created_at: new Date().toISOString()
        }
      ],
      portfolio_cache: [
        { symbol: 'RELIANCE.NS', quantity: 15, average_price: 2350.00 },
        { symbol: 'TCS.NS', quantity: 8, average_price: 3150.00 },
        { symbol: 'INFY.NS', quantity: 25, average_price: 1450.00 },
        { symbol: 'HDFCBANK.NS', quantity: 30, average_price: 1600.00 }
      ],
      news_cache: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('Failed to parse db.json, returning empty template:', e);
    return { watchlist: [], journal_entries: [], portfolio_cache: [], news_cache: [] };
  }
}

/**
 * Write changes back to db.json.
 */
function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to write db.json:', e);
  }
}

/**
 * Mock Query Builder simulating Supabase client behavior locally.
 */
class LocalQueryBuilder {
  private table: string;
  private filters: Array<(item: any) => boolean> = [];
  private sortField: string | null = null;
  private sortAscending = true;
  private limitCount: number | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string) {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push(item => item[column] === value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sortField = column;
    this.sortAscending = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  /**
   * Implement promise 'then' to support standard async/await calls.
   */
  async then(resolve: any) {
    try {
      const db = readDb();
      let data = db[this.table] || [];

      // Apply column equality filters
      for (const filter of this.filters) {
        data = data.filter(filter);
      }

      // Apply sorting
      if (this.sortField) {
        const field = this.sortField;
        data.sort((a, b) => {
          const valA = a[field];
          const valB = b[field];
          if (valA < valB) return this.sortAscending ? -1 : 1;
          if (valA > valB) return this.sortAscending ? 1 : -1;
          return 0;
        });
      }

      // Apply limit
      if (this.limitCount !== null) {
        data = data.slice(0, this.limitCount);
      }

      resolve({ data, error: null });
    } catch (e: any) {
      resolve({ data: null, error: e });
    }
  }

  async insert(row: any) {
    try {
      const db = readDb();
      const tableData = db[this.table] || [];
      const newRow = {
        id: row.id || String(tableData.length + 1 + Math.random().toString(36).substring(2, 6)),
        created_at: new Date().toISOString(),
        ...row
      };
      tableData.push(newRow);
      db[this.table] = tableData;
      writeDb(db);
      return {
        data: [newRow],
        error: null,
        select: () => ({
          then: (resolve: any) => resolve({ data: [newRow], error: null })
        })
      };
    } catch (e: any) {
      return { data: null, error: e };
    }
  }

  async upsert(row: any, options?: { onConflict?: string }) {
    try {
      const db = readDb();
      let tableData = db[this.table] || [];
      const conflictField = options?.onConflict || 'id';
      const conflictVal = row[conflictField];

      const existingIdx = tableData.findIndex(item => item[conflictField] === conflictVal);
      let finalRow;
      if (existingIdx !== -1) {
        finalRow = { ...tableData[existingIdx], ...row };
        tableData[existingIdx] = finalRow;
      } else {
        finalRow = {
          id: row.id || String(tableData.length + 1 + Math.random().toString(36).substring(2, 6)),
          created_at: new Date().toISOString(),
          ...row
        };
        tableData.push(finalRow);
      }
      db[this.table] = tableData;
      writeDb(db);
      return {
        data: [finalRow],
        error: null,
        select: () => ({
          then: (resolve: any) => resolve({ data: [finalRow], error: null })
        })
      };
    } catch (e: any) {
      return { data: null, error: e };
    }
  }

  async update(updates: any) {
    try {
      const db = readDb();
      let tableData = db[this.table] || [];
      let updatedRows: any[] = [];

      tableData = tableData.map(item => {
        let matches = true;
        for (const filter of this.filters) {
          if (!filter(item)) {
            matches = false;
            break;
          }
        }
        if (matches) {
          const updatedItem = { ...item, ...updates };
          updatedRows.push(updatedItem);
          return updatedItem;
        }
        return item;
      });

      db[this.table] = tableData;
      writeDb(db);
      return {
        data: updatedRows,
        error: null,
        select: () => ({
          then: (resolve: any) => resolve({ data: updatedRows, error: null })
        })
      };
    } catch (e: any) {
      return { data: null, error: e };
    }
  }

  async delete() {
    try {
      const db = readDb();
      let tableData = db[this.table] || [];

      const remaining = tableData.filter(item => {
        let matches = true;
        for (const filter of this.filters) {
          if (!filter(item)) {
            matches = false;
            break;
          }
        }
        return !matches;
      });

      db[this.table] = remaining;
      writeDb(db);
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  }
}

// Export the simulated client under the exact same name
export const supabase = {
  from(table: string) {
    return new LocalQueryBuilder(table);
  }
};

// Set to true so all Next.js API routes route directly through this Local DB
export const isSupabaseConfigured = true;
export const fallbackDb = {};
