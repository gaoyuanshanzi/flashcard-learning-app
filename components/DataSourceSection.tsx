'use client';

import React, { useRef, useState } from 'react';
import {
  Upload,
  Download,
  Database,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  Save,
  Check,
  Globe,
  Settings2,
} from 'lucide-react';
import { WordItem, SAMPLE_WORDS } from '@/lib/sample-data';
import { parseCSVToWords, exportWordsToCSV, downloadCSVFile } from '@/lib/word-utils';

interface DataSourceSectionProps {
  dataSource: 'local' | 'neon';
  setDataSource: (source: 'local' | 'neon') => void;
  allWords: WordItem[];
  setAllWords: (words: WordItem[]) => void;
  onShowToast: (type: 'info' | 'success' | 'warning' | 'error', text: string) => void;
  onDataLoaded: () => void;
}

export type CsvEncodingOption = 'auto' | 'utf-8' | 'shift-jis' | 'euc-jp' | 'euc-kr' | 'utf-16le';

export const DataSourceSection: React.FC<DataSourceSectionProps> = ({
  dataSource,
  setDataSource,
  allWords,
  setAllWords,
  onShowToast,
  onDataLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [selectedEncoding, setSelectedEncoding] = useState<CsvEncodingOption>('auto');

  // Enhanced decode function supporting auto-detection & manual override
  const decodeBufferWithEncoding = (
    buffer: ArrayBuffer,
    preferred: CsvEncodingOption
  ): { text: string; encoding: string } => {
    // If user explicitly picked an encoding other than auto:
    if (preferred !== 'auto') {
      try {
        const decoder = new TextDecoder(preferred, { fatal: false });
        return { text: decoder.decode(buffer), encoding: preferred };
      } catch (err: any) {
        console.warn(`Decoding with ${preferred} failed:`, err);
      }
    }

    // Auto-detect mode: Check BOM first
    const uint8 = new Uint8Array(buffer);
    if (uint8.length >= 3 && uint8[0] === 0xef && uint8[1] === 0xbb && uint8[2] === 0xbf) {
      return { text: new TextDecoder('utf-8').decode(buffer), encoding: 'utf-8 (BOM)' };
    }
    if (uint8.length >= 2 && uint8[0] === 0xff && uint8[1] === 0xfe) {
      return { text: new TextDecoder('utf-16le').decode(buffer), encoding: 'utf-16le (BOM)' };
    }

    // Try encodings in order: UTF-8 strict -> Shift-JIS -> EUC-KR -> EUC-JP -> UTF-16LE
    const candidateEncodings = ['utf-8', 'shift-jis', 'euc-kr', 'euc-jp', 'utf-16le'];

    for (const enc of candidateEncodings) {
      try {
        const decoder = new TextDecoder(enc, { fatal: true });
        const decoded = decoder.decode(buffer);

        // Check if output contains replacement characters or suspicious unreadable sequences
        if (!decoded.includes('\uFFFD')) {
          // If Japanese characters are present (Hiragana, Katakana, Kanji), Shift-JIS or UTF-8 is confirmed
          return { text: decoded, encoding: enc };
        }
      } catch {
        // Continue to next candidate
      }
    }

    // If none passed strict check without replacement characters, try Shift-JIS non-fatal first (common for Japanese CSV)
    try {
      const sjisDecoded = new TextDecoder('shift-jis', { fatal: false }).decode(buffer);
      // If it contains Japanese characters without excessive replacement chars
      const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(sjisDecoded);
      if (hasJapanese) {
        return { text: sjisDecoded, encoding: 'shift-jis' };
      }
    } catch {
      // ignore
    }

    // Final fallback
    return {
      text: new TextDecoder('utf-8', { fatal: false }).decode(buffer),
      encoding: 'utf-8 (기본)',
    };
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      onShowToast('warning', 'CSV(.csv) 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const buffer = event.target?.result as ArrayBuffer;
      const { text, encoding } = decodeBufferWithEncoding(buffer, selectedEncoding);
      const { words, error } = parseCSVToWords(text);

      if (error) {
        onShowToast('error', error);
        return;
      }

      setAllWords(words);
      onShowToast(
        'success',
        `CSV 파일에서 ${words.length.toLocaleString()}개의 단어를 불러왔습니다. (인코딩: ${encoding.toUpperCase()})`
      );
      onDataLoaded();
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Load 50 sample words
  const handleLoadSample = () => {
    setAllWords(SAMPLE_WORDS);
    onShowToast('success', `샘플 단어장(${SAMPLE_WORDS.length}개 단어)이 로드되었습니다.`);
    onDataLoaded();
  };

  // Fetch words from Neon DB
  const handleFetchFromNeon = async () => {
    setLoadingDb(true);
    try {
      const res = await fetch('/api/words', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'DB 데이터 조회 실패');
      }

      if (!data.data || data.data.length === 0) {
        onShowToast(
          'info',
          'Neon DB에 저장된 단어가 없습니다. [샘플 단어 로드] 또는 [CSV 업로드] 후 DB에 저장해 보세요.'
        );
        return;
      }

      const words: WordItem[] = data.data.map((item: any) => ({
        id: item.id,
        foreign_word: item.foreign_word,
        korean_meaning: item.korean_meaning,
        notes: item.notes,
      }));

      // Check if the loaded DB data contains broken characters from a previous corrupted sync
      const hasBrokenChars = words.some(
        w => w.foreign_word.includes('\uFFFD') || w.korean_meaning.includes('\uFFFD')
      );

      setAllWords(words);
      if (hasBrokenChars) {
        onShowToast(
          'warning',
          'DB에 이전에 깨진 상태로 저장된 단어가 있습니다. 올바른 CSV 파일을 업로드한 후 [Neon DB로 새로 저장/동기화]를 눌러 덮어써 주세요!'
        );
      } else {
        onShowToast(
          'success',
          `Neon DB에서 ${words.length.toLocaleString()}개의 단어를 성공적으로 불러왔습니다.`
        );
      }
      onDataLoaded();
    } catch (err: any) {
      onShowToast('error', `Neon DB 연동 오류: ${err.message}`);
    } finally {
      setLoadingDb(false);
    }
  };

  // Sync / Save current words to Neon DB
  const handleSaveToNeon = async (mode: 'replace' | 'append' = 'replace') => {
    if (allWords.length === 0) {
      onShowToast('warning', 'DB에 저장할 단어 데이터가 없습니다.');
      return;
    }

    setSavingDb(true);
    try {
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: allWords,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'DB 저장 실패');
      }

      onShowToast(
        'success',
        `현재 ${data.inserted.toLocaleString()}개 단어가 Neon DB에 성공적으로 덮어쓰기 저장되었습니다.`
      );
    } catch (err: any) {
      onShowToast('error', `Neon DB 저장 오류: ${err.message}`);
    } finally {
      setSavingDb(false);
    }
  };

  // Export current words to CSV
  const handleExportCSV = () => {
    if (allWords.length === 0) {
      onShowToast('warning', '내보낼 단어 데이터가 없습니다.');
      return;
    }
    const csv = exportWordsToCSV(allWords);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSVFile(csv, `vocabulary_export_${dateStr}.csv`);
    onShowToast('success', 'CSV 파일 다운로드가 완료되었습니다.');
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
      {/* Top Toggle & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
            Data Source
          </span>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            데이터 소스 선택
          </h2>
        </div>

        {/* Source Toggle Pills */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setDataSource('local')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              dataSource === 'local'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            로컬 컴퓨터 (CSV)
          </button>
          <button
            onClick={() => setDataSource('neon')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              dataSource === 'neon'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Neon DB
          </button>
        </div>
      </div>

      {/* CSV Encoding Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>CSV 인코딩 설정:</span>
        </div>

        <div className="flex items-center gap-1">
          {[
            { key: 'auto', label: '⚡ 자동 감지' },
            { key: 'shift-jis', label: '🇯🇵 Shift-JIS (일본어)' },
            { key: 'utf-8', label: '🌐 UTF-8' },
            { key: 'euc-kr', label: '🇰🇷 EUC-KR (한국어)' },
            { key: 'euc-jp', label: 'EUC-JP' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setSelectedEncoding(item.key as CsvEncodingOption)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                selectedEncoding === item.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons for Current Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Load Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.txt"
            className="hidden"
          />

          {dataSource === 'local' ? (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow active:scale-98"
              >
                <Upload className="w-4 h-4" />
                CSV 파일 업로드
              </button>

              <button
                onClick={handleLoadSample}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
                title="50개의 테스트용 영어 단어장 즉시 로드"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                샘플 단어 로드 (50개)
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFetchFromNeon}
                disabled={loadingDb}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingDb ? 'animate-spin' : ''}`} />
                {loadingDb ? 'DB 조회 중...' : 'Neon DB에서 불러오기'}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
                title="로컬 일본어/다국어 CSV를 업로드한 후 Neon DB에 새로 동기화"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                CSV 파일 불러오기
              </button>
            </>
          )}
        </div>

        {/* Right Side: Export / Save Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {allWords.length > 0 && (
            <>
              <button
                onClick={() => handleSaveToNeon('replace')}
                disabled={savingDb}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                title="현재 로드된 단어 목록을 Neon PostgreSQL DB에 일괄 덮어쓰기 저장"
              >
                <Save className="w-3.5 h-3.5" />
                {savingDb ? 'DB 저장 중...' : 'Neon DB로 새로 저장/동기화'}
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                CSV 다운로드
              </button>
            </>
          )}

          {/* Connected Total Words Count Badge */}
          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              총 <strong className="text-slate-900 font-bold">{allWords.length.toLocaleString()}</strong>개
              단어 연결됨
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
