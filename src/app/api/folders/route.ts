import { createClient } from "@/utils/supabase/server";
import { 
  createUserFolder, 
  deleteUserFolder, 
  updateUserFolder,
  getUserFolderTree,
  findFolderByPath
} from "@/utils/folder-system";
import { NextRequest, NextResponse } from "next/server";

/**
 * 폴더 목록 조회 API
 * GET /api/folders
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");

    // 폴더 트리 조회
    const folderTree = await getUserFolderTree(
      user.id, 
      parentId || undefined
    );

    return NextResponse.json({
      success: true,
      data: folderTree
    });

  } catch (error) {
    console.error("폴더 목록 조회 오류:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch folders",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

/**
 * 새 폴더 생성 API
 * POST /api/folders
 * Body: { name, path?, folderColor?, description? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, path, folderColor, description } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: "Folder name is required" }, 
        { status: 400 }
      );
    }

    // path를 기반으로 부모 폴더 ID 찾기
    let parentFolderId: string | undefined;
    
    if (path && path.trim() !== "") {
      // 경로가 있으면 해당 경로의 폴더 ID 찾기
      const foundFolderId = await findFolderByPath(user.id, path);
      
      if (!foundFolderId) {
        return NextResponse.json({
          error: "Parent folder not found",
          message: `경로 '${path}'에 해당하는 폴더를 찾을 수 없습니다.`
        }, { status: 404 });
      }
      
      parentFolderId = foundFolderId;
    }
    // path가 없으면 parentFolderId는 undefined (루트 폴더에 생성)

    // 폴더 생성
    const newFolder = await createUserFolder(
      user.id,
      name,
      parentFolderId,
      { folderColor, description }
    );

    return NextResponse.json({
      success: true,
      data: newFolder
    }, { status: 201 });

  } catch (error) {
    console.error("폴더 생성 오류:", error);
    return NextResponse.json(
      { 
        error: "Failed to create folder",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 400 }
    );
  }
}

/**
 * 폴더 정보 수정 API
 * PATCH /api/folders
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { folderId, name, folderColor, description } = body;

    if (!folderId) {
      return NextResponse.json(
        { error: "Folder ID is required" }, 
        { status: 400 }
      );
    }

    // 폴더 정보 업데이트
    const updatedFolder = await updateUserFolder(
      user.id,
      folderId,
      { name, folderColor, description }
    );

    return NextResponse.json({
      success: true,
      data: updatedFolder
    });

  } catch (error) {
    console.error("폴더 수정 오류:", error);
    return NextResponse.json(
      { 
        error: "Failed to update folder",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 400 }
    );
  }
}

/**
 * 폴더 삭제 API
 * DELETE /api/folders
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { folderId, recursive = false } = body;

    if (!folderId) {
      return NextResponse.json(
        { error: "Folder ID is required" }, 
        { status: 400 }
      );
    }

    // 폴더 삭제
    await deleteUserFolder(user.id, folderId, { recursive });

    return NextResponse.json({
      success: true,
      message: "Folder deleted successfully"
    });

  } catch (error) {
    console.error("폴더 삭제 오류:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete folder",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 400 }
    );
  }
}