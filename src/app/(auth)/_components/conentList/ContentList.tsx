"use client";

import { getContentApi } from "@/lib/api/content-api";
import { Folder, UploadedFile, UploadedFileInfo } from "@/types/database";
import { useQuery } from "@tanstack/react-query";
import { Folder as FolderIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import ContentDetailDialog from "./ContentDetailDialog";
import ContentItem from "./ContentItem";
import SelectedFileControlPanel from "./selectedFileControlPanel/SelectedFileControlPanel";

type ContentListProps = {
  initialData: {
    folders: Folder[];
    files: UploadedFileInfo[];
    currentPath: string;
    folderId: string;
  };
};

/**
 * 콘텐츠 목록 클라이언트 컴포넌트
 * 초기 데이터를 받아서 React Query로 실시간 업데이트 처리
 */
export default function ContentList({ initialData }: ContentListProps) {
  const searchParams = useSearchParams();
  const currentPath = searchParams.get("path") || "";
  /** 미리보기 파일 */
  const [previewFile, setPreviewFile] = useState<UploadedFile>();
  /** 선택된 파일들 */
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);

  const handlePreviewFile = useCallback(
    (file: UploadedFile | undefined) => setPreviewFile(file),
    [],
  );

  // 폴더를 이동하면 선택된 파일 초기화
  useEffect(() => {
    setSelectedFileIds([]);
  }, [currentPath]);

  // React Query로 데이터 관리
  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ["content", currentPath],
    queryFn: () => getContentApi({ path: currentPath }),
    initialData,
    staleTime: 30000, // 30초간 fresh
    refetchOnWindowFocus: false,
  });

  const memoizedFolders = useMemo(() => data?.folders, [data?.folders]);
  const memoizedFiles = useMemo(() => data?.files, [data?.files]);

  const memoizedSelectedFiles = useMemo(() => {
    return data.files.filter((file, index) => selectedFileIds.includes(index));
  }, [selectedFileIds, data.files]);

  const handleMoveComplete = useCallback(() => {
    // 파일 이동 완료 후 선택 상태 초기화
    setSelectedFileIds([]);
    refetch();
  }, []);

  /**
   * 파일 선택 핸들러
   * Ctrl: 다중 선택/해제, Shift: 범위 선택
   */
  const handleFileSelect = useCallback(
    (event: MouseEvent<HTMLDivElement>, fileIndex: number) => {
      event.preventDefault();
      event.stopPropagation();

      if (!data?.files || fileIndex < 0 || fileIndex >= data.files.length) {
        return;
      }

      const { ctrlKey, shiftKey } = event;
      const isCurrentlySelected = selectedFileIds.includes(fileIndex);

      // Ctrl + Shift 조합은 무시
      if (ctrlKey && shiftKey) return;

      // 일반 클릭: 단일 선택
      if (!ctrlKey && !shiftKey) {
        setSelectedFileIds(isCurrentlySelected ? [] : [fileIndex]);
        return;
      }

      // Ctrl 클릭: 토글 선택
      if (ctrlKey) {
        const newSelection = isCurrentlySelected
          ? selectedFileIds.filter((id) => id !== fileIndex)
          : [...selectedFileIds, fileIndex].sort((a, b) => a - b);

        setSelectedFileIds(newSelection);
        return;
      }

      // Shift 클릭: 범위 선택
      if (shiftKey && selectedFileIds.length > 0) {
        const lastSelected = selectedFileIds[selectedFileIds.length - 1];
        const start = Math.min(lastSelected, fileIndex);
        const end = Math.max(lastSelected, fileIndex);

        const rangeSelection = Array.from(
          { length: end - start + 1 },
          (_, i) => start + i,
        );
        const newSelection = [
          ...new Set([...selectedFileIds, ...rangeSelection]),
        ].sort((a, b) => a - b);

        setSelectedFileIds(newSelection);
      }
    },
    [selectedFileIds, data?.files],
  );

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-red-500">
        오류가 발생했습니다: {error.message}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border p-4 text-gray-500">
        데이터를 불러오는 중...
      </div>
    );
  }

  const { folders, files } = data;

  return (
    <div>
      {/* 선택된 파일 정보 및 컨트롤러 */}
      {
        <SelectedFileControlPanel
          selectedFiles={memoizedSelectedFiles}
          currentPath={currentPath}
          onMoveComplete={handleMoveComplete}
        />
      }

      {/* 폴더 목록 */}
      {memoizedFolders?.length > 0 && (
        <div className="">
          <h2 className="mb-3 text-lg font-semibold">폴더</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {memoizedFolders.map((folder) => (
              <Link
                key={folder.id}
                href={`/?path=${encodeURIComponent(
                  currentPath
                    ? `${currentPath}/${folder.name}`
                    : `/${folder.name}`,
                )}`}
                className="flex cursor-pointer items-center rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
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
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 파일 목록 */}
      <div className="mb-8">
        {previewFile && (
          <ContentDetailDialog
            open={!!previewFile}
            file={previewFile}
            onClose={handlePreviewFile}
          />
        )}

        {memoizedFiles?.length > 0 && (
          <h2 className="mb-3 text-lg font-semibold">파일</h2>
        )}

        {isLoading ? (
          <div className="rounded-lg border p-4 text-gray-500">로딩 중...</div>
        ) : memoizedFiles?.length ? (
          <div className="grid grid-cols-2 gap-3 select-none md:grid-cols-3 2xl:grid-cols-4">
            {memoizedFiles.map((file, index) => (
              <ContentItem
                isSelected={selectedFileIds.includes(index)}
                key={file.id}
                file={file}
                index={index}
                handlePreviewFile={handlePreviewFile}
                handleFileSelect={handleFileSelect}
              />
            ))}
          </div>
        ) : (
          !folders?.length && (
            <div className="rounded-lg border p-4 text-gray-500">
              폴더나 파일이 없습니다.
            </div>
          )
        )}
      </div>
    </div>
  );
}
