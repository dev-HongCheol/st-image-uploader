import { BUCKET_NAMES } from "@/constants/common";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * 파일 삭제 API
 *
 * 트랜잭션 순서:
 * 1. DB에서 파일 정보 조회 및 검증
 * 2. DB에서 파일 레코드 삭제 (트랜잭션)
 * 3. storage_folders 카운터 업데이트 (트랜잭션)
 * 4. 스토리지에서 실제 파일 삭제 (베스트 에포트)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileIds } = body as { fileIds: string[] };

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: "fileIds array is required" },
        { status: 400 },
      );
    }

    // 1단계: DB에서 파일 정보 조회 및 권한 검증
    const { data: filesToDelete, error: fetchError } = await supabase
      .from("uploaded_files")
      .select("*")
      .in("id", fileIds)
      .eq("user_id", user.id);

    if (fetchError) {
      console.error("파일 조회 실패:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch files" },
        { status: 500 },
      );
    }

    if (!filesToDelete || filesToDelete.length === 0) {
      return NextResponse.json(
        { error: "No files found or permission denied" },
        { status: 404 },
      );
    }

    // 2단계: storage_folder별 집계 (카운터 업데이트용)
    const storageFolderUpdates = filesToDelete.reduce(
      (acc, file) => {
        if (!acc[file.storage_folder_id]) {
          acc[file.storage_folder_id] = {
            count: 0,
            totalSize: 0,
          };
        }
        acc[file.storage_folder_id].count += 1;
        acc[file.storage_folder_id].totalSize += file.file_size;
        return acc;
      },
      {} as Record<string, { count: number; totalSize: number }>,
    );

    // 3단계: DB 트랜잭션 - 파일 삭제 및 카운터 업데이트
    // Supabase는 여러 쿼리를 하나의 트랜잭션으로 묶는 기능이 제한적이므로
    // RPC 함수를 사용하거나 순차 실행 후 에러 발생 시 롤백 처리

    // 3-1. 파일 레코드 삭제
    const { error: deleteError } = await supabase
      .from("uploaded_files")
      .delete()
      .in("id", fileIds)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("파일 삭제 실패:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete files from database" },
        { status: 500 },
      );
    }

    // 3-2. storage_folders 카운터 업데이트
    for (const [storageFolderId, update] of Object.entries(
      storageFolderUpdates,
    )) {
      // 현재 값 조회
      const { data: currentFolder, error: fetchFolderError } = await supabase
        .from("storage_folders")
        .select("file_count, total_size, max_file_count")
        .eq("id", storageFolderId)
        .single();

      if (fetchFolderError || !currentFolder) {
        console.error(
          `storage_folder ${storageFolderId} 조회 실패:`,
          fetchFolderError,
        );
        continue; // 카운터 업데이트 실패는 치명적이지 않으므로 계속 진행
      }

      const newFileCount = Math.max(0, currentFolder.file_count - update.count);
      const newTotalSize = Math.max(
        0,
        currentFolder.total_size - update.totalSize,
      );

      // is_active 상태 결정: 파일 수가 max 미만이면 활성화
      const isActive = newFileCount < currentFolder.max_file_count;

      const { error: updateFolderError } = await supabase
        .from("storage_folders")
        .update({
          file_count: newFileCount,
          total_size: newTotalSize,
          is_active: isActive,
        })
        .eq("id", storageFolderId);

      if (updateFolderError) {
        console.error(
          `storage_folder ${storageFolderId} 업데이트 실패:`,
          updateFolderError,
        );
      }
    }

    // 4단계: 스토리지에서 실제 파일 삭제 (베스트 에포트)
    // DB에서 이미 삭제되었으므로 스토리지 삭제 실패는 치명적이지 않음

    // 원본 파일 경로 수집
    const originalFilePaths = filesToDelete.map((file) => file.file_path);

    // 썸네일 파일 경로 수집
    const thumbnailFilePaths = filesToDelete
      .filter((file) => file.thumbnail_path)
      .map((file) => file.thumbnail_path!);

    // 원본 파일 삭제
    if (originalFilePaths.length > 0) {
      const { error: removeOriginalsError } = await supabase.storage
        .from(BUCKET_NAMES.ORIGINALS)
        .remove(originalFilePaths);

      if (removeOriginalsError) {
        console.warn("원본 파일 스토리지 삭제 실패:", removeOriginalsError);
        // 에러 로깅만 하고 계속 진행
      }
    }

    // 썸네일 파일 삭제
    if (thumbnailFilePaths.length > 0) {
      const { error: removeThumbnailsError } = await supabase.storage
        .from(BUCKET_NAMES.THUMBNAILS)
        .remove(thumbnailFilePaths);

      if (removeThumbnailsError) {
        console.warn("썸네일 파일 스토리지 삭제 실패:", removeThumbnailsError);
        // 에러 로깅만 하고 계속 진행
      }
    }

    return NextResponse.json(
      {
        success: true,
        deletedCount: filesToDelete.length,
        message: `${filesToDelete.length}개 파일이 삭제되었습니다.`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("파일 삭제 API 오류:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
