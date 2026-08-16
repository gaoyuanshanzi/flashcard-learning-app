import { NextRequest, NextResponse } from 'next/server';
import { getAllVocabulary, insertVocabulary } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getAllVocabulary();
    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching vocabulary from Neon DB:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch vocabulary from database',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { words, mode = 'append' } = body;

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { success: false, error: '유효한 단어 데이터 목록(배열)이 필요합니다.' },
        { status: 400 }
      );
    }

    const replace = mode === 'replace';
    const inserted = await insertVocabulary(words, replace);

    return NextResponse.json({
      success: true,
      inserted,
      message: `${inserted}개의 단어가 성공적으로 ${replace ? '동기화(덮어쓰기)' : '추가'}되었습니다.`,
    });
  } catch (error: any) {
    console.error('Error saving vocabulary to Neon DB:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to save vocabulary to database',
      },
      { status: 500 }
    );
  }
}
