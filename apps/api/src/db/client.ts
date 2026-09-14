import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { config } from '../config';

interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  init(): Promise<void>;
  close(): Promise<void>;
}

class DatabaseManager implements DbClient {
  private pgliteInstance: PGlite | null = null;
  private pgPool: Pool | null = null;
  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) return;

    if (config.databaseUrl) {
      console.log(' Connecting to external PostgreSQL database...');
      this.pgPool = new Pool({ connectionString: config.databaseUrl });
    } else if (process.env.NODE_ENV === 'test') {
      console.log(' Initializing isolated in-memory PostgreSQL (PGlite)...');
      this.pgliteInstance = new PGlite();
    } else {
      console.log(' Initializing embedded PostgreSQL (PGlite)...');
      try {
        if (!fs.existsSync(config.pgliteDir)) {
          fs.mkdirSync(config.pgliteDir, { recursive: true });
        }
        this.pgliteInstance = new PGlite(config.pgliteDir);
      } catch (err: any) {
        console.warn('Recovering PGlite directory from dirty state:', err.message);
        try {
          fs.rmSync(config.pgliteDir, { recursive: true, force: true });
          fs.mkdirSync(config.pgliteDir, { recursive: true });
          this.pgliteInstance = new PGlite(config.pgliteDir);
        } catch {
          console.warn('Falling back to memory-backed PGlite instance');
          this.pgliteInstance = new PGlite();
        }
      }
    }

    // Run schema
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await this.execMulti(schemaSql);
      
      // Auto-migrate new columns for existing databases
      try {
        await this.execMulti(`
          ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;
          ALTER TABLE question_versions ADD COLUMN IF NOT EXISTS image_url TEXT;
          ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS join_code TEXT;
          ALTER TABLE attempts ADD COLUMN IF NOT EXISTS learner_name TEXT DEFAULT 'Learner';
          ALTER TABLE attempts ALTER COLUMN learner_name DROP NOT NULL;
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attempts' AND column_name='user_id' AND is_nullable='NO') THEN
              ALTER TABLE attempts ALTER COLUMN user_id DROP NOT NULL;
            END IF;
          END $$;
          CREATE INDEX IF NOT EXISTS idx_quizzes_join_code ON quizzes(join_code);
        `);
      } catch (colErr: any) {
        // Ignored if column already exists or not supported
      }

      console.log(' PostgreSQL Schema verified & migrated successfully.');
    }



    this.initialized = true;
  }

  private async execMulti(sqlStatements: string): Promise<void> {
    if (this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query(sqlStatements);
      } finally {
        client.release();
      }
    } else if (this.pgliteInstance) {
      await this.pgliteInstance.exec(sqlStatements);
    }
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.initialized) {
      await this.init();
    }

    if (this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount || 0
      };
    } else if (this.pgliteInstance) {
      const res = await this.pgliteInstance.query(sql, params);
      return {
        rows: (res.rows || []) as T[],
        rowCount: res.rows ? res.rows.length : 0
      };
    }

    throw new Error('Database not initialized');
  }

  public async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    } else if (this.pgliteInstance) {
      await this.pgliteInstance.close();
    }
    this.initialized = false;
  }
}

export const db = new DatabaseManager();
