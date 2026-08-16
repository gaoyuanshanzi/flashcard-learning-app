import { Pool } from '@neondatabase/serverless';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined.');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export interface VocabularyRecord {
  id?: number;
  foreign_word: string;
  korean_meaning: string;
  notes?: string | null;
  created_at?: string | Date;
}

/**
 * Initializes the vocabulary table in Neon DB if it doesn't exist.
 */
export async function initVocabularyTable(): Promise<void> {
  const db = getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id SERIAL PRIMARY KEY,
      foreign_word TEXT NOT NULL,
      korean_meaning TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Fetches all vocabulary items ordered by id ascending.
 */
export async function getAllVocabulary(): Promise<VocabularyRecord[]> {
  const db = getDbPool();
  await initVocabularyTable();
  const res = await db.query(
    'SELECT id, foreign_word, korean_meaning, notes, created_at FROM vocabulary ORDER BY id ASC;'
  );
  return res.rows.map(row => ({
    id: row.id,
    foreign_word: row.foreign_word || '',
    korean_meaning: row.korean_meaning || '',
    notes: row.notes || '',
    created_at: row.created_at,
  }));
}

/**
 * Bulk inserts vocabulary items.
 * @param words List of vocabulary records to insert
 * @param replace If true, clears existing vocabulary before inserting
 */
export async function insertVocabulary(
  words: { foreign_word: string; korean_meaning: string; notes?: string | null }[],
  replace = false
): Promise<number> {
  if (!words || words.length === 0) return 0;

  const db = getDbPool();
  await initVocabularyTable();

  if (replace) {
    await db.query('TRUNCATE TABLE vocabulary RESTART IDENTITY;');
  }

  // Insert in batches of 100 for optimal serverless connection performance
  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const valuePlaceholders: string[] = [];
    const params: (string | null)[] = [];

    batch.forEach((w, index) => {
      const offset = index * 3;
      valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
      params.push(w.foreign_word.trim(), w.korean_meaning.trim(), w.notes ? w.notes.trim() : '');
    });

    const query = `
      INSERT INTO vocabulary (foreign_word, korean_meaning, notes)
      VALUES ${valuePlaceholders.join(', ')};
    `;
    await db.query(query, params);
    insertedCount += batch.length;
  }

  return insertedCount;
}
