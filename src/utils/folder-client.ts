/**
 * TanStack Query를 사용한 폴더 관리 훅들
 * 클라이언트 컴포넌트에서 사용하는 React Query 기반 데이터 페칭 및 뮤테이션 훅들
 */

import {
  createFolderApi,
  deleteFolderApi,
  FolderApiError,
  getFoldersApi,
  updateFolderApi,
} from "@/lib/api/folder-api";
import type { GetFoldersParams } from "@/types/folder-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Query Keys - 캐시 키 관리
 */
export const folderKeys = {
  all: ["folders"] as const,
  lists: () => [...folderKeys.all, "list"] as const,
  list: (parentId?: string) => [...folderKeys.lists(), { parentId }] as const,
  detail: (id: string) => [...folderKeys.all, "detail", id] as const,
};

/**
 * 폴더 목록 조회 쿼리 훅
 */
export function useFoldersQuery(params: GetFoldersParams = {}) {
  return useQuery({
    queryKey: folderKeys.list(params.parentId),
    queryFn: () => getFoldersApi(params),
    staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
    retry: (failureCount, error) => {
      if (error instanceof FolderApiError && error.status === 401) {
        return false; // 인증 오류는 재시도하지 않음
      }
      return failureCount < 3;
    },
  });
}

/**
 * 폴더 생성 뮤테이션 훅
 */
export function useCreateFolderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFolderApi,
    onSuccess: (newFolder) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });

      toast.success("폴더가 성공적으로 생성되었습니다.");
    },
    onError: (error: FolderApiError) => {
      toast.error(`폴더 생성 실패: ${error.message}`);
    },
  });
}

/**
 * 폴더 수정 뮤테이션 훅
 */
export function useUpdateFolderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFolderApi,
    onSuccess: (updatedFolder) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: folderKeys.detail(updatedFolder.id),
      });

      toast.success("폴더 정보가 업데이트되었습니다.");
    },
    onError: (error: FolderApiError) => {
      toast.error(`폴더 수정 실패: ${error.message}`);
    },
  });
}

/**
 * 폴더 삭제 뮤테이션 훅
 */
export function useDeleteFolderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFolderApi,
    onSuccess: () => {
      // 모든 폴더 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: folderKeys.all });

      toast.success("폴더가 삭제되었습니다.");
    },
    onError: (error: FolderApiError) => {
      toast.error(`폴더 삭제 실패: ${error.message}`);
    },
  });
}

/**
 * 폴더 작업 통합 훅
 * 모든 폴더 관련 작업을 한 번에 제공
 */
export function useFolderOperations() {
  const createMutation = useCreateFolderMutation();
  const updateMutation = useUpdateFolderMutation();
  const deleteMutation = useDeleteFolderMutation();

  return {
    // 뮤테이션 객체들
    createFolder: createMutation,
    updateFolder: updateMutation,
    deleteFolder: deleteMutation,

    // 편의 함수들
    createFolderAsync: createMutation.mutateAsync,
    updateFolderAsync: updateMutation.mutateAsync,
    deleteFolderAsync: deleteMutation.mutateAsync,

    // 로딩 상태
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // 어떤 작업이든 진행 중인지
    isLoading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
}
