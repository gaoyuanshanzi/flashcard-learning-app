import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '단어 암기 플래시카드 (CSV & Neon DB)',
  description: 'CSV 및 Neon PostgreSQL DB 연동 단어 암기 연습 웹 서비스. 세트별 단어 추출 및 3단계 라운드 오답 반복 학습.',
  keywords: ['flashcard', '단어장', '단어 암기', 'Neon PostgreSQL', 'CSV', '영어단어'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Pretendard:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
