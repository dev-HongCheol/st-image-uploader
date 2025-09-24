/**
 * 새로운 폴더 시스템 유틸리티 함수들
 *
 * 핵심 개념:
 * - 논리적 폴더: 사용자가 보는 폴더 구조 (folders 테이블)
 * - 물리적 폴더: 실제 파일이 저장되는 곳 (storage_folders 테이블)
 * - 파일 이동: 실제 파일은 그대로, DB의 folder_id만 변경
 */

import type {
  Folder,
  FolderInsert,
  FolderTreeNode,
  StorageFolder,
  UploadedFileInsert,
} from "@/types/database";
import { createClient } from "@/utils/supabase/server";

/**
 * 사용자의 루트 폴더를 가져오거나 생성하는 함수
 *
 * @param userId - 사용자 ID
 * @returns 루트 폴더 정보
 */
export async function getOrCreateUserRoot(userId: string): Promise<Folder> {
  const supabase = await createClient();

  // 기존 루트 폴더 조회
  let { data: rootFolder } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .is("parent_id", null)
    .eq("name", "My Files")
    .single();

  // 루트 폴더가 없으면 생성
  if (!rootFolder) {
    const { data: newFolder, error } = await supabase
      .from("folders")
      .insert({
        user_id: userId,
        name: "My Files",
        parent_id: null,
        is_system_folder: true,
      } satisfies FolderInsert)
      .select()
      .single();

    if (error) throw error;
    rootFolder = newFolder;
  }

  return rootFolder;
}

/**
 * 활성 저장 폴더를 가져오거나 새로 생성하는 함수
 * (기존 getOrCreateActiveFolder 로직과 동일)
 *
 * @param userId - 사용자 ID
 * @returns 활성 저장 폴더 정보
 */
export async function getOrCreateActiveStorageFolder(
  userId: string,
): Promise<StorageFolder> {
  const supabase = await createClient();

  // 현재 활성 저장 폴더 조회 (파일 수가 max_file_count 미만인 폴더)
  let { data: activeFolder } = await supabase
    .from("storage_folders")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("folder_index", { ascending: false })
    .limit(1)
    .single();

  // 활성 폴더가 없으면 새 폴더 생성
  if (!activeFolder) {
    const { data: maxFolder } = await supabase
      .from("storage_folders")
      .select("folder_index")
      .eq("user_id", userId)
      .order("folder_index", { ascending: false })
      .limit(1)
      .single();

    const folderIndex = (maxFolder?.folder_index ?? -1) + 1;
    const storagePath = `${userId}/folder_${String(folderIndex).padStart(3, "0")}`;

    const { data: newFolder, error } = await supabase
      .from("storage_folders")
      .insert({
        user_id: userId,
        folder_index: folderIndex,
        storage_path: storagePath,
        file_count: 0,
        max_file_count: 1000,
        total_size: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      // 중복 키 오류인 경우, 다시 활성 폴더 조회 시도
      if (error.code === '23505') {
        console.log('Race condition detected, retrying folder lookup...');
        const { data: retryFolder } = await supabase
          .from("storage_folders")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("folder_index", { ascending: false })
          .limit(1)
          .single();

        if (retryFolder) {
          activeFolder = retryFolder;
        } else {
          // 여전히 없으면 원래 오류 던지기
          throw error;
        }
      } else {
        throw error;
      }
    } else {
      activeFolder = newFolder;
    }
  }

  return activeFolder;
}

/**
 * 저장 폴더에 대응하는 논리적 폴더를 가져오거나 생성하는 함수
 *
 * @param userId - 사용자 ID
 * @param storageFolder - 물리적 저장 폴더
 * @returns 대응하는 논리적 폴더
 */
export async function getOrCreateLogicalFolder(
  userId: string,
  storageFolder: StorageFolder,
): Promise<Folder> {
  const supabase = await createClient();

  // 루트 폴더 확인
  const rootFolder = await getOrCreateUserRoot(userId);

  // 저장 폴더에 대응하는 논리적 폴더명
  const folderName = `folder_${String(storageFolder.folder_index).padStart(3, "0")}`;
  const fullPath = `/My Files/${folderName}`;

  // 기존 논리적 폴더 조회
  let { data: logicalFolder } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .eq("full_path", fullPath)
    .single();

  // 논리적 폴더가 없으면 생성
  if (!logicalFolder) {
    const { data: newFolder, error } = await supabase
      .from("folders")
      .insert({
        user_id: userId,
        name: folderName,
        parent_id: rootFolder.id,
        is_system_folder: true,
      } satisfies FolderInsert)
      .select()
      .single();

    if (error) throw error;
    logicalFolder = newFolder;
  }

  return logicalFolder;
}

/**
 * 저장 폴더의 파일 개수를 증가시키는 함수
 *
 * @param storageFolderId - 저장 폴더 ID
 * @param fileSize - 추가할 파일 크기
 */
export async function incrementStorageFolderCount(
  storageFolderId: string,
  fileSize: number,
): Promise<void> {
  const supabase = await createClient();

  const { data: currentFolder } = await supabase
    .from("storage_folders")
    .select("file_count, total_size, max_file_count")
    .eq("id", storageFolderId)
    .single();

  if (!currentFolder) throw new Error("Storage folder not found");

  const newFileCount = currentFolder.file_count + 1;
  const newTotalSize = currentFolder.total_size + fileSize;
  const isActive = newFileCount < currentFolder.max_file_count;

  await supabase
    .from("storage_folders")
    .update({
      file_count: newFileCount,
      total_size: newTotalSize,
      is_active: isActive,
    })
    .eq("id", storageFolderId);
}

/**
 * 파일을 다른 논리적 폴더로 이동하는 함수
 * (물리적 파일은 그대로, DB의 folder_id만 변경)
 *
 * @param fileId - 이동할 파일 ID
 * @param targetFolderId - 대상 폴더 ID
 * @param userId - 사용자 ID (권한 확인용)
 */
export async function moveFileToFolder(
  fileId: string,
  targetFolderId: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient();

  // 파일과 대상 폴더의 소유권 확인
  const { data: file } = await supabase
    .from("uploaded_files")
    .select("user_id, folder_id")
    .eq("id", fileId)
    .single();

  const { data: targetFolder } = await supabase
    .from("folders")
    .select("user_id")
    .eq("id", targetFolderId)
    .single();

  if (!file || !targetFolder) {
    throw new Error("File or target folder not found");
  }

  if (file.user_id !== userId || targetFolder.user_id !== userId) {
    throw new Error("Permission denied");
  }

  // 파일의 논리적 폴더만 변경 (물리적 위치는 그대로)
  await supabase
    .from("uploaded_files")
    .update({ folder_id: targetFolderId })
    .eq("id", fileId);
}

/**
 * 사용자의 폴더 트리를 조회하는 함수
 *
 * @param userId - 사용자 ID
 * @param parentId - 상위 폴더 ID (null이면 루트부터)
 * @returns 폴더 트리 구조
 */
export async function getUserFolderTree(
  userId: string,
  parentId: string | null = null,
): Promise<FolderTreeNode[]> {
  const supabase = await createClient();

  // 사용자가 만든 논리적 폴더만 조회 (시스템 폴더 제외)
  let query = supabase
    .from("folder_tree_view") // 뷰 사용
    .select("*")
    .eq("user_id", userId)
    .eq("is_system_folder", false) // 시스템 폴더 제외
    .order("name");

  // parent_id가 null인 경우와 값이 있는 경우를 다르게 처리
  if (parentId === null) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data: folders, error } = await query;
  if (error) {
    console.error("폴더 트리 조회 오류:", error);
    return [];
  }

  if (!folders) return [];

  // 재귀적으로 하위 폴더들도 조회
  const folderTree: FolderTreeNode[] = [];

  for (const folder of folders) {
    const children = await getUserFolderTree(userId, folder.id);

    folderTree.push({
      ...folder,
      children: children.length > 0 ? children : undefined,
      level: folder.depth,
      expanded: false, // 기본값
    });
  }

  return folderTree;
}

/**
 * 특정 폴더의 파일 목록을 조회하는 함수
 *
 * @param folderId - 폴더 ID
 * @param userId - 사용자 ID
 * @param options - 조회 옵션
 * @returns 파일 목록
 */
export async function getFolderFiles(
  folderId: string,
  userId: string,
  options: {
    fileType?: "image" | "video" | "document" | "other";
    limit?: number;
    offset?: number;
    sortBy?: "created_at" | "name" | "size";
    sortOrder?: "asc" | "desc";
  } = {},
) {
  const supabase = await createClient();

  let query = supabase
    .from("uploaded_files")
    .select("*")
    .eq("user_id", userId)
    .eq("folder_id", folderId)
    .eq("upload_status", "completed");

  // 필터 적용
  if (options.fileType) {
    query = query.eq("file_type", options.fileType);
  }

  // 정렬 적용
  const sortBy = options.sortBy || "created_at";
  const sortOrder = options.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // 페이지네이션 적용
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1,
    );
  }

  const { data: files, error } = await query;
  if (error) throw error;

  return files;
}

/**
 * 새로운 폴더 시스템을 위한 파일 업로드 정보 생성
 * (기존 API와의 호환성을 위한 래퍼 함수)
 *
 * @param userId - 사용자 ID
 * @param file - 업로드할 파일 정보
 * @param uploadInfo - 업로드 결과 정보
 * @param targetFolderId - 업로드할 대상 폴더 ID (없으면 루트 폴더)
 * @returns 데이터베이스 insert용 객체
 */
export async function createFileRecord(
  userId: string,
  file: File,
  uploadInfo: {
    filePath: string;
    storedFilename: string;
    thumbnailPath?: string;
    thumbnailSize?: number;
  },
  targetFolderId?: string,
): Promise<UploadedFileInsert> {
  // 활성 저장 폴더 가져오기 (물리적 저장용)
  const storageFolder = await getOrCreateActiveStorageFolder(userId);

  // 논리적 폴더 결정 (기본값: 루트 폴더)
  let logicalFolderId: string;
  if (targetFolderId) {
    // 드래그 앤 드롭 등으로 특정 폴더에 업로드하는 경우
    logicalFolderId = targetFolderId;
  } else {
    // 기본 업로드: 루트 폴더에 업로드
    const rootFolder = await getOrCreateUserRoot(userId);
    logicalFolderId = rootFolder.id;
  }

  // 파일 타입 결정
  const getFileType = (
    mimeType: string,
  ): "image" | "video" | "document" | "other" => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("text/")
    )
      return "document";
    return "other";
  };

  return {
    user_id: userId,
    folder_id: logicalFolderId, // 논리적 폴더 위치 (루트 폴더 또는 지정된 폴더)
    storage_folder_id: storageFolder.id, // 물리적 저장 위치
    original_filename: file.name,
    stored_filename: uploadInfo.storedFilename,
    display_filename: file.name, // 초기값은 원본 파일명
    file_path: uploadInfo.filePath,
    storage_bucket: "originals",
    file_size: file.size,
    mime_type: file.type,
    file_type: getFileType(file.type),
    has_thumbnail: !!uploadInfo.thumbnailPath,
    thumbnail_path: uploadInfo.thumbnailPath,
    thumbnail_size: uploadInfo.thumbnailSize,
    upload_status: "completed",
    is_starred: false,
  };
}
