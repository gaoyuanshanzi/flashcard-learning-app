# Flashcard Learning Web App (CSV & Neon DB 연동 단어 암기 서비스)

로컬 컴퓨터의 CSV 파일 및 **Neon PostgreSQL 데이터베이스**와 연동하여 사용자가 지정한 세트 규격(`N-M`)별 단어를 추출하고, 3단계 라운드 시스템(Spaced Repetition & 오답 재학습)을 통해 단어를 효과적으로 암기할 수 있는 모던 White Mode 웹 애플리케이션입니다.

---

## 🌟 주요 기능 (Key Features)

1. **데이터 소스 선택 (Data Source Toggle)**:
   - **로컬 컴퓨터 (CSV)**: 사용자의 `.csv` 파일 업로드 파싱 및 CSV 다운로드 내보내기 지원
   - **Neon DB**: Neon PostgreSQL DB (`vocabulary` 테이블) 실시간 조회 및 데이터 동기화(Sync) 저장
   - **원클릭 샘플 데이터 로드**: 50개의 필수 영단어 데이터셋 기본 탑재

2. **세트 규격 및 번호 지정 (`N-M` 로직)**:
   - **입력 형식**: `[세트당 단어 수]-[세트 번호]` (예: `10-1`, `20-2`, `50-3`)
   - **유효성 검사**:
     - N(세트당 단어 수) 10 ~ 50개 범위 자동 검증
     - 전체 단어 수 초과 시 친절한 안내 메시지
     - 마지막 세트의 단어 수 부족 시 잔여 단어 자동 로드

3. **학습 인터페이스 & 모드**:
   - **[외국어 우선] 모드**: 카드 전면에 외국어 단어 표시 $\rightarrow$ Pass/Fail 선택 시 뜻과 발음 표시
   - **[한국어 우선] 모드**: 카드 전면에 한국어 뜻 표시 $\rightarrow$ Pass/Fail 선택 시 외국어 단어 표시
   - **Web Speech API 발음 듣기**: 스피커 버튼 클릭 시 원어민 TTS 음성 재생
   - **키보드 단축키 지원**: `1` (Pass), `2` (Fail), `Space` / `Enter` (Next / 카드 뒤집기)

4. **3단계 라운드 오답 정복 시스템**:
   - **1st Round**: 지정된 세트 전체 단어 최초 학습
   - **2nd Round**: 1차에서 **Fail**된 오답 단어들만 모아 재학습
   - **3rd Round**: 2차에서도 또다시 **Fail**된 단어들만 모아 최종 정복
   - **자유로운 초기화**: 언제든 [1st Round]로 돌아가서 처음부터 다시 연습 가능

---

## 🛠️ 기술 스택 (Tech Stack)

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Clean White Mode)
- **Database**: Neon PostgreSQL Serverless (`@neondatabase/serverless`)
- **CSV Parsing**: PapaParse (`papaparse`)
- **Icons**: Lucide React
- **Celebration Effects**: Canvas-Confetti

---

## 📦 데이터베이스 스키마 (Neon DB Schema)

Next.js API 호출 시 `vocabulary` 테이블이 없으면 자동으로 생성됩니다.

```sql
CREATE TABLE IF NOT EXISTS vocabulary (
  id SERIAL PRIMARY KEY,
  foreign_word TEXT NOT NULL,
  korean_meaning TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 로컬 실행 방법 (Local Development)

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일에 Neon DB 접속 정보를 설정합니다:
```env
DATABASE_URL="postgresql://neondb_owner:npg_kB5KwcUGmn8A@ep-red-tree-ay6p5ski-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 3. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000` 접속

---

## ☁️ Vercel 배포 가이드 (Vercel Deployment)

1. **GitHub 저장소에 Push**:
   ```bash
   git init
   git add .
   git commit -m "feat: flashcard learning web app"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/flashcard-app.git
   git push -u origin main
   ```

2. **Vercel 연동**:
   - Vercel 대시보드([vercel.com](https://vercel.com))에 로그인 (계정: `gaoyuanshanzi@gmail.com`)
   - **Add New...** $\rightarrow$ **Project** $\rightarrow$ GitHub 저장소 선택
   - **Environment Variables** 설정:
     - `DATABASE_URL`: `postgresql://neondb_owner:npg_kB5KwcUGmn8A@ep-red-tree-ay6p5ski-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require`
   - **Deploy** 클릭하여 즉시 배포 완료!
