'use client';

import React, { useState } from 'react';
import { BookOpen, Database, HelpCircle, Check, Copy } from 'lucide-react';

interface HeaderProps {
  dataSource: 'local' | 'neon';
  isDbConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ dataSource, isDbConnected }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText('gaoyuanshanzi@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2">
              Flashcard Memorize
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">CSV & Neon DB 연동 단어 암기 학습기</p>
          </div>
        </div>

        {/* Status Badges & Quick Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">연결 모드:</span>
            <span className="font-semibold text-blue-600">
              {dataSource === 'local' ? '로컬 CSV' : 'Neon DB'}
            </span>
          </div>

          <button
            onClick={() => setShowHelp(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="사용 방법 및 가이드"
            aria-label="사용 가이드"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Guide Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-pop-in space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                학습 가이드 & 규격 안내
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-1">1. 세트 규격 입력 (N-M 형식)</h4>
                <p className="text-xs text-blue-800">
                  <span className="font-mono font-bold">10-1</span> (10개씩 1번째 세트: 1~10번 단어)
                  <br />
                  <span className="font-mono font-bold">50-3</span> (50개씩 3번째 세트: 101~150번 단어)
                  <br />
                  * N(세트당 단어 수)은 <strong>10~50개</strong> 사이로 지정합니다.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-1">2. 3단계 오답 라운드 시스템</h4>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-700">
                  <li><strong>1st Round</strong>: 선택한 전체 세트 최초 학습</li>
                  <li><strong>2nd Round</strong>: 1차에서 <strong>Fail</strong>한 오답 단어만 집중 재학습</li>
                  <li><strong>3rd Round</strong>: 2차에서도 또다시 <strong>Fail</strong>한 단어 최종 정복</li>
                  <li>언제든지 [1st Round]를 눌러 초기 세트로 처음부터 재학습 가능</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-1">3. 키보드 단축키 지원</h4>
                <p className="text-xs text-slate-700">
                  <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-xs font-mono">1</kbd> : Pass
                  {'  '}
                  <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-xs font-mono">2</kbd> : Fail
                  {'  '}
                  <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-xs font-mono">Space</kbd> / <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-xs font-mono">Enter</kbd> : Next (다음 단어)
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <p>
                  <strong>관리자 계정:</strong> gaoyuanshanzi@gmail.com
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              확인 및 닫기
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
