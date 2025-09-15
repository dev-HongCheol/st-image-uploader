import { BUCKET_NAMES } from "@/constants/common";
import { UploadedFileInsert } from "@/types/database";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export type FolderSuccessRes = {
  success: true;
  fileName: string;
  filePath: string;
  fileUrl: string;
};

export type FolderErrorRes = {
  success: false;
  fileName: string;
  error: string;
};

export type FolderRes = FolderSuccessRes | FolderErrorRes;

async function getOrCreateActiveFolder(userId: string): Promise<string> {
  const supabase = await createClient();

  // 현재 활성 폴더 조회 (파일 수가 1000개 미만인 폴더)
  const { data: activeFolder } = await supabase
    .from("folder_counters")
    .select("*")
    .eq("user_id", userId)
    .lt("file_count", 1000)
    .order("folder_index", { ascending: false })
    .limit(1)
    .single();

  let folderIndex: number;

  // 활성 폴더가 없으면 새 폴더 생성
  if (!activeFolder) {
    const { data: maxFolder } = await supabase
      .from("folder_counters")
      .select("folder_index")
      .eq("user_id", userId)
      .order("folder_index", { ascending: false })
      .limit(1)
      .single();

    folderIndex = (maxFolder?.folder_index ?? -1) + 1;

    // 새 폴더 생성
    await supabase.from("folder_counters").insert({
      user_id: userId,
      folder_index: folderIndex,
      file_count: 0,
    });
  } else {
    folderIndex = activeFolder.folder_index;
  }

  return `${userId}/folder_${String(folderIndex).padStart(3, "0")}`;
}

async function incrementFolderCount(
  userId: string,
  folderIndex: number,
): Promise<void> {
  const supabase = await createClient();

  const { data: currentFolder } = await supabase
    .from("folder_counters")
    .select("file_count")
    .eq("user_id", userId)
    .eq("folder_index", folderIndex)
    .single();

  await supabase
    .from("folder_counters")
    .update({ file_count: (currentFolder?.file_count || 0) + 1 })
    .eq("user_id", userId)
    .eq("folder_index", folderIndex);
}

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

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results = [];

    // 각 파일을 순차적으로 처리
    for (const file of files) {
      try {
        // 활성 폴더 경로 가져오기
        const folderPath = await getOrCreateActiveFolder(user.id);
        const folderIndex = parseInt(folderPath.split("_")[1]);

        // 썸네일 처리는 향후 구현 예정

        // 원본 파일 업로드
        const fileName = file.name;
        const filePath = `${folderPath}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET_NAMES.ORIGINALS)
          .upload(filePath, file, {
            cacheControl: "3600",
            contentType: file.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        // 폴더 카운트 증가
        await incrementFolderCount(user.id, folderIndex);

        // 파일 정보 데이터베이스에 저장
        await supabase.from("uploaded_files").insert<UploadedFileInsert>({
          user_id: user.id,
          folder_path: folderPath,
          folder_index: folderIndex,
          original_filename: file.name,
          stored_filename: fileName,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          storage_bucket: BUCKET_NAMES.ORIGINALS,
          upload_status: "completed",
        });

        results.push({
          success: true,
          fileName: file.name,
          filePath: filePath,
          fileUrl: uploadData.path,
        });
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        results.push({
          success: false,
          fileName: file.name,
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
