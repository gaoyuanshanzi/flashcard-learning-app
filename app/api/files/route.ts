import { NextRequest, NextResponse } from 'next/server';
import {
  getVocabularyFiles,
  saveVocabularyFile,
  deleteVocabularyFile,
  deleteAllVocabularyData,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/files - Get list of all CSV files stored in Neon DB
export async function GET() {
  try {
    const files = await getVocabularyFiles();
    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error: any) {
    console.error('Error fetching files from Neon DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || '파일 목록을 가져오지 못했습니다.' },
      { status: 500 }
    );
  }
}

// POST /api/files - Save a new CSV file dataset to Neon DB
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, words } = body;

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { success: false, error: '저장할 단어 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const { fileId, insertedCount } = await saveVocabularyFile(
      fileName || '단어장.csv',
      words
    );

    return NextResponse.json({
      success: true,
      fileId,
      insertedCount,
      message: `"${fileName}" 파일(${insertedCount}개 단어)이 Neon DB에 성공적으로 저장되었습니다.`,
    });
  } catch (error: any) {
    console.error('Error saving file to Neon DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Neon DB에 파일을 저장하지 못했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE /api/files?id=123 (single file) OR /api/files?all=true (full wipe)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAll = searchParams.get('all') === 'true';
    const fileIdStr = searchParams.get('id');

    if (isAll) {
      // Complete wipe of all files & words to free 100% capacity
      await deleteAllVocabularyData();
      return NextResponse.json({
        success: true,
        message: 'Neon DB의 모든 단어장 파일과 데이터가 영구 삭제되어 저장 공간이 완전히 확보되었습니다.',
      });
    }

    if (fileIdStr) {
      const fileId = parseInt(fileIdStr, 10);
      if (isNaN(fileId)) {
        return NextResponse.json({ success: false, error: '유효한 파일 ID가 아닙니다.' }, { status: 400 });
      }
      const deleted = await deleteVocabularyFile(fileId);
      return NextResponse.json({
        success: true,
        deleted,
        message: '해당 단어장 파일 및 관련 단어가 Neon DB에서 완전히 삭제되었습니다.',
      });
    }

    return NextResponse.json(
      { success: false, error: '삭제할 파일 ID 또는 all=true 파라미터가 필요합니다.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error deleting from Neon DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Neon DB 데이터 삭제 실패' },
      { status: 500 }
    );
  }
}
