import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getContentApi } from "@/lib/api/content-api";
import { createFolderApi } from "@/lib/api/folder-api";
import { moveFilesApi } from "@/lib/api/file-api";
import { Folder, UploadedFile } from "@/types/database";
import { CreateFolderRequest } from "@/types/folder-api";
import { MoveFilesRequest } from "@/lib/api/file-api";
import { useQuery } from "@tanstack/react-query";
import {
  Folder as FolderIcon,
  ChevronRight,
  ArrowUp,
  MoveRight,
  FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type FileMoveDialogProps = {
  open: boolean;
  onClose: () => void;
  currentPath: string;
  onMoveComplete?: () => void;
  selectedFiles: UploadedFile[];
};

/**
 * 파일 이동 다이얼로그
 * 선택된 파일들을 다른 폴더로 이동하고 새 폴더를 생성할 수 있는 다이얼로그
 */
const FileMoveDialog = ({
  open,
  onClose,
  currentPath,
  onMoveComplete,
  selectedFiles,
}: FileMoveDialogProps) => {
  const [currentDialogPath, setCurrentDialogPath] = useState(currentPath);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const queryClient = useQueryClient();

  // 폴더 생성 mutation
  const createFolderMutation = useMutation({
    mutationFn: (data: CreateFolderRequest) => createFolderApi(data),
    onSuccess: (createdFolder) => {
      // 폴더 목록 새로고침
      queryClient.invalidateQueries({
        queryKey: ["folders", currentDialogPath],
      });
      // 전체 컨텐츠 목록도 새로고침 (상위 컴포넌트에서 사용하는 쿼리)
      queryClient.invalidateQueries({ queryKey: ["content"] });
      setShowCreateFolder(false);
      setNewFolderName("");

      toast.success(`폴더 '${createdFolder.name}'이 생성되었습니다.`);

      // 생성된 폴더로 자동 이동하여 즉시 선택 가능하게 함
      const newPath = currentDialogPath
        ? `${currentDialogPath}/${createdFolder.name}`
        : `/${createdFolder.name}`;
      setCurrentDialogPath(newPath);
    },
    onError: (error) => {
      console.error("폴더 생성 실패:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "폴더 생성 중 오류가 발생했습니다.",
      );
    },
  });

  // 파일 이동 mutation
  const moveFilesMutation = useMutation({
    mutationFn: (data: MoveFilesRequest) => moveFilesApi(data),
    onSuccess: (result) => {
      // 전체 컨텐츠 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["content", currentPath] });

      const targetPathDisplay = currentDialogPath || "/";
      toast.success(
        `${selectedFiles.length}개의 파일이 '${targetPathDisplay}'로 이동되었습니다.`,
      );

      onMoveComplete?.();
      onClose();
    },
    onError: (error) => {
      console.error("파일 이동 실패:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "파일 이동 중 오류가 발생했습니다.",
      );
    },
  });

  const handleMoveFiles = () => {
    if (selectedFiles.length === 0) {
      console.warn("이동할 파일이 선택되지 않았습니다.");
      return;
    }

    const fileIds = selectedFiles.map((file) => file.id);

    moveFilesMutation.mutate({
      fileIds,
      targetPath: currentDialogPath || "",
    });
  };

  const handleFolderNavigate = (folder: Folder) => {
    const newPath = currentDialogPath
      ? `${currentDialogPath}/${folder.name}`
      : `/${folder.name}`;
    setCurrentDialogPath(newPath);
  };

  const handleBackNavigation = () => {
    const pathParts = currentDialogPath.split("/").filter(Boolean);
    pathParts.pop();
    setCurrentDialogPath(pathParts.length > 0 ? `/${pathParts.join("/")}` : "");
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    createFolderMutation.mutate({
      name: newFolderName.trim(),
      path: currentDialogPath || "",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateFolder();
    } else if (e.key === "Escape") {
      setShowCreateFolder(false);
      setNewFolderName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] sm:max-w-[80%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderIcon className="h-5 w-5" />
            파일 이동 - 대상 폴더 선택
          </DialogTitle>
          <DialogDescription>
            현재 경로: {currentDialogPath || "/"}
          </DialogDescription>
        </DialogHeader>

        {/* 네비게이션 컨트롤 */}
        <div className="space-y-3 border-b pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackNavigation}
              disabled={!currentDialogPath}
              className="flex items-center gap-1"
            >
              <ArrowUp className="h-4 w-4" />
              상위 폴더
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateFolder(!showCreateFolder)}
                className="flex items-center gap-1"
              >
                <FolderPlus className="h-4 w-4" />새 폴더
              </Button>

              <Button
                onClick={handleMoveFiles}
                size="sm"
                disabled={
                  selectedFiles.length === 0 || moveFilesMutation.isPending
                }
                className="flex items-center gap-1"
              >
                <MoveRight className="h-4 w-4" />
                {moveFilesMutation.isPending
                  ? "이동 중..."
                  : `${selectedFiles.length}개 파일 이동`}
              </Button>
            </div>
          </div>

          {/* 폴더 생성 입력 */}
          {showCreateFolder && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="폴더 이름을 입력하세요"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1"
                disabled={createFolderMutation.isPending}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleCreateFolder}
                disabled={
                  !newFolderName.trim() || createFolderMutation.isPending
                }
              >
                {createFolderMutation.isPending ? "생성 중..." : "생성"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName("");
                }}
              >
                취소
              </Button>
            </div>
          )}
        </div>

        {/* 폴더 목록 */}
        <FolderNavigationList
          currentPath={currentDialogPath}
          onFolderNavigate={handleFolderNavigate}
        />
      </DialogContent>
    </Dialog>
  );
};

/**
 * 폴더 네비게이션 리스트 컴포넌트
 */
type FolderNavigationListProps = {
  currentPath: string;
  onFolderNavigate: (folder: Folder) => void;
};

const FolderNavigationList = ({
  currentPath,
  onFolderNavigate,
}: FolderNavigationListProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["folders", currentPath],
    queryFn: () => getContentApi({ path: currentPath }),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">폴더 목록을 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-red-500">
        오류가 발생했습니다: {error.message}
      </div>
    );
  }

  const folders = data?.folders || [];

  if (folders.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">하위 폴더가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => onFolderNavigate(folder)}
            className="flex cursor-pointer items-center rounded-lg border p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            <div className="mr-3">
              <FolderIcon
                className="h-5 w-5"
                style={{ color: folder.folder_color || "#3b82f6" }}
              />
            </div>
            <div className="flex-1">
              <div className="font-medium">{folder.name}</div>
              {folder.description && (
                <div className="text-sm text-gray-500">
                  {folder.description}
                </div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default FileMoveDialog;
