'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  Layers,
} from 'lucide-react';
import { WordItem } from '@/lib/sample-data';
import { RoundType } from './SetSelector';

interface RoundSummaryProps {
  currentRound: RoundType;
  totalWords: number;
  passWords: WordItem[];
  failWords: WordItem[];
  onStartNextRound: () => void;
  onRestartFirstRound: () => void;
}

export const RoundSummary: React.FC<RoundSummaryProps> = ({
  currentRound,
  totalWords,
  passWords,
  failWords,
  onStartNextRound,
  onRestartFirstRound,
}) => {
  const isPerfect = failWords.length === 0;
  const passRate = totalWords > 0 ? Math.round((passWords.length / totalWords) * 100) : 0;

  useEffect(() => {
    if (isPerfect || currentRound === 3) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // silent fail if confetti not supported
      }
    }
  }, [isPerfect, currentRound]);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-card space-y-6 animate-pop-in">
      {/* Title & Icon Header */}
      <div className="text-center space-y-3">
        <div
          className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg ${
            isPerfect
              ? 'bg-emerald-500 text-white shadow-emerald-500/30'
              : 'bg-blue-600 text-white shadow-blue-500/30'
          }`}
        >
          {isPerfect ? <Trophy className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
        </div>

        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {currentRound}st Round 학습 완료!
        </h3>

        <p className="text-sm text-slate-600">
          {isPerfect
            ? '축하합니다! 모든 단어를 완벽하게 통과하셨습니다! 🎉'
            : currentRound === 3
            ? '3단계 최종 라운드까지 모두 마쳤습니다. 수고하셨습니다! 👍'
            : `총 ${totalWords}개 단어 중 ${passWords.length}개 통과, ${failWords.length}개 오답이 발생했습니다.`}
        </p>
      </div>

      {/* Score Grid */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase">정답률</div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">
            {passRate}%
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold text-emerald-600 uppercase flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pass
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
            {passWords.length}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold text-rose-600 uppercase flex items-center justify-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            Fail
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
            {failWords.length}
          </div>
        </div>
      </div>

      {/* Failed Words List Review if any */}
      {failWords.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              오답 단어 복습 목록 ({failWords.length}개)
            </h4>
            <span className="text-[11px] text-slate-400">
              {currentRound < 3 ? '다음 라운드에서 집중 재학습됩니다' : '최종 미암기 단어'}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
            {failWords.map((word, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{word.foreign_word}</span>
                </div>
                <div className="text-right text-slate-600 font-medium">{word.korean_meaning}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        {/* Next Round CTA if applicable */}
        {!isPerfect && currentRound < 3 && (
          <button
            onClick={onStartNextRound}
            className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-98"
          >
            <span>
              {currentRound === 1
                ? `2nd Round 시작 (오답 ${failWords.length}개 재학습)`
                : `3rd Round 시작 (최종 오답 ${failWords.length}개)`}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {/* Restart 1st Round */}
        <button
          onClick={onRestartFirstRound}
          className={`w-full ${
            isPerfect || currentRound === 3 ? 'sm:flex-1' : 'sm:w-auto'
          } py-4 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-all flex items-center justify-center gap-2`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>1st Round로 다시 시작</span>
        </button>
      </div>
    </div>
  );
};
