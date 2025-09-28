/**
 * 폴더 API 관련 타입 정의
 */

import type { Folder, FolderTreeNode } from "@/types/database";

/**
 * API 응답 타입
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 폴더 생성 요청 타입
 */
export interface CreateFolderRequest {
  name: string;
  path?: string; // parentFolderId 대신 path 사용
  folderColor?: string;
  description?: string;
}

/**
 * 폴더 수정 요청 타입
 */
export interface UpdateFolderRequest {
  folderId: string;
  name?: string;
  folderColor?: string;
  description?: string;
}

/**
 * 폴더 삭제 요청 타입
 */
export interface DeleteFolderRequest {
  folderId: string;
  recursive?: boolean;
}

/**
 * 폴더 목록 조회 파라미터
 */
export interface GetFoldersParams {
  parentId?: string;
}

/**
 * 폴더 API 응답 타입들
 */
export type CreateFolderResponse = ApiResponse<Folder>;
export type GetFoldersResponse = ApiResponse<FolderTreeNode[]>;
export type UpdateFolderResponse = ApiResponse<Folder>;
export type DeleteFolderResponse = ApiResponse<void>;