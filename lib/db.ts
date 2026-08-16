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

export interface VocabularyFileRecord {
  id: number;
  file_name: string;
  word_count: number;
  created_at: string;
}

export interface VocabularyRecord {
  id?: number;
  file_id?: number;
  foreign_word: string;
  korean_meaning: string;
  notes?: string | null;
  created_at?: string | Date;
}

/**
 * Initializes the vocabulary tables in Neon DB if they don't exist.
 */
export async function initVocabularyTable(): Promise<void> {
  const db = getDbPool();
  
  // 1. Create vocabulary_files metadata table
  await db.query(`
    CREATE TABLE IF NOT EXISTS vocabulary_files (
      id SERIAL PRIMARY KEY,
      file_name TEXT NOT NULL,
      word_count INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Create vocabulary table with foreign key cascade
  await db.query(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id SERIAL PRIMARY KEY,
      file_id INT REFERENCES vocabulary_files(id) ON DELETE CASCADE,
      foreign_word TEXT NOT NULL,
      korean_meaning TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Backward compatibility: ensure file_id column exists if table was created previously
  try {
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='vocabulary' AND column_name='file_id'
        ) THEN
          ALTER TABLE vocabulary ADD COLUMN file_id INT REFERENCES vocabulary_files(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  } catch (e) {
    // ignore
  }
}

/**
 * Lists all uploaded CSV files stored in Neon DB.
 */
export async function getVocabularyFiles(): Promise<VocabularyFileRecord[]> {
  const db = getDbPool();
  await initVocabularyTable();
  const res = await db.query(
    'SELECT id, file_name, word_count, created_at FROM vocabulary_files ORDER BY id DESC;'
  );
  return res.rows.map(row => ({
    id: row.id,
    file_name: row.file_name,
    word_count: row.word_count || 0,
    created_at: row.created_at,
  }));
}

/**
 * Fetches vocabulary words by specific file ID, or all vocabulary if fileId is null/undefined.
 */
export async function getVocabularyWords(fileId?: number): Promise<VocabularyRecord[]> {
  const db = getDbPool();
  await initVocabularyTable();

  let query = 'SELECT id, file_id, foreign_word, korean_meaning, notes, created_at FROM vocabulary';
  const params: any[] = [];

  if (fileId) {
    query += ' WHERE file_id = $1';
    params.push(fileId);
  }
  query += ' ORDER BY id ASC;';

  const res = await db.query(query, params);
  return res.rows.map(row => ({
    id: row.id,
    file_id: row.file_id,
    foreign_word: row.foreign_word || '',
    korean_meaning: row.korean_meaning || '',
    notes: row.notes || '',
    created_at: row.created_at,
  }));
}

/**
 * Saves a new CSV file and its word records into Neon DB.
 */
export async function saveVocabularyFile(
  fileName: string,
  words: { foreign_word: string; korean_meaning: string; notes?: string | null }[]
): Promise<{ fileId: number; insertedCount: number }> {
  if (!words || words.length === 0) {
    throw new Error('저장할 단어 데이터가 없습니다.');
  }

  const db = getDbPool();
  await initVocabularyTable();

  // 1. Insert file record
  const fileRes = await db.query(
    'INSERT INTO vocabulary_files (file_name, word_count) VALUES ($1, $2) RETURNING id;',
    [fileName.trim() || '단어장.csv', words.length]
  );
  const fileId = fileRes.rows[0].id;

  // 2. Bulk insert vocabulary with file_id in batches of 100
  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const valuePlaceholders: string[] = [];
    const params: (string | number | null)[] = [];

    batch.forEach((w, index) => {
      const offset = index * 4;
      valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
      params.push(fileId, w.foreign_word.trim(), w.korean_meaning.trim(), w.notes ? w.notes.trim() : '');
    });

    const query = `
      INSERT INTO vocabulary (file_id, foreign_word, korean_meaning, notes)
      VALUES ${valuePlaceholders.join(', ')};
    `;
    await db.query(query, params);
    insertedCount += batch.length;
  }

  return { fileId, insertedCount };
}

/**
 * Deletes a single CSV file and all its associated words from Neon DB (frees storage).
 */
export async function deleteVocabularyFile(fileId: number): Promise<boolean> {
  const db = getDbPool();
  await initVocabularyTable();

  const res = await db.query('DELETE FROM vocabulary_files WHERE id = $1 RETURNING id;', [fileId]);
  // Also clean up any unlinked orphan records if any
  await db.query('DELETE FROM vocabulary WHERE file_id = $1;', [fileId]);
  return (res.rowCount || 0) > 0;
}

/**
 * Completely wipes and truncates all vocabulary tables in Neon DB (frees 100% storage).
 */
export async function deleteAllVocabularyData(): Promise<void> {
  const db = getDbPool();
  await initVocabularyTable();
  await db.query('TRUNCATE TABLE vocabulary, vocabulary_files RESTART IDENTITY CASCADE;');
}
