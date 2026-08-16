'use client';

import React, { useState } from 'react';
import { Layers, ArrowRight, RotateCcw, AlertCircle, Sparkles } from 'lucide-react';
import { WordItem } from '@/lib/sample-data';
import { sliceWordSet } from '@/lib/word-utils';

export type StudyMode = 'foreignFirst' | 'koreanFirst';
export type RoundType = 1 | 2 | 3;

interface SetSelectorProps {
  allWords: WordItem[];
  currentSetWords: WordItem[];
  onSetLoaded: (words: WordItem[], setLabel: string) => void;
  studyMode: StudyMode;
  setStudyMode: (mode: StudyMode) => void;
  currentRound: RoundType;
  onSelectRound: (round: RoundType) => void;
  round1Fails: WordItem[];
  round2Fails: WordItem[];
  isRound1Completed: boolean;
  isRound2Completed: boolean;
  onShowToast: (type: 'info' | 'success' | 'warning' | 'error', text: string) => void;
  currentSetInfo: string;
}

export const SetSelector: React.FC<SetSelectorProps> = ({
  allWords,
  currentSetWords,
  onSetLoaded,
  studyMode,
  setStudyMode,
  currentRound,
  onSelectRound,
  round1Fails,
  round2Fails,
  isRound1Completed,
  isRound2Completed,
  onShowToast,
  currentSetInfo,
}) => {
  const [setInput, setSetInput] = useState('10-1');

  const handleLoadSet = (overrideInput?: string) => {
    const targetInput = overrideInput || setInput;
    const result = sliceWordSet(targetInput, allWords);

    if (!result.success) {
      onShowToast('warning', result.message || '세트 로드 실패');
      return;
    }

    const setLabel = `Set ${targetInput} (${result.startIndex}~${result.endIndex}번, ${result.words.length}개)`;
    onSetLoaded(result.words, setLabel);

    if (result.message) {
      onShowToast(result.isPartialLastSet ? 'info' : 'success', result.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
      {/* Upper Grid: Set Input Form & Study Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Set Input Box (6 cols) */}
        <div className="md:col-span-6 space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            세트 규격 및 번호 지정
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={setInput}
                onChange={e => setSetInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleLoadSet();
                }}
                placeholder="예: 10-1, 20-2, 50-3"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono pointer-events-none">
                [N-M]
              </span>
            </div>
            <button
              onClick={() => handleLoadSet()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 shrink-0"
            >
              <Layers className="w-4 h-4" />
              불러오기
            </button>
          </div>

          {/* Quick Preset Badges */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400">빠른 세트:</span>
            {['10-1', '20-1', '30-1', '50-1'].map(preset => (
              <button
                key={preset}
                onClick={() => {
                  setSetInput(preset);
                  handleLoadSet(preset);
                }}
                className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors font-mono"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Study Mode Selector (6 cols) */}
        <div className="md:col-span-6 space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            학습 모드 선택
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setStudyMode('foreignFirst')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                studyMode === 'foreignFirst'
                  ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🌐 외국어 우선</span>
              {studyMode === 'foreignFirst' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>

            <button
              onClick={() => setStudyMode('koreanFirst')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                studyMode === 'koreanFirst'
                  ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🇰🇷 한국어 우선</span>
              {studyMode === 'koreanFirst' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Round Selection Tabs */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            라운드 시스템:
          </span>

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            {/* 1st Round */}
            <button
              onClick={() => onSelectRound(1)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentRound === 1
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1st Round
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full font-mono">
                전체
              </span>
            </button>

            {/* 2nd Round */}
            <button
              onClick={() => onSelectRound(2)}
              disabled={!isRound1Completed}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentRound === 2
                  ? 'bg-white text-rose-700 shadow-sm'
                  : isRound1Completed
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 cursor-not-allowed opacity-50'
              }`}
              title={
                !isRound1Completed
                  ? '1st Round 완료 후 활성화됩니다.'
                  : `1차 오답 (${round1Fails.length}개) 재학습`
              }
            >
              2nd Round
              {isRound1Completed && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    round1Fails.length > 0
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {round1Fails.length > 0 ? `${round1Fails.length}개 오답` : 'All Pass'}
                </span>
              )}
            </button>

            {/* 3rd Round */}
            <button
              onClick={() => onSelectRound(3)}
              disabled={!isRound2Completed}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentRound === 3
                  ? 'bg-white text-rose-700 shadow-sm'
                  : isRound2Completed
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 cursor-not-allowed opacity-50'
              }`}
              title={
                !isRound2Completed
                  ? '2nd Round 완료 후 활성화됩니다.'
                  : `2차 오답 (${round2Fails.length}개) 최종 재학습`
              }
            >
              3rd Round
              {isRound2Completed && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    round2Fails.length > 0
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {round2Fails.length > 0 ? `${round2Fails.length}개 오답` : 'All Pass'}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Current Active Set Notice */}
        {currentSetInfo && (
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">{currentSetInfo}</span>
          </div>
        )}
      </div>
    </div>
  );
};
