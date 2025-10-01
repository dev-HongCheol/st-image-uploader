"use client";

import { UploadedFile } from "@/types/database";

type ContentRendererProps = {
  file: UploadedFile;
  fileSignedURL: string;
  isContentInit: boolean;
  isLoading: boolean;
  error: string | null;
  onContentInit: () => void;
  onError: (message: string) => void;
};

/**
 * 에러 상태 컴포넌트
 */
const ErrorState = ({ message }: { message: string }) => (
  <div className="flex h-32 items-center justify-center rounded border border-red-200 bg-red-50 text-red-600">
    {message}
  </div>
);

/**
 * 빈 상태 컴포넌트
 */
const EmptyState = () => (
  <div className="flex h-32 items-center justify-center rounded border text-gray-500">
    파일을 불러올 수 없습니다.
  </div>
);

/**
 * 지원하지 않는 파일 타입 컴포넌트
 */
const UnsupportedFileType = () => (
  <div className="flex h-32 items-center justify-center rounded border text-gray-500">
    미리보기를 지원하지 않는 파일 형식입니다.
  </div>
);

/**
 * 이미지 컴포넌트
 */
const ImageContent = ({
  src,
  alt,
  isContentInit,
  onContentInit,
  onError,
}: {
  src: string;
  alt: string;
  isContentInit: boolean;
  onContentInit: () => void;
  onError: (message: string) => void;
}) => (
  <img
    src={src}
    alt={alt}
    onLoad={onContentInit}
    onError={() => onError("이미지를 불러올 수 없습니다.")}
    className="max-h-[70vh] max-w-full object-contain"
    style={{
      visibility: isContentInit ? "visible" : "hidden",
    }}
  />
);

/**
 * 비디오 컴포넌트
 */
const VideoContent = ({
  src,
  isContentInit,
  onContentInit,
  onError,
}: {
  src: string;
  isContentInit: boolean;
  onContentInit: () => void;
  onError: (message: string) => void;
}) => (
  <video
    src={src}
    controls
    onCanPlay={onContentInit}
    onError={() => onError("비디오를 불러올 수 없습니다.")}
    className={`max-h-[70vh] max-w-full ${isContentInit ? "block" : "hidden"}`}
  />
);

/**
 * 파일 콘텐츠를 렌더링하는 컴포넌트
 */
const ContentRenderer = ({
  file,
  fileSignedURL,
  isContentInit,
  isLoading,
  error,
  onContentInit,
  onError,
}: ContentRendererProps) => {
  // 단일 리턴문으로 모든 조건 처리
  return (
    <>
      {error && <ErrorState message={error} />}

      {!error && !isLoading && !fileSignedURL && <EmptyState />}

      {!error && fileSignedURL && file.file_type === "image" && (
        <ImageContent
          src={fileSignedURL}
          alt={file.original_filename}
          isContentInit={isContentInit}
          onContentInit={onContentInit}
          onError={onError}
        />
      )}

      {!error && fileSignedURL && file.file_type === "video" && (
        <VideoContent
          src={fileSignedURL}
          isContentInit={isContentInit}
          onContentInit={onContentInit}
          onError={onError}
        />
      )}

      {!error && fileSignedURL &&
       file.file_type !== "image" &&
       file.file_type !== "video" && (
        <UnsupportedFileType />
      )}
    </>
  );
};

export default ContentRenderer;
