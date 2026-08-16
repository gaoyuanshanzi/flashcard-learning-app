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

  // Detect the best encoding for a buffer by trying UTF-8, Shift-JIS, EUC-JP in order.
  const decodeWithBestEncoding = (buffer: ArrayBuffer): { text: string; encoding: string } => {
    const encodings = ['utf-8', 'shift-jis', 'euc-jp'];

    for (const enc of encodings) {
      try {
        const decoder = new TextDecoder(enc, { fatal: true });
        const text = decoder.decode(buffer);
        // If UTF-8 decoded without errors, check for common garble indicator (replacement char)
        if (!text.includes('\uFFFD')) {
          return { text, encoding: enc };
        }
      } catch {
        // Decoding failed for this encoding; try next
      }
    }

    // Fallback: decode with utf-8 non-fatal (best effort)
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    return { text, encoding: 'utf-8 (fallback)' };
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      onShowToast('warning', 'CSV(.csv) 확장자의 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const buffer = event.target?.result as ArrayBuffer;
      const { text, encoding } = decodeWithBestEncoding(buffer);
      const { words, error } = parseCSVToWords(text);
      if (error) {
        onShowToast('error', error);
        return;
      }
      setAllWords(words);
      onShowToast(
        'success',
        `CSV 파일에서 ${words.length.toLocaleString()}개의 단어를 성공적으로 불러왔습니다. (인코딩: ${encoding})`
      );
      onDataLoaded();
    };
    reader.readAsArrayBuffer(file);

    // Reset file input so same file can be reselected if needed
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

      setAllWords(words);
      onShowToast(
        'success',
        `Neon DB에서 ${words.length.toLocaleString()}개의 단어를 성공적으로 불러왔습니다.`
      );
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
        `현재 ${data.inserted.toLocaleString()}개 단어가 Neon DB에 성공적으로 동기화되었습니다.`
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

      {/* Action Buttons for Current Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Load Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
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
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                CSV 불러온 후 DB 동기화
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
                title="현재 로드된 단어 목록을 Neon PostgreSQL DB에 일괄 저장"
              >
                <Save className="w-3.5 h-3.5" />
                {savingDb ? 'DB 저장 중...' : 'Neon DB로 동기화/저장'}
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
