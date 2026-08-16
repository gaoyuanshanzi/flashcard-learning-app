import { NextRequest, NextResponse } from 'next/server';
import { getVocabularyWords, deleteAllVocabularyData } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileIdStr = searchParams.get('fileId');
    const fileId = fileIdStr ? parseInt(fileIdStr, 10) : undefined;

    const data = await getVocabularyWords(fileId);
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

export async function DELETE() {
  try {
    await deleteAllVocabularyData();
    return NextResponse.json({
      success: true,
      message: 'Neon DB의 모든 데이터가 완전히 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('Error truncating vocabulary DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || '데이터 완전 삭제 실패' },
      { status: 500 }
    );
  }
}
