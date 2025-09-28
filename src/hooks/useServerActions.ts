"use client";

import { createFolderAction, deleteFolderAction, updateFolderAction } from "@/app/(auth)/actions";
import { useTransition } from "react";
import { toast } from "sonner";

/**
 * 폴더 생성 Server Action 훅
 */
export function useCreateFolderAction() {
  const [isPending, startTransition] = useTransition();

  const execute = async (params: {
    name: string;
    path?: string;
    folderColor?: string;
    description?: string;
  }) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await createFolderAction(params);
          
          if (result.success) {
            toast.success("폴더가 성공적으로 생성되었습니다.");
            resolve();
          } else {
            toast.error(`폴더 생성 실패: ${result.error}`);
            reject(new Error(result.error));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          toast.error(`폴더 생성 실패: ${message}`);
          reject(error);
        }
      });
    });
  };

  return {
    execute,
    isPending,
  };
}

/**
 * 폴더 수정 Server Action 훅
 */
export function useUpdateFolderAction() {
  const [isPending, startTransition] = useTransition();

  const execute = async (params: {
    folderId: string;
    name?: string;
    folderColor?: string;
    description?: string;
    currentPath?: string;
  }) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await updateFolderAction(params);
          
          if (result.success) {
            toast.success("폴더 정보가 업데이트되었습니다.");
            resolve();
          } else {
            toast.error(`폴더 수정 실패: ${result.error}`);
            reject(new Error(result.error));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          toast.error(`폴더 수정 실패: ${message}`);
          reject(error);
        }
      });
    });
  };

  return {
    execute,
    isPending,
  };
}

/**
 * 폴더 삭제 Server Action 훅
 */
export function useDeleteFolderAction() {
  const [isPending, startTransition] = useTransition();

  const execute = async (params: {
    folderId: string;
    recursive?: boolean;
    currentPath?: string;
  }) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await deleteFolderAction(params);
          
          if (result.success) {
            toast.success("폴더가 삭제되었습니다.");
            resolve();
          } else {
            toast.error(`폴더 삭제 실패: ${result.error}`);
            reject(new Error(result.error));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          toast.error(`폴더 삭제 실패: ${message}`);
          reject(error);
        }
      });
    });
  };

  return {
    execute,
    isPending,
  };
}

/**
 * 통합 폴더 작업 훅
 */
export function useFolderActions() {
  const createFolder = useCreateFolderAction();
  const updateFolder = useUpdateFolderAction();
  const deleteFolder = useDeleteFolderAction();

  return {
    createFolder,
    updateFolder,
    deleteFolder,
    isLoading: createFolder.isPending || updateFolder.isPending || deleteFolder.isPending,
  };
}