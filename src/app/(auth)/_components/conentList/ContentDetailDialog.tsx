"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BUCKET_NAMES } from "@/constants/common";
import { UploadedFile } from "@/types/database";
import { clientSupabase } from "@/utils/supabase/client";
import { isHEICFormat } from "@/utils/heic";
import { convertHEICUrlToJPEG } from "@/utils/client-heic";
import { memo, useCallback, useEffect, useState } from "react";

type Props = {
  open: boolean;
  file: UploadedFile;
  onClose: (file: UploadedFile | undefined) => void;
};

const ContentDetailDialog = ({ open, file, onClose }: Props) => {
  const supabase = clientSupabase();
  const [fileSignedURL, setFileSignedURL] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isContentInit, setIsContentInit] = useState(false);
  const [lastFileId, setLastFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  /**
   * 파일의 Signed URL을 가져오고, HEIC인 경우 JPEG로 변환
   */
  const getFileSignedURL = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAMES.ORIGINALS)
        .createSignedUrl(file.file_path, 60);

      if (error) {
        console.error("content detail create img url fail:", error);
        handleError("파일 URL 생성에 실패했습니다.");
        return;
      }

      // HEIC/HEIF 파일인 경우 JPEG로 변환
      const isHEIC = isHEICFormat(file.mime_type, file.original_filename);
      console.log("HEIC Detection:", {
        fileName: file.original_filename,
        mimeType: file.mime_type,
        fileType: file.file_type,
        isHEIC,
        signedUrl: data.signedUrl,
      });

      if (file.file_type === "image" && isHEIC) {
        try {
          console.log("Starting HEIC conversion...");
          const convertedURL = await convertHEICUrlToJPEG(data.signedUrl, 0.9);
          console.log("HEIC conversion successful:", convertedURL);
          setFileSignedURL(convertedURL);
          // HEIC 변환 완료 후 즉시 컨텐츠 초기화 상태를 true로 설정
          setIsContentInit(true);
        } catch (conversionError) {
          console.error("HEIC conversion failed:", conversionError);
          // 변환 실패 시 원본 URL 사용
          setFileSignedURL(data.signedUrl);
          setIsContentInit(false); // onLoad에서 true로 변경
        }
      } else {
        setFileSignedURL(data.signedUrl);
        // 일반 이미지의 경우 onLoad에서 true로 변경되어야 함
        if (file.file_type === "image") {
          setIsContentInit(false);
        } else {
          // 비디오나 기타 파일은 별도 처리
          setIsContentInit(false);
        }
      }

      setIsLoading(false);
    } catch (e) {
      console.error("File URL generation error:", e);
      handleError("파일을 불러오는데 실패했습니다.");
      setIsLoading(false);
    }
  }, [
    file.file_path,
    file.file_type,
    file.mime_type,
    file.original_filename,
    supabase.storage,
  ]);

  /**
   * 파일이 변경될 때 URL 재생성
   */
  useEffect(() => {
    if (open && file.id !== lastFileId) {
      console.log('File changed, resetting states:', file.id);
      setLastFileId(file.id);
      setIsContentInit(false);
      setFileSignedURL("");
      setError(null);
      getFileSignedURL();
    }
  }, [open, file.id, lastFileId, getFileSignedURL]);

  // Data URL을 사용하므로 Object URL 정리가 불필요

  /**
   * 컨텐츠 렌더링 (이미지/비디오/기타)
   */
  const renderContent = useCallback(() => {
    console.log('renderContent states:', { error, isLoading, isContentInit, hasURL: !!fileSignedURL });
    
    if (error) {
      return (
        <div className="flex h-32 items-center justify-center rounded border border-red-200 bg-red-50 text-red-600">
          {error}
        </div>
      );
    }

    if (isLoading || !isContentInit) {
      return <Skeleton className="h-32 w-full rounded md:h-52" />;
    }

    if (!fileSignedURL) {
      return (
        <div className="flex h-32 items-center justify-center rounded border text-gray-500">
          파일을 불러올 수 없습니다.
        </div>
      );
    }

    switch (file.file_type) {
      case "image":
        const isDataUrl = fileSignedURL.startsWith("data:");
        console.log('Rendering image element:', { isDataUrl, isContentInit, fileSignedURL: fileSignedURL.substring(0, 50) + '...' });
        return (
          <>
            <img
              src={fileSignedURL}
              alt={file.original_filename}
              onLoad={() => {
                console.log('Image onLoad event fired!');
                setIsContentInit(true);
              }}
              onError={(e) => {
                console.error('Image onError event fired:', e);
                handleError("이미지를 불러올 수 없습니다.");
              }}
              className="max-h-[70vh] max-w-full object-contain"
              style={{ 
                visibility: isContentInit ? "visible" : "hidden",
                opacity: isContentInit ? 1 : 0
              }}
            />
            {!isContentInit && (
              <Skeleton className="h-32 w-full rounded md:h-52 absolute" />
            )}
          </>
        );

      case "video":
        return (
          <video
            src={fileSignedURL}
            controls
            onCanPlay={() => setIsContentInit(true)}
            onError={() => handleError("비디오를 불러올 수 없습니다.")}
            className={`max-h-[70vh] max-w-full ${isContentInit ? "block" : "hidden"}`}
          />
        );

      default:
        return (
          <div className="flex h-32 items-center justify-center rounded border text-gray-500">
            미리보기를 지원하지 않는 파일 형식입니다.
          </div>
        );
    }
  }, [
    error,
    isLoading,
    isContentInit,
    fileSignedURL,
    file.file_type,
    file.original_filename,
    handleError,
  ]);

  return (
    <Dialog open={open} onOpenChange={() => onClose(undefined)}>
      <DialogContent className="sm:max-w-[80%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{file.original_filename}</span>
            <span className="text-sm text-gray-700 dark:text-gray-400">
              {Math.floor(file.file_size / 1024).toLocaleString()}KB
            </span>
          </DialogTitle>
          <DialogDescription>
            {isHEICFormat(file.mime_type, file.original_filename) &&
              "HEIC 이미지가 JPEG로 변환되어 표시됩니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default memo(
  ContentDetailDialog,
  (pre, next) => pre.file.id !== next.file.id,
);
