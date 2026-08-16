'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { DataSourceSection } from '@/components/DataSourceSection';
import { SetSelector, StudyMode, RoundType } from '@/components/SetSelector';
import { Flashcard } from '@/components/Flashcard';
import { RoundSummary } from '@/components/RoundSummary';
import { Toast, ToastMessage } from '@/components/Toast';
import { WordItem, SAMPLE_WORDS } from '@/lib/sample-data';
import { sliceWordSet } from '@/lib/word-utils';
import { Layers, Sparkles, AlertCircle } from 'lucide-react';

export default function HomePage() {
  // 1. Data Source & Master Dataset
  const [dataSource, setDataSource] = useState<'local' | 'neon'>('local');
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [currentSetInfo, setCurrentSetInfo] = useState<string>('');

  // 2. Set & Round Words
  const [currentSetWords, setCurrentSetWords] = useState<WordItem[]>([]);
  const [activeRoundWords, setActiveRoundWords] = useState<WordItem[]>([]);
  const [studyMode, setStudyMode] = useState<StudyMode>('foreignFirst');

  // 3. Round Progression States
  const [currentRound, setCurrentRound] = useState<RoundType>(1);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [cardStatus, setCardStatus] = useState<'pending' | 'passed' | 'failed'>('pending');

  // Result records for each round
  const [roundPassWords, setRoundPassWords] = useState<WordItem[]>([]);
  const [roundFailWords, setRoundFailWords] = useState<WordItem[]>([]);
  const [round1Fails, setRound1Fails] = useState<WordItem[]>([]);
  const [round2Fails, setRound2Fails] = useState<WordItem[]>([]);
  const [isRound1Completed, setIsRound1Completed] = useState<boolean>(false);
  const [isRound2Completed, setIsRound2Completed] = useState<boolean>(false);
  const [isRoundFinished, setIsRoundFinished] = useState<boolean>(false);

  // 4. Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (type: 'info' | 'success' | 'warning' | 'error', text: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts(prev => [...prev, { id, type, text }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Initial load: preload sample words so user can immediately practice
  useEffect(() => {
    setAllWords(SAMPLE_WORDS);
    const initialSlice = sliceWordSet('10-1', SAMPLE_WORDS);
    if (initialSlice.success) {
      setCurrentSetWords(initialSlice.words);
      setActiveRoundWords(initialSlice.words);
      setCurrentSetInfo('Set 10-1 (1~10번, 10개)');
    }
  }, []);

  // When a new set is loaded via N-M input
  const handleSetLoaded = (words: WordItem[], label: string) => {
    setCurrentSetWords(words);
    setActiveRoundWords(words);
    setCurrentSetInfo(label);
    setCurrentRound(1);
    setCurrentIndex(0);
    setIsRevealed(false);
    setCardStatus('pending');
    setRoundPassWords([]);
    setRoundFailWords([]);
    setRound1Fails([]);
    setRound2Fails([]);
    setIsRound1Completed(false);
    setIsRound2Completed(false);
    setIsRoundFinished(false);
  };

  // Switch between 1st, 2nd, 3rd rounds
  const handleSelectRound = (round: RoundType) => {
    let targetWords: WordItem[] = [];

    if (round === 1) {
      targetWords = currentSetWords;
    } else if (round === 2) {
      if (!isRound1Completed || round1Fails.length === 0) {
        showToast('info', '2nd Round로 학습할 1차 오답 단어가 없습니다.');
        return;
      }
      targetWords = round1Fails;
    } else if (round === 3) {
      if (!isRound2Completed || round2Fails.length === 0) {
        showToast('info', '3rd Round로 학습할 2차 오답 단어가 없습니다.');
        return;
      }
      targetWords = round2Fails;
    }

    setCurrentRound(round);
    setActiveRoundWords(targetWords);
    setCurrentIndex(0);
    setIsRevealed(false);
    setCardStatus('pending');
    setRoundPassWords([]);
    setRoundFailWords([]);
    setIsRoundFinished(false);
    showToast('info', `${round}st Round 학습을 시작합니다. (${targetWords.length}개 단어)`);
  };

  // Card Pass action
  const handlePass = () => {
    if (activeRoundWords.length === 0) return;
    const currentWord = activeRoundWords[currentIndex];

    setIsRevealed(true);
    setCardStatus('passed');

    // Update pass/fail lists
    setRoundPassWords(prev => {
      if (prev.some(w => w.foreign_word === currentWord.foreign_word)) return prev;
      return [...prev, currentWord];
    });
    setRoundFailWords(prev => prev.filter(w => w.foreign_word !== currentWord.foreign_word));
  };

  // Card Fail action
  const handleFail = () => {
    if (activeRoundWords.length === 0) return;
    const currentWord = activeRoundWords[currentIndex];

    setIsRevealed(true);
    setCardStatus('failed');

    // Update pass/fail lists
    setRoundFailWords(prev => {
      if (prev.some(w => w.foreign_word === currentWord.foreign_word)) return prev;
      return [...prev, currentWord];
    });
    setRoundPassWords(prev => prev.filter(w => w.foreign_word !== currentWord.foreign_word));
  };

  // Card Next action
  const handleNext = () => {
    if (activeRoundWords.length === 0) return;

    // If answer not revealed yet, reveal it first
    if (!isRevealed) {
      handlePass();
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < activeRoundWords.length) {
      setCurrentIndex(nextIndex);
      setIsRevealed(false);
      setCardStatus('pending');
    } else {
      // Round Complete!
      const finalFails = roundFailWords;
      if (currentRound === 1) {
        setIsRound1Completed(true);
        setRound1Fails(finalFails);
      } else if (currentRound === 2) {
        setIsRound2Completed(true);
        setRound2Fails(finalFails);
      }
      setIsRoundFinished(true);
    }
  };

  const handleStartNextRound = () => {
    if (currentRound === 1 && round1Fails.length > 0) {
      handleSelectRound(2);
    } else if (currentRound === 2 && round2Fails.length > 0) {
      handleSelectRound(3);
    }
  };

  const handleRestartFirstRound = () => {
    handleSelectRound(1);
  };

  const currentWord = activeRoundWords[currentIndex];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* 1. Header */}
      <Header dataSource={dataSource} isDbConnected={true} />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* 2. Data Source Selector & Actions */}
        <DataSourceSection
          dataSource={dataSource}
          setDataSource={setDataSource}
          allWords={allWords}
          setAllWords={setAllWords}
          onShowToast={showToast}
          onDataLoaded={() => {
            // Auto slice 10-1 when new dataset loaded
            const res = sliceWordSet('10-1', allWords);
            if (res.success) {
              handleSetLoaded(res.words, `Set 10-1 (1~${res.endIndex}번, ${res.words.length}개)`);
            }
          }}
        />

        {/* 3. Set Format & Round Controller */}
        <SetSelector
          allWords={allWords}
          currentSetWords={currentSetWords}
          onSetLoaded={handleSetLoaded}
          studyMode={studyMode}
          setStudyMode={setStudyMode}
          currentRound={currentRound}
          onSelectRound={handleSelectRound}
          round1Fails={round1Fails}
          round2Fails={round2Fails}
          isRound1Completed={isRound1Completed}
          isRound2Completed={isRound2Completed}
          onShowToast={showToast}
          currentSetInfo={currentSetInfo}
        />

        {/* 4. Flashcard / Summary Area */}
        <div className="pt-2">
          {activeRoundWords.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                학습할 단어 세트가 선택되지 않았습니다
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                상단의 세트 규격(예: 10-1)을 입력하고 [불러오기] 버튼을 누르거나, CSV 파일을
                업로드해 주세요.
              </p>
            </div>
          ) : isRoundFinished ? (
            <RoundSummary
              currentRound={currentRound}
              totalWords={activeRoundWords.length}
              passWords={roundPassWords}
              failWords={roundFailWords}
              onStartNextRound={handleStartNextRound}
              onRestartFirstRound={handleRestartFirstRound}
            />
          ) : (
            currentWord && (
              <Flashcard
                currentWord={currentWord}
                currentIndex={currentIndex}
                totalInRound={activeRoundWords.length}
                failCount={roundFailWords.length}
                passCount={roundPassWords.length}
                studyMode={studyMode}
                isRevealed={isRevealed}
                status={cardStatus}
                onPass={handlePass}
                onFail={handleFail}
                onNext={handleNext}
                onManualFlip={() => setIsRevealed(true)}
              />
            )
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Flashcard Learning Web App &bull; Powered by <strong>Neon PostgreSQL</strong> & Next.js
          </div>
          <div className="text-slate-400">
            관리자 ID: <span className="font-mono text-slate-600">gaoyuanshanzi@gmail.com</span>
          </div>
        </div>
      </footer>

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
