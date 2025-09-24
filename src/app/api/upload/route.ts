import { BUCKET_NAMES } from "@/constants/common";
import { createClient } from "@/utils/supabase/server";
import { createThumbnail, getImageThumbnailType } from "@/utils/thumbnail";
import {
  createFileRecord,
  getOrCreateActiveStorageFolder,
  incrementStorageFolderCount,
} from "@/utils/folder-system";
import { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** 한번에 업로드 가능한 최대 파일 개수 */
const MAX_FILES_PER_REQUEST = 10;

type ResStorageUpload = NonNullable<
  Awaited<
    ReturnType<ReturnType<SupabaseClient["storage"]["from"]>["upload"]>
  >["data"]
>;

type UploadSuccessResult = {
  success: true;
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileId: string;
  folderId: string;
};

type UploadErrorResult = {
  success: false;
  fileName: string;
  error: string;
};

/** 업로드 결과 타입 */
export type UploadResult = UploadSuccessResult | UploadErrorResult;

/**
 * 썸네일 생성 및 업로드
 *
 * 확장자를 체크하여 이미지인경우 애플 이미지, 다른 이미지에 따라 썸네일을 생성 후 업로드 처리
 */
async function processThumbnail(
  file: File,
  storageFolder: { storage_path: string },
  supabase: SupabaseClient,
): Promise<{ path: string; size: number } | null> {
  const imageThumbnailType = getImageThumbnailType(file.name);

  if (imageThumbnailType === "none") {
    return null;
  }

  const thumbnailBuffer = await createThumbnail(imageThumbnailType, file);
  if (!thumbnailBuffer) return null;

  const thumbnailImageFilename = file.name.replace(/\.[^/.]+$/, "");
  const thumbnailPath = `${storageFolder.storage_path}/${thumbnailImageFilename}.jpeg`;

  const { error: thumbnailUploadError } = await supabase.storage
    .from(BUCKET_NAMES.THUMBNAILS)
    .upload(thumbnailPath, thumbnailBuffer, {
      cacheControl: "3600",
      contentType: "image/jpeg",
    });

  if (thumbnailUploadError) {
    throw new Error(`Thumbnail upload failed: ${thumbnailUploadError.message}`);
  }

  return {
    path: thumbnailPath,
    size: thumbnailBuffer.length,
  };
}

/**
 * 원본 파일 업로드
 */
async function uploadOriginalFile(
  file: File,
  storageFolder: { storage_path: string },
  supabase: SupabaseClient,
): Promise<{
  path: string;
  uploadData: ResStorageUpload;
  storedFilename: string;
}> {
  // 고유 파일명 생성 (충돌 방지)
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileExtension = file.name.split(".").pop();
  const storedFilename = `${timestamp}_${randomSuffix}.${fileExtension}`;

  const filePath = `${storageFolder.storage_path}/${storedFilename}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAMES.ORIGINALS)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  return { path: filePath, uploadData, storedFilename };
}

/**
 * 실패 시 썸네일 정리
 */
async function cleanupThumbnail(
  thumbnailPath: string,
  supabase: SupabaseClient,
): Promise<void> {
  try {
    await supabase.storage
      .from(BUCKET_NAMES.THUMBNAILS)
      .remove([thumbnailPath]);
    console.log(`Thumbnail cleaned up: ${thumbnailPath}`);
  } catch (error) {
    console.error(`Failed to cleanup thumbnail:`, error);
  }
}

/**
 * 단일 파일 처리
 */
async function processFile(
  file: File,
  userId: string,
  targetFolderId: string | undefined,
  supabase: SupabaseClient,
): Promise<UploadResult> {
  try {
    // 1. 활성 물리적 저장 폴더 가져오기
    const storageFolder = await getOrCreateActiveStorageFolder(userId);

    // 2. 썸네일 처리
    let thumbnailInfo: { path: string; size: number } | null = null;
    try {
      thumbnailInfo = await processThumbnail(file, storageFolder, supabase);
    } catch (thumbnailError) {
      console.error(
        `Thumbnail processing failed for ${file.name}:`,
        thumbnailError,
      );
      return {
        success: false,
        fileName: file.name,
        error: `Thumbnail processing failed: ${
          thumbnailError instanceof Error
            ? thumbnailError.message
            : "Unknown error"
        }`,
      };
    }

    // 3. 원본 파일 업로드
    let originalFileInfo: {
      path: string;
      uploadData: ResStorageUpload;
      storedFilename: string;
    };

    try {
      originalFileInfo = await uploadOriginalFile(
        file,
        storageFolder,
        supabase,
      );
    } catch (uploadError) {
      // 원본 업로드 실패 시 썸네일 정리
      if (thumbnailInfo) {
        await cleanupThumbnail(thumbnailInfo.path, supabase);
      }

      return {
        success: false,
        fileName: file.name,
        error: `File upload failed: ${
          uploadError instanceof Error ? uploadError.message : "Unknown error"
        }`,
      };
    }

    // 4. 파일 레코드 생성
    const fileRecord = await createFileRecord(userId, file, {
      filePath: originalFileInfo.path,
      storedFilename: originalFileInfo.storedFilename,
      thumbnailPath: thumbnailInfo?.path,
      thumbnailSize: thumbnailInfo?.size,
    });

    // 5. 특정 폴더 지정된 경우 설정
    if (targetFolderId) {
      const { data: targetFolder } = await supabase
        .from("folders")
        .select("user_id")
        .eq("id", targetFolderId)
        .single();

      if (!targetFolder || targetFolder.user_id !== userId) {
        throw new Error("Invalid target folder or permission denied");
      }

      fileRecord.folder_id = targetFolderId;
    }

    // 6. 데이터베이스에 파일 정보 저장
    const { data: insertedFile, error: insertError } = await supabase
      .from("uploaded_files")
      .insert(fileRecord)
      .select()
      .single();

    if (insertError) {
      // DB 삽입 실패 시 업로드된 파일들 정리
      await supabase.storage
        .from(BUCKET_NAMES.ORIGINALS)
        .remove([originalFileInfo.path]);
      if (thumbnailInfo) {
        await cleanupThumbnail(thumbnailInfo.path, supabase);
      }
      throw insertError;
    }

    // 7. 저장 폴더 카운트 증가
    await incrementStorageFolderCount(storageFolder.id, file.size);

    return {
      success: true,
      fileName: file.name,
      filePath: originalFileInfo.path,
      fileUrl: originalFileInfo.uploadData.path,
      fileId: insertedFile.id,
      folderId: fileRecord.folder_id,
    };
  } catch (error) {
    console.error(`Error processing file ${file.name}:`, error);
    return {
      success: false,
      fileName: file.name,
      error: error instanceof Error ? error.message : "File processing failed",
    };
  }
}

/**
 * 파일 업로드 API 핸들러
 */
export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const targetFolderId = formData.get("folderId") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `Too many files. Maximum ${MAX_FILES_PER_REQUEST} files allowed per request.`,
        },
        { status: 400 },
      );
    }

    // 대상 폴더 유효성 검사
    if (targetFolderId) {
      const { data: folder } = await supabase
        .from("folders")
        .select("user_id")
        .eq("id", targetFolderId)
        .single();

      if (!folder || folder.user_id !== user.id) {
        return NextResponse.json(
          { error: "Invalid folder ID or permission denied" },
          { status: 400 },
        );
      }
    }

    // 파일들을 병렬로 처리
    const results = await Promise.all(
      files.map((file) =>
        processFile(file, user.id, targetFolderId || undefined, supabase),
      ),
    );

    // HTTP 상태 코드 결정
    const successCount = results.filter((result) => result.success).length;
    const totalCount = results.length;

    let status: number;
    if (successCount === totalCount) {
      status = 200; // 모든 파일 성공
    } else if (successCount === 0) {
      status = 400; // 모든 파일 실패
    } else {
      status = 207; // 부분 성공 (Multi-Status)
    }

    return NextResponse.json(
      {
        results,
        summary: {
          total: totalCount,
          success: successCount,
          failed: totalCount - successCount,
        },
        metadata: {
          targetFolderId: targetFolderId || null,
          version: "2.0", // 새로운 깔끔한 버전 표시
        },
      },
      { status },
    );
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
