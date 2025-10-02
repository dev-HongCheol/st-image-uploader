/**
 * 파일 관리 API 클라이언트 함수들
 * TanStack Query와 함께 사용하기 위한 순수 API 호출 함수들
 */

import type { UploadedFile } from "@/types/database";

/**
 * API 에러 클래스
 */
export class FileApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "FileApiError";
  }
}

/**
 * API 응답 처리 헬퍼
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new FileApiError(
      result.message || result.error || "API request failed",
      response.status,
      result.code,
    );
  }

  return result.data;
}

/**
 * 파일 이동 요청 타입
 */
export interface MoveFilesRequest {
  fileIds: string[];
  targetPath: string;
}

/**
 * 파일 이동 응답 타입
 */
export interface MoveFilesResponse {
  movedFiles: UploadedFile[];
  targetFolderId: string;
}

/**
 * 파일들을 다른 폴더로 이동
 */
export async function moveFilesApi(
  data: MoveFilesRequest,
): Promise<MoveFilesResponse> {
  const response = await fetch("/api/files/move", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleApiResponse<MoveFilesResponse>(response);
}

/**
 * 파일 삭제 요청 타입
 */
export interface DeleteFilesRequest {
  fileIds: string[];
}

/**
 * 여러 파일 삭제
 */
export async function deleteFilesApi(
  data: DeleteFilesRequest,
): Promise<void> {
  const response = await fetch("/api/files", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  await handleApiResponse<void>(response);
}