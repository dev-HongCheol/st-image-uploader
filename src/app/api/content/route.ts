import { createClient } from "@/utils/supabase/server";
import { 
  findFolderByPath,
  getFolders,
  getFolderFiles,
  getOrCreateUserRoot
} from "@/utils/folder-system";
import { NextRequest, NextResponse } from "next/server";

/**
 * 폴더 컨텐츠 조회 API (폴더 + 파일)
 * GET /api/content?path=/test/bb/11
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sortBy") as "created_at" | "name" | "size" || "created_at";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || "desc";
    const fileType = searchParams.get("fileType") as "image" | "video" | "document" | "other" | undefined;

    let folderId: string;
    let currentPath = path || "";

    if (!currentPath) {
      // 경로가 없으면 루트 폴더
      const rootFolder = await getOrCreateUserRoot(user.id);
      folderId = rootFolder.id;
    } else {
      // 경로를 기반으로 폴더 찾기
      const foundFolderId = await findFolderByPath(user.id, currentPath);
      
      if (!foundFolderId) {
        return NextResponse.json({
          success: false,
          error: "Folder not found",
          message: `경로 '${currentPath}'에 해당하는 폴더를 찾을 수 없습니다.`
        }, { status: 404 });
      }

      folderId = foundFolderId;
    }

    // 폴더와 파일을 병렬로 조회
    const [folders, files] = await Promise.all([
      getFolders(folderId, user.id),
      getFolderFiles(folderId, user.id, {
        fileType,
        limit,
        offset,
        sortBy,
        sortOrder,
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        folders,
        files,
        currentPath,
        folderId,
      }
    });

  } catch (error) {
    console.error("컨텐츠 조회 오류:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch content",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}