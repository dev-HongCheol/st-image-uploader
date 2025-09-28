/**
 * 폴더 컨텐츠(폴더+파일) 조회 API 클라이언트 함수들
 */

import type { Folder, UploadedFileInfo } from "@/types/database";

/**
 * API 에러 클래스
 */
export class ContentApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ContentApiError";
  }
}

/**
 * API 응답 처리 헬퍼
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new ContentApiError(
      result.message || result.error || "API request failed",
      response.status,
      result.code,
    );
  }

  return result.data;
}

/**
 * 폴더 컨텐츠 조회 요청 타입
 */
export interface GetContentRequest {
  path?: string;
  limit?: number;
  offset?: number;
  sortBy?: "created_at" | "name" | "size";
  sortOrder?: "asc" | "desc";
  fileType?: "image" | "video" | "document" | "other";
}

/**
 * 폴더 컨텐츠 응답 타입
 */
export interface ContentResponse {
  folders: Folder[];
  files: UploadedFileInfo[];
  currentPath: string;
  folderId: string;
}

/**
 * 폴더 컨텐츠 조회 (폴더 + 파일)
 */
export async function getContentApi(
  params: GetContentRequest = {}
): Promise<ContentResponse> {
  const url = new URL("/api/content", window.location.origin);
  
  if (params.path) url.searchParams.set("path", params.path);
  if (params.limit) url.searchParams.set("limit", params.limit.toString());
  if (params.offset) url.searchParams.set("offset", params.offset.toString());
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);
  if (params.fileType) url.searchParams.set("fileType", params.fileType);

  const response = await fetch(url.toString());
  return handleApiResponse<ContentResponse>(response);
}