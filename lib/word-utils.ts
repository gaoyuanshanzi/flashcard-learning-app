import Papa from 'papaparse';
import { WordItem } from './sample-data';

export interface SetSliceResult {
  success: boolean;
  words: WordItem[];
  message?: string;
  isPartialLastSet?: boolean;
  startIndex?: number;
  endIndex?: number;
  requestedN?: number;
  requestedM?: number;
}

/**
 * Validates and slices words based on "N-M" string.
 * N: Words per set (10 ~ 50)
 * M: Set number (>= 1)
 */
export function sliceWordSet(input: string, allWords: WordItem[]): SetSliceResult {
  const trimmed = input.trim();

  // 1. Data load check
  if (!allWords || allWords.length === 0) {
    return {
      success: false,
      words: [],
      message: '먼저 CSV 파일을 업로드하거나 DB 데이터를 불러와 주세요.',
    };
  }

  // 2. Format validation: N-M (numeric-numeric)
  const regex = /^(\d+)-(\d+)$/;
  const match = trimmed.match(regex);
  if (!match) {
    return {
      success: false,
      words: [],
      message: '올바른 형식(예: 10-1, 50-3)으로 입력해 주세요.',
    };
  }

  const N = parseInt(match[1], 10);
  const M = parseInt(match[2], 10);

  // 3. N bounds check (10 <= N <= 50)
  if (N < 10 || N > 50) {
    return {
      success: false,
      words: [],
      message: '세트당 단어 수는 10개에서 50개 사이여야 합니다.',
    };
  }

  // M must be at least 1
  if (M < 1) {
    return {
      success: false,
      words: [],
      message: '세트 번호는 1 이상이어야 합니다.',
    };
  }

  const totalWords = allWords.length;
  const startIndex1Based = (M - 1) * N + 1;
  const rawEndIndex1Based = M * N;

  // 4. Exceed total words check
  if (startIndex1Based > totalWords) {
    const maxSets = Math.ceil(totalWords / N);
    return {
      success: false,
      words: [],
      message: `입력한 세트 번호가 전체 단어 수를 초과했습니다. (총 단어 수: ${totalWords.toLocaleString()}개, 가능 최대 세트: ${maxSets}개)`,
    };
  }

  // 5. Slice calculation (0-based)
  const start0 = startIndex1Based - 1;
  const end0 = Math.min(rawEndIndex1Based, totalWords);
  const sliced = allWords.slice(start0, end0);

  const isPartialLastSet = rawEndIndex1Based > totalWords;
  let message: string | undefined;

  if (isPartialLastSet) {
    message = `마지막 세트입니다. 남은 ${sliced.length}개 단어를 불러옵니다. (${startIndex1Based}번 ~ ${totalWords}번)`;
  } else {
    message = `${M}번째 세트 (${startIndex1Based}번 ~ ${end0}번, 총 ${sliced.length}개)를 성공적으로 불러왔습니다.`;
  }

  return {
    success: true,
    words: sliced,
    message,
    isPartialLastSet,
    startIndex: startIndex1Based,
    endIndex: end0,
    requestedN: N,
    requestedM: M,
  };
}

/**
 * Parses raw CSV string to WordItem array.
 * Handles both header and headerless CSVs, plus various encodings/separators.
 */
export function parseCSVToWords(csvText: string): { words: WordItem[]; error?: string } {
  try {
    // Strip BOM and clean whitespace
    const cleanText = csvText.replace(/^\uFEFF/, '').trim();
    const result = Papa.parse<string[]>(cleanText, {
      skipEmptyLines: 'greedy',
    });

    if (result.errors && result.errors.length > 0 && result.data.length === 0) {
      return { words: [], error: `CSV 파싱 오류: ${result.errors[0].message}` };
    }

    const rows = result.data;
    if (!rows || rows.length === 0) {
      return { words: [], error: 'CSV 파일에 유효한 데이터가 없습니다.' };
    }

    // The 1st row is always the header row per specification. Skip row index 0.
    const startIndex = rows.length > 1 ? 1 : 0;

    const words: WordItem[] = [];
    const headerWords = new Set([
      'foreign', 'word', '단어', '외국어', '일본어', '영어', 'japanese', 'english',
      'korean', 'meaning', '뜻', '의미', '번역', 'notes', '설명', '발음', '품사', '예문',
      '日本語', '単語', '漢字', 'かな', '読み', '意味', '訳', '韓国語', 'no', 'num', '번호', 'id',
      'vocabulary', 'term', 'definition', 'translation'
    ]);

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const foreign = (row[0] || '').trim();
      const korean = (row[1] || '').trim();
      const notes = (row[2] || '').trim();

      // Check if this row is an accidental header row
      const isHeaderRow =
        headerWords.has(foreign.toLowerCase()) &&
        (headerWords.has(korean.toLowerCase()) || !korean);

      if (isHeaderRow) continue;

      // Only add if at least foreign word or korean meaning exists
      if (foreign || korean) {
        words.push({
          foreign_word: foreign,
          korean_meaning: korean,
          notes: notes || undefined,
        });
      }
    }

    if (words.length === 0) {
      return { words: [], error: '단어 데이터가 비어 있거나 올바르지 않은 형식입니다.' };
    }

    return { words };
  } catch (err: any) {
    return { words: [], error: err.message || 'CSV 파싱 중 알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * Exports words array to a downloadable CSV string with BOM for Excel Korean support.
 */
export function exportWordsToCSV(words: WordItem[]): string {
  const data = words.map(w => ({
    Foreign: w.foreign_word,
    Korean: w.korean_meaning,
    Notes: w.notes || '',
  }));

  const csv = Papa.unparse(data, {
    header: true,
  });

  // UTF-8 BOM prefix
  return '\uFEFF' + csv;
}

/**
 * Triggers a browser file download of CSV content.
 */
export function downloadCSVFile(csvContent: string, filename = 'flashcards.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
