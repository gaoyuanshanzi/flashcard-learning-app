'use client';

import React, { useEffect, useState } from 'react';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCw,
  Eye,
  VolumeX,
} from 'lucide-react';
import { WordItem } from '@/lib/sample-data';
import { StudyMode } from './SetSelector';

interface FlashcardProps {
  currentWord: WordItem;
  currentIndex: number;
  totalInRound: number;
  failCount: number;
  passCount: number;
  studyMode: StudyMode;
  isRevealed: boolean;
  status: 'pending' | 'passed' | 'failed';
  onPass: () => void;
  onFail: () => void;
  onNext: () => void;
  onPrev: () => void;
  onManualFlip?: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  currentWord,
  currentIndex,
  totalInRound,
  failCount,
  passCount,
  studyMode,
  isRevealed,
  status,
  onPass,
  onFail,
  onNext,
  onPrev,
  onManualFlip,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Web Speech API TTS for word pronunciation (Auto detect Japanese / Korean / English)
  const handlePlayTTS = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const textToSpeak = studyMode === 'foreignFirst' ? currentWord.foreign_word : currentWord.korean_meaning;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Detect language: Japanese (Hiragana, Katakana, Kanji), Korean (Hangul), or English
    const isJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(textToSpeak);
    const isKorean = /[\uac00-\ud7af]/.test(textToSpeak);

    if (isJapanese) {
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85;
    } else if (isKorean) {
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
    } else {
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
    }

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  // Keyboard shortcut listener (1: Pass, 2: Fail, Space/Enter/ArrowRight: Next, ArrowLeft: Prev)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        onPass();
      } else if (e.key === '2') {
        e.preventDefault();
        onFail();
      } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onPrev();
      } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (isRevealed) {
          onNext();
        } else {
          if (onManualFlip) onManualFlip();
          else onPass();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, onPass, onFail, onNext, onPrev, onManualFlip]);

  const progressPercent = Math.round(((currentIndex + 1) / totalInRound) * 100);

  // Front vs Back content based on studyMode
  const frontTitle =
    studyMode === 'foreignFirst' ? currentWord.foreign_word : currentWord.korean_meaning;
  const backMain =
    studyMode === 'foreignFirst' ? currentWord.korean_meaning : currentWord.foreign_word;
  const notes = currentWord.notes;

  return (
    <div className="space-y-4">
      {/* Top Status & Progress Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-mono">
              현재 단어 {currentIndex + 1} / {totalInRound}개
            </span>
            <span className="text-slate-400">|</span>
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Fail된 단어: <strong>{failCount}개</strong>
            </span>
            <span className="flex items-center gap-1 text-emerald-600 hidden sm:flex">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Pass: <strong>{passCount}개</strong>
            </span>
          </div>

          <div className="text-slate-500 font-mono">{progressPercent}% 완료</div>
        </div>

        {/* Progress Line */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Flashcard Component */}
      <div
        onClick={() => {
          if (!isRevealed && onManualFlip) onManualFlip();
        }}
        className={`relative min-h-[300px] sm:min-h-[340px] bg-white rounded-3xl border-2 transition-all duration-200 p-8 sm:p-12 flex flex-col justify-between items-center text-center shadow-card hover:shadow-float cursor-pointer ${
          isRevealed
            ? status === 'passed'
              ? 'border-emerald-400 bg-emerald-50/10'
              : status === 'failed'
              ? 'border-rose-400 bg-rose-50/10'
              : 'border-blue-400 bg-blue-50/10'
            : 'border-slate-200 hover:border-blue-300'
        }`}
      >
        {/* Card Header Tags */}
        <div className="w-full flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-slate-100 rounded-lg text-slate-600">
            {studyMode === 'foreignFirst' ? '🌐 외국어 단어' : '🇰🇷 한국어 뜻'}
          </span>

          <div className="flex items-center gap-2">
            {/* Status Pill if revealed */}
            {isRevealed && (
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 animate-pop-in ${
                  status === 'passed'
                    ? 'bg-emerald-100 text-emerald-700'
                    : status === 'failed'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {status === 'passed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                {status === 'passed' ? 'PASS' : status === 'failed' ? 'FAIL' : '정답 확인'}
              </span>
            )}

            {/* TTS Button */}
            <button
              onClick={handlePlayTTS}
              className={`p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors ${
                isPlayingAudio ? 'text-blue-600 bg-blue-50 animate-pulse' : ''
              }`}
              title="발음 듣기 (Web Speech TTS)"
              aria-label="발음 재생"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center: Front Prompt */}
        <div className="my-6 space-y-3">
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {frontTitle}
          </h3>

          {!isRevealed && (
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              단어를 보고 뜻을 떠올린 후 하단의 Pass / Fail 버튼을 누르세요.
            </p>
          )}
        </div>

        {/* Answer Revealed Section */}
        {isRevealed ? (
          <div className="w-full pt-6 border-t border-slate-100 animate-fade-in space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {studyMode === 'foreignFirst' ? '정답 뜻 / 번역' : '정답 외국어 단어'}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-700">{backMain}</div>

            {notes && (
              <div className="inline-block mt-2 px-4 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium">
                {notes}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-300">카드를 클릭하거나 버튼을 눌러 정답 확인</div>
        )}
      </div>

      {/* Bottom Action Button Controls: Previous, Pass, Fail, Next */}
      <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
        {/* Previous Button (2 cols on sm) */}
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className={`sm:col-span-3 flex items-center justify-center gap-1.5 py-4 px-4 rounded-2xl font-bold text-sm transition-all border shadow-xs ${
            currentIndex === 0
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900 active:scale-98'
          }`}
          title="이전 단어로 이동 (← 방향키 / P)"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Prev (이전)</span>
          <kbd className="hidden lg:inline text-[11px] font-mono opacity-50 ml-1 px-1.5 py-0.5 bg-black/5 rounded">
            ←
          </kbd>
        </button>

        {/* Pass Button (3 cols on sm) */}
        <button
          onClick={onPass}
          className={`sm:col-span-3 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-bold text-base transition-all shadow-sm active:scale-98 ${
            isRevealed && status === 'passed'
              ? 'bg-emerald-600 text-white ring-4 ring-emerald-200'
              : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-300'
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Pass</span>
          <kbd className="hidden md:inline text-xs font-mono opacity-60 ml-1 px-1.5 py-0.5 bg-black/10 rounded">
            1
          </kbd>
        </button>

        {/* Fail Button (3 cols on sm) */}
        <button
          onClick={onFail}
          className={`sm:col-span-3 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-bold text-base transition-all shadow-sm active:scale-98 ${
            isRevealed && status === 'failed'
              ? 'bg-rose-600 text-white ring-4 ring-rose-200'
              : 'bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-300'
          }`}
        >
          <XCircle className="w-5 h-5" />
          <span>Fail</span>
          <kbd className="hidden md:inline text-xs font-mono opacity-60 ml-1 px-1.5 py-0.5 bg-black/10 rounded">
            2
          </kbd>
        </button>

        {/* Next Button (3 cols on sm) */}
        <button
          onClick={onNext}
          className="col-span-2 sm:col-span-3 flex items-center justify-center gap-1.5 py-4 px-4 rounded-2xl font-bold text-base bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-98"
        >
          <span>Next (다음)</span>
          <ArrowRight className="w-4 h-4" />
          <kbd className="hidden lg:inline text-xs font-mono opacity-60 ml-1 px-1.5 py-0.5 bg-white/20 rounded">
            Space
          </kbd>
        </button>
      </div>
    </div>
  );
};
