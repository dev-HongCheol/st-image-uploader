"use client";

import { Folder, UploadedFile, UploadedFileInfo } from "@/types/database";
import {
  File,
  Folder as FolderIcon,
  Image,
  NotebookText,
  Video,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getContentApi, ContentResponse } from "@/lib/api/content-api";
import Link from "next/link";

type ContentListProps = {
  initialData: {
    folders: Folder[];
    files: UploadedFileInfo[];
    currentPath: string;
    folderId: string;
  };
};

/**
 * 파일 타입에 따른 아이콘 반환
 */
const FileTypeIcon = (fileType: UploadedFile["file_type"]) => {
  switch (fileType) {
    case "document":
      return <NotebookText />;
    case "image":
      return <Image />;
    case "video":
      return <Video />;
    default:
      return <File />;
  }
};

/**
 * 콘텐츠 목록 클라이언트 컴포넌트
 * 초기 데이터를 받아서 React Query로 실시간 업데이트 처리
 */
export default function ContentList({ initialData }: ContentListProps) {
  const searchParams = useSearchParams();
  const currentPath = searchParams.get("path") || "";

  // React Query로 데이터 관리
  const { data, isLoading, error } = useQuery({
    queryKey: ["content", currentPath],
    queryFn: () => getContentApi({ path: currentPath }),
    initialData,
    staleTime: 30000, // 30초간 fresh
    refetchOnWindowFocus: false,
  });

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-red-500">
        오류가 발생했습니다: {error.message}
      </div>
    );
  }

  const { folders, files } = data;

  return (
    <div>
      {/* 현재 경로 표시 */}
      {currentPath && (
        <div className="mb-4 text-sm text-gray-500">
          현재 경로: {currentPath}
        </div>
      )}

      {/* 폴더 목록 */}
      {folders && folders.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">폴더</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
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
        {files && files.length > 0 && (
          <h2 className="mb-3 text-lg font-semibold">파일</h2>
        )}
        {isLoading ? (
          <div className="rounded-lg border p-4 text-gray-500">로딩 중...</div>
        ) : files && files.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex cursor-pointer items-center rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <div className="mr-3">{FileTypeIcon(file.file_type)}</div>
                <div className="flex-1">
                  {file.signedThumbnailUrl &&
                    file.mime_type.includes("image") && (
                      <img
                        src={file.signedThumbnailUrl}
                        alt={file.display_filename}
                        className="mb-2 h-16 w-16 rounded object-cover"
                      />
                    )}
                  <div className="font-medium">{file.display_filename}</div>
                  <div className="text-sm text-gray-500">
                    {Math.round(file.file_size / 1024).toLocaleString()}
                    KB
                  </div>
                </div>
              </div>
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
