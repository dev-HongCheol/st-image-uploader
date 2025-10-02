import { createClient } from "@/utils/supabase/server";
import { findFolderByPath, getOrCreateUserRoot } from "@/utils/folder-system";
import { NextRequest, NextResponse } from "next/server";

/**
 * 파일 이동 API
 * POST /api/files/move
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileIds, targetPath } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Invalid file IDs",
        message: "파일 ID 목록이 필요합니다."
      }, { status: 400 });
    }

    // 대상 폴더 ID 찾기
    let targetFolderId: string;
    
    if (!targetPath || targetPath.trim() === "" || targetPath === "/") {
      // 루트 폴더로 이동
      const rootFolder = await getOrCreateUserRoot(user.id);
      targetFolderId = rootFolder.id;
    } else {
      // 경로를 기반으로 폴더 찾기
      const foundFolderId = await findFolderByPath(user.id, targetPath);
      
      if (!foundFolderId) {
        return NextResponse.json({
          success: false,
          error: "Target folder not found",
          message: `대상 경로 '${targetPath}'에 해당하는 폴더를 찾을 수 없습니다.`
        }, { status: 404 });
      }

      targetFolderId = foundFolderId;
    }

    // 파일 소유권 확인
    const { data: files, error: filesError } = await supabase
      .from("uploaded_files")
      .select("id, original_filename, display_filename, folder_id")
      .in("id", fileIds)
      .eq("user_id", user.id);

    if (filesError) {
      throw new Error(`파일 조회 실패: ${filesError.message}`);
    }

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Files not found",
        message: "이동할 파일을 찾을 수 없습니다."
      }, { status: 404 });
    }

    if (files.length !== fileIds.length) {
      return NextResponse.json({
        success: false,
        error: "Some files not found",
        message: "일부 파일을 찾을 수 없습니다."
      }, { status: 404 });
    }

    // 파일들을 대상 폴더로 이동
    const { data: movedFiles, error: moveError } = await supabase
      .from("uploaded_files")
      .update({ folder_id: targetFolderId })
      .in("id", fileIds)
      .eq("user_id", user.id)
      .select("*");

    if (moveError) {
      throw new Error(`파일 이동 실패: ${moveError.message}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        movedFiles,
        targetFolderId,
        message: `${files.length}개의 파일이 성공적으로 이동되었습니다.`
      }
    });

  } catch (error) {
    console.error("파일 이동 오류:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to move files",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}