"use server";

import { 
  createUserFolder, 
  deleteUserFolder, 
  findFolderByPath, 
  updateUserFolder 
} from "@/utils/folder-system";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * 폴더 생성 Server Action
 * @param formData - 폼 데이터 또는 직접 파라미터
 */
export async function createFolderAction(
  params: {
    name: string;
    path?: string;
    folderColor?: string;
    description?: string;
  }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { name, path, folderColor, description } = params;

    if (!name || typeof name !== 'string') {
      throw new Error("Folder name is required");
    }

    // path를 기반으로 부모 폴더 ID 찾기
    let parentFolderId: string | undefined;
    
    if (path && path.trim() !== "") {
      const foundFolderId = await findFolderByPath(user.id, path);
      
      if (!foundFolderId) {
        throw new Error(`경로 '${path}'에 해당하는 폴더를 찾을 수 없습니다.`);
      }
      
      parentFolderId = foundFolderId;
    }

    // 폴더 생성
    const newFolder = await createUserFolder(
      user.id,
      name,
      parentFolderId,
      { folderColor, description }
    );

    // 현재 경로 페이지 재검증
    const currentPath = path ? `/?path=${encodeURIComponent(path)}` : '/';
    revalidatePath(currentPath);

    return {
      success: true,
      data: newFolder,
    };

  } catch (error) {
    console.error("폴더 생성 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 폴더 수정 Server Action
 */
export async function updateFolderAction(
  params: {
    folderId: string;
    name?: string;
    folderColor?: string;
    description?: string;
    currentPath?: string;
  }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { folderId, name, folderColor, description, currentPath } = params;

    if (!folderId) {
      throw new Error("Folder ID is required");
    }

    // 폴더 정보 업데이트
    const updatedFolder = await updateUserFolder(
      user.id,
      folderId,
      { name, folderColor, description }
    );

    // 현재 경로 페이지 재검증
    const revalidationPath = currentPath ? `/?path=${encodeURIComponent(currentPath)}` : '/';
    revalidatePath(revalidationPath);

    return {
      success: true,
      data: updatedFolder,
    };

  } catch (error) {
    console.error("폴더 수정 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 폴더 삭제 Server Action
 */
export async function deleteFolderAction(
  params: {
    folderId: string;
    recursive?: boolean;
    currentPath?: string;
  }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { folderId, recursive = false, currentPath } = params;

    if (!folderId) {
      throw new Error("Folder ID is required");
    }

    // 폴더 삭제
    await deleteUserFolder(user.id, folderId, { recursive });

    // 현재 경로 페이지 재검증
    const revalidationPath = currentPath ? `/?path=${encodeURIComponent(currentPath)}` : '/';
    revalidatePath(revalidationPath);

    return {
      success: true,
      message: "Folder deleted successfully",
    };

  } catch (error) {
    console.error("폴더 삭제 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}