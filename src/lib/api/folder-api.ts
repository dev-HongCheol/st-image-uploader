/**
 * 폴더 관리 API 클라이언트 함수들
 * TanStack Query와 함께 사용하기 위한 순수 API 호출 함수들
 */

import type { Folder, FolderTreeNode } from "@/types/database";
import type {
  CreateFolderRequest,
  DeleteFolderRequest,
  GetFoldersParams,
  UpdateFolderRequest,
} from "@/types/folder-api";

/**
 * API 에러 클래스
 */
export class FolderApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "FolderApiError";
  }
}

/**
 * API 응답 처리 헬퍼
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new FolderApiError(
      result.message || result.error || "API request failed",
      response.status,
      result.code,
    );
  }

  return result.data;
}

/**
 * 새로운 폴더 생성
 */
export async function createFolderApi(
  data: CreateFolderRequest,
): Promise<Folder> {
  const response = await fetch("/api/folders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleApiResponse<Folder>(response);
}

/**
 * 폴더 목록 조회
 */
export async function getFoldersApi(
  params: GetFoldersParams = {},
): Promise<FolderTreeNode[]> {
  const url = new URL("/api/folders", window.location.origin);
  if (params.parentId) {
    url.searchParams.set("parentId", params.parentId);
  }

  const response = await fetch(url.toString());
  return handleApiResponse<FolderTreeNode[]>(response);
}

/**
 * 폴더 정보 수정
 */
export async function updateFolderApi(
  data: UpdateFolderRequest,
): Promise<Folder> {
  const response = await fetch("/api/folders", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleApiResponse<Folder>(response);
}

/**
 * 폴더 삭제
 */
export async function deleteFolderApi(
  data: DeleteFolderRequest,
): Promise<void> {
  const response = await fetch("/api/folders", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  await handleApiResponse<void>(response);
}
