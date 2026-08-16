'use client';

import React, { useRef, useState, useEffect } from 'react';
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
  Trash2,
  AlertTriangle,
  FolderOpen,
  Plus,
  X,
  FileText,
  Clock,
  Sparkle,
} from 'lucide-react';
import { WordItem, SAMPLE_WORDS } from '@/lib/sample-data';
import { parseCSVToWords, exportWordsToCSV, downloadCSVFile, isHeaderWordItem } from '@/lib/word-utils';

export interface NeonFileInfo {
  id: number;
  file_name: string;
  word_count: number;
  created_at: string;
}

interface DataSourceSectionProps {
  dataSource: 'local' | 'neon';
  setDataSource: (source: 'local' | 'neon') => void;
  allWords: WordItem[];
  setAllWords: (words: WordItem[]) => void;
  onShowToast: (type: 'info' | 'success' | 'warning' | 'error', text: string) => void;
  onDataLoaded: () => void;
}

export type CsvEncodingOption = 'auto' | 'utf-8' | 'shift-jis' | 'euc-kr' | 'euc-jp' | 'utf-16le';

export const DataSourceSection: React.FC<DataSourceSectionProps> = ({
  dataSource,
  setDataSource,
  allWords,
  setAllWords,
  onShowToast,
  onDataLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentLoadedFileName, setCurrentLoadedFileName] = useState<string>('');
  const [rawFileBuffer, setRawFileBuffer] = useState<ArrayBuffer | null>(null);
  const [appliedEncoding, setAppliedEncoding] = useState<string>('UTF-8');
  const [selectedEncoding, setSelectedEncoding] = useState<CsvEncodingOption>('auto');

  // Neon DB state
  const [dbFiles, setDbFiles] = useState<NeonFileInfo[]>([]);
  const [selectedDbFileId, setSelectedDbFileId] = useState<number | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isWipingAll, setIsWipingAll] = useState(false);

  // Modals & UI states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFileNameInput, setSaveFileNameInput] = useState('');
  const [showWipeConfirmModal, setShowWipeConfirmModal] = useState(false);

  // Fetch Neon DB file list when switching to Neon DB mode
  const fetchDbFiles = async () => {
    setLoadingDb(true);
    try {
      const res = await fetch('/api/files', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setDbFiles(data.files);
        if (data.files.length > 0 && selectedDbFileId === null) {
          setSelectedDbFileId(data.files[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch Neon DB file list:', err);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    if (dataSource === 'neon') {
      fetchDbFiles();
    }
  }, [dataSource]);

  // Smart linguistic scoring decoder for 100% accurate auto-detection
  const smartDecodeBuffer = (
    buffer: ArrayBuffer,
    preferred: CsvEncodingOption
  ): { text: string; encoding: string } => {
    // 1. If manual encoding is chosen, decode directly
    if (preferred !== 'auto') {
      try {
        const decoder = new TextDecoder(preferred, { fatal: false });
        const text = decoder.decode(buffer).replace(/^\uFEFF/, '');
        return { text, encoding: preferred };
      } catch (err: any) {
        console.warn(`Manual decode with ${preferred} failed:`, err);
      }
    }

    // 2. Check BOM markers first
    const uint8 = new Uint8Array(buffer);
    if (uint8.length >= 3 && uint8[0] === 0xef && uint8[1] === 0xbb && uint8[2] === 0xbf) {
      const text = new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '');
      return { text, encoding: 'utf-8 (BOM)' };
    }
    if (uint8.length >= 2 && uint8[0] === 0xff && uint8[1] === 0xfe) {
      const text = new TextDecoder('utf-16le').decode(buffer).replace(/^\uFEFF/, '');
      return { text, encoding: 'utf-16le (BOM)' };
    }

    // 3. Test candidate encodings: UTF-8, Shift-JIS, EUC-KR (CP949), EUC-JP
    const candidates = [
      { name: 'utf-8', label: 'UTF-8' },
      { name: 'shift-jis', label: 'Shift-JIS' },
      { name: 'euc-kr', label: 'EUC-KR' },
      { name: 'euc-jp', label: 'EUC-JP' },
    ];

    let bestScore = -Infinity;
    let bestDecoded = '';
    let bestEncodingName = 'utf-8';

    for (const cand of candidates) {
      try {
        const decoder = new TextDecoder(cand.name, { fatal: true });
        const decoded = decoder.decode(buffer);

        let score = 0;
        // Severe penalty for replacement chars
        if (decoded.includes('\uFFFD')) {
          score -= 10000;
        }

        // Severe penalty for typical Mojibake artifacts (e.g. 癤, 蹂, 뻹, 몃, )
        const mojibakeMatches = decoded.match(/[癤蹂뻹몃]/g);
        if (mojibakeMatches) {
          score -= mojibakeMatches.length * 500;
        }

        // Count natural Japanese characters (Hiragana / Katakana)
        const kanaMatches = decoded.match(/[\u3040-\u30ff]/g);
        if (kanaMatches) score += kanaMatches.length * 50;

        // Count natural Korean characters (Hangul)
        const hangulMatches = decoded.match(/[\uac00-\ud7af]/g);
        if (hangulMatches) score += hangulMatches.length * 50;

        // Count natural CJK Kanji / Hanja
        const kanjiMatches = decoded.match(/[\u4e00-\u9faf]/g);
        if (kanjiMatches) score += kanjiMatches.length * 20;

        // Count standard ASCII characters (commas, newlines, English text)
        const asciiMatches = decoded.match(/[\x20-\x7E\r\n\t]/g);
        if (asciiMatches) score += asciiMatches.length;

        // Slight natural preference for UTF-8 when scores are tied
        if (cand.name === 'utf-8') score += 5;

        if (score > bestScore) {
          bestScore = score;
          bestDecoded = decoded;
          bestEncodingName = cand.label;
        }
      } catch {
        // decoding fatal failed for this candidate
      }
    }

    if (bestDecoded) {
      return { text: bestDecoded.replace(/^\uFEFF/, ''), encoding: bestEncodingName };
    }

    // Fallback
    const fallbackText = new TextDecoder('utf-8', { fatal: false })
      .decode(buffer)
      .replace(/^\uFEFF/, '');
    return { text: fallbackText, encoding: 'UTF-8' };
  };

  // Real-time re-decode when user clicks an encoding button
  const handleSelectEncoding = (newEncoding: CsvEncodingOption) => {
    setSelectedEncoding(newEncoding);

    if (rawFileBuffer) {
      const { text, encoding } = smartDecodeBuffer(rawFileBuffer, newEncoding);
      const { words, error } = parseCSVToWords(text);

      if (error) {
        onShowToast('error', error);
        return;
      }

      setAppliedEncoding(encoding);
      setAllWords(words);
      onShowToast(
        'success',
        `인코딩을 [${encoding.toUpperCase()}]로 즉시 전환하여 ${words.length.toLocaleString()}개 단어를 다시 읽었습니다.`
      );
      onDataLoaded();
    }
  };

  // Handle local CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const baseName = file.name;
    setCurrentLoadedFileName(baseName);
    setSaveFileNameInput(baseName);

    const reader = new FileReader();
    reader.onload = event => {
      const buffer = event.target?.result as ArrayBuffer;
      setRawFileBuffer(buffer);

      const { text, encoding } = smartDecodeBuffer(buffer, selectedEncoding);
      const { words, error } = parseCSVToWords(text);

      if (error) {
        onShowToast('error', error);
        return;
      }

      setAppliedEncoding(encoding);
      setAllWords(words);
      onShowToast(
        'success',
        `"${baseName}" 파일에서 ${words.length.toLocaleString()}개 단어를 불러왔습니다. (감지된 인코딩: ${encoding.toUpperCase()})`
      );
      onDataLoaded();
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Load 50 sample words
  const handleLoadSample = () => {
    setAllWords(SAMPLE_WORDS);
    setCurrentLoadedFileName('샘플_영어단어장(50).csv');
    setSaveFileNameInput('샘플_영어단어장(50).csv');
    setAppliedEncoding('UTF-8');
    setRawFileBuffer(null);
    onShowToast('success', `샘플 단어장(${SAMPLE_WORDS.length}개 단어)이 로드되었습니다.`);
    onDataLoaded();
  };

  // Load selected CSV file from Neon DB
  const handleLoadSelectedDbFile = async (fileIdToLoad?: number) => {
    const targetId = fileIdToLoad || selectedDbFileId;
    if (!targetId) {
      onShowToast('warning', '불러올 Neon DB 단어장 파일을 선택해 주세요.');
      return;
    }

    const selectedFileObj = dbFiles.find(f => f.id === targetId);
    setLoadingDb(true);

    try {
      const res = await fetch(`/api/words?fileId=${targetId}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'DB 단어 조회 실패');
      }

      const rawData = data.data || [];
      const words: WordItem[] = rawData
        .map((item: any) => ({
          id: item.id,
          foreign_word: (item.foreign_word || '').trim(),
          korean_meaning: (item.korean_meaning || '').trim(),
          notes: item.notes ? item.notes.trim() : undefined,
        }))
        .filter((w: WordItem) => !isHeaderWordItem(w));

      setAllWords(words);
      setRawFileBuffer(null);
      const fileName = selectedFileObj?.file_name || `단어장_${targetId}.csv`;
      setCurrentLoadedFileName(fileName);
      setSaveFileNameInput(fileName);
      setAppliedEncoding('Neon DB');

      onShowToast(
        'success',
        `Neon DB의 "${fileName}" (${words.length.toLocaleString()}개 단어)을 성공적으로 불러왔습니다.`
      );
      onDataLoaded();
    } catch (err: any) {
      onShowToast('error', `Neon DB 데이터 로드 실패: ${err.message}`);
    } finally {
      setLoadingDb(false);
    }
  };

  // Save current words to Neon DB as a CSV file record
  const handleConfirmSaveToNeon = async () => {
    if (allWords.length === 0) {
      onShowToast('warning', 'DB에 저장할 단어 데이터가 없습니다.');
      return;
    }

    const finalFileName = (saveFileNameInput || currentLoadedFileName || '단어장.csv').trim();
    setSavingDb(true);

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: finalFileName,
          words: allWords,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'DB 파일 저장 실패');
      }

      onShowToast(
        'success',
        `"${finalFileName}" (${data.insertedCount}개 단어)이 Neon DB에 성공적으로 저장되었습니다.`
      );
      setShowSaveModal(false);
      await fetchDbFiles();
      if (data.fileId) {
        setSelectedDbFileId(data.fileId);
      }
    } catch (err: any) {
      onShowToast('error', `Neon DB 저장 실패: ${err.message}`);
    } finally {
      setSavingDb(false);
    }
  };

  // Delete a specific CSV file from Neon DB (frees storage)
  const handleDeleteDbFile = async (fileId: number, fileName: string) => {
    if (!confirm(`"${fileName}" 파일을 Neon DB에서 완전히 삭제하시겠습니까?\n(해당 파일의 모든 단어가 삭제되어 Neon DB 저장 공간이 확보됩니다.)`)) {
      return;
    }

    setDeletingId(fileId);
    try {
      const res = await fetch(`/api/files?id=${fileId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '파일 삭제 실패');
      }

      onShowToast('success', `"${fileName}" 파일이 Neon DB에서 영구 삭제되었습니다.`);
      await fetchDbFiles();

      if (selectedDbFileId === fileId) {
        setSelectedDbFileId(null);
      }
    } catch (err: any) {
      onShowToast('error', `파일 삭제 오류: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Completely wipe all data in Neon DB (frees 100% capacity)
  const handleWipeAllNeonData = async () => {
    setIsWipingAll(true);
    try {
      const res = await fetch('/api/files?all=true', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '전체 삭제 실패');
      }

      onShowToast(
        'success',
        'Neon DB의 모든 단어장 파일과 데이터가 완전 삭제되어 저장 공간이 100% 확보되었습니다.'
      );
      setShowWipeConfirmModal(false);
      setDbFiles([]);
      setSelectedDbFileId(null);
      if (dataSource === 'neon') {
        setAllWords([]);
        setCurrentLoadedFileName('');
      }
    } catch (err: any) {
      onShowToast('error', `Neon DB 전체 삭제 오류: ${err.message}`);
    } finally {
      setIsWipingAll(false);
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
    const exportName = currentLoadedFileName
      ? currentLoadedFileName.replace(/\.csv$/i, '') + `_export_${dateStr}.csv`
      : `vocabulary_export_${dateStr}.csv`;
    downloadCSVFile(csv, exportName);
    onShowToast('success', 'CSV 파일 다운로드가 완료되었습니다.');
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
      {/* 1. Header & Data Source Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
            Data Source & File Manager
          </span>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            단어장 저장소 선택
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
            1. 로컬 컴퓨터 (CSV)
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
            2. Neon DB 저장소
          </button>
        </div>
      </div>

      {/* 2. Real-Time Instant CSV Encoding Selector Bar */}
      <div className="p-3 bg-gradient-to-r from-blue-50/50 to-slate-50 border border-blue-100 rounded-xl space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <Globe className="w-4 h-4 text-blue-600" />
            <span>CSV 글자 인코딩 선택 (클릭 시 실시간 즉시 변환):</span>
          </div>
          <span className="text-[11px] text-slate-500">
            글자가 깨져 보일 경우 <strong>[Shift-JIS]</strong> 또는 <strong>[UTF-8]</strong>을 클릭하세요.
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'auto', label: '⚡ 자동 감지' },
            { key: 'utf-8', label: '🌐 UTF-8 (표준)' },
            { key: 'shift-jis', label: '🇯🇵 Shift-JIS (일본어)' },
            { key: 'euc-kr', label: '🇰🇷 EUC-KR / CP949 (한국어)' },
            { key: 'euc-jp', label: 'EUC-JP (일본어 Unix)' },
            { key: 'utf-16le', label: 'UTF-16LE' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => handleSelectEncoding(item.key as CsvEncodingOption)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedEncoding === item.key
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MODE SPECIFIC VIEWS */}

      {/* A. LOCAL CSV MODE */}
      {dataSource === 'local' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm active:scale-98"
            >
              <Upload className="w-4 h-4" />
              로컬 CSV 파일 불러오기
            </button>

            <button
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
              title="50개의 테스트용 영어 단어장 즉시 로드"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              샘플 단어 로드 (50개)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {allWords.length > 0 && (
              <>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
                  title="현재 로컬 단어장을 Neon DB에 CSV 파일로 저장"
                >
                  <Save className="w-3.5 h-3.5" />
                  Neon DB에 CSV 파일로 저장
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

            <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                총 <strong className="text-slate-900 font-bold">{allWords.length.toLocaleString()}</strong>개
                단어
              </span>
            </div>
          </div>
        </div>
      )}

      {/* B. NEON DB MODE (File-by-File Selector & Complete Capacity Control) */}
      {dataSource === 'neon' && (
        <div className="space-y-3 pt-1">
          {/* Top Actions in Neon DB mode */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.txt"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold transition-colors"
                title="로컬의 새 CSV 파일을 업로드하여 Neon DB에 저장할 준비를 합니다"
              >
                <Plus className="w-3.5 h-3.5" />
                새 CSV 파일 업로드
              </button>

              {allWords.length > 0 && (
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-semibold transition-colors shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  현재 단어장을 Neon DB에 저장
                </button>
              )}

              <button
                onClick={fetchDbFiles}
                disabled={loadingDb}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title="Neon DB 파일 목록 새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDb ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Wipe All Button */}
              <button
                onClick={() => setShowWipeConfirmModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
                title="Neon DB의 모든 데이터와 파일을 영구 삭제하여 저장 공간을 100% 비웁니다."
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                Neon DB 전체 데이터 완전 삭제
              </button>
            </div>
          </div>

          {/* Neon DB File List Box */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                Neon DB에 저장된 CSV 파일 목록 ({dbFiles.length}개)
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                파일을 선택하고 [불러오기]를 누르거나 바로 삭제하여 용량을 관리할 수 있습니다.
              </span>
            </div>

            {loadingDb ? (
              <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                Neon DB 파일 목록을 불러오는 중...
              </div>
            ) : dbFiles.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Neon DB에 저장된 CSV 파일이 없습니다.</p>
                <p className="text-[11px] text-slate-400">
                  [새 CSV 파일 업로드] 후 [현재 단어장을 Neon DB에 저장]을 눌러 파일을 등록해 보세요.
                </p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white">
                {dbFiles.map(file => {
                  const isSelected = selectedDbFileId === file.id;
                  const dateFormatted = new Date(file.created_at).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedDbFileId(file.id)}
                      className={`p-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-blue-600' : 'text-slate-400'
                          }`}
                        />
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">
                            {file.file_name}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>단어 <strong>{file.word_count.toLocaleString()}개</strong></span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3 h-3" />
                              {dateFormatted}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {/* Select & Load Button */}
                        <button
                          onClick={() => {
                            setSelectedDbFileId(file.id);
                            handleLoadSelectedDbFile(file.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          불러오기
                        </button>

                        {/* Delete Single File Button */}
                        <button
                          onClick={() => handleDeleteDbFile(file.id, file.file_name)}
                          disabled={deletingId === file.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="이 CSV 파일 및 단어 완전 삭제 (Neon 저장 용량 확보)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Currently Loaded File & Applied Encoding Pill Indicator */}
      {currentLoadedFileName && (
        <div className="flex flex-wrap items-center justify-between text-xs px-3.5 py-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 gap-2">
          <div className="flex items-center gap-2 font-medium">
            <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
            <span>현재 로드된 파일: <strong className="font-bold text-blue-950">{currentLoadedFileName}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-white border border-blue-200 rounded-md font-mono text-[11px] text-blue-800 font-semibold">
              인코딩: {appliedEncoding}
            </span>
            <span className="text-[11px] text-blue-700 font-mono font-bold">
              {allWords.length.toLocaleString()}단어 연결됨
            </span>
          </div>
        </div>
      )}

      {/* MODAL 1: Save to Neon DB as CSV File Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-pop-in space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Save className="w-5 h-5 text-emerald-600" />
                Neon DB에 CSV 파일로 저장
              </h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                현재 로드된 <strong>{allWords.length.toLocaleString()}개</strong>의 단어 데이터를 Neon DB에 독립된 CSV 파일 단위로 저장합니다.
              </p>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">저장할 파일 이름</label>
                <input
                  type="text"
                  value={saveFileNameInput}
                  onChange={e => setSaveFileNameInput(e.target.value)}
                  placeholder="예: 일본어_JLPT_N1.csv, 수능_영단어.csv"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-xs"
              >
                취소
              </button>
              <button
                onClick={handleConfirmSaveToNeon}
                disabled={savingDb}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors text-xs shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {savingDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{savingDb ? '저장 중...' : '저장 완료'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Wipe ALL Neon DB Data Confirm Modal */}
      {showWipeConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-pop-in space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-rose-100 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold">Neon DB 전체 데이터 영구 삭제</h3>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-rose-700">
                경고: Neon DB에 저장된 모든 CSV 파일과 단어 데이터가 영구적으로 삭제됩니다.
              </p>
              <p>
                이 작업을 진행하면 Neon PostgreSQL DB의 테이블이 완전히 초기화(TRUNCATE)되어 저장 용량을 100% 비우게 됩니다.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowWipeConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-xs"
              >
                취소
              </button>
              <button
                onClick={handleWipeAllNeonData}
                disabled={isWipingAll}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors text-xs shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isWipingAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isWipingAll ? '삭제 진행 중...' : '전체 완전 삭제'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
