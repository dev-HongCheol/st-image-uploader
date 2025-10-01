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
import { useCallback, useEffect, useState } from "react";
import ContentRenderer from "./ContentRenderer";

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

  const handleContentInit = useCallback(() => {
    setIsContentInit(true);
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
      setIsContentInit(false);

      if (file.file_type === "image" && isHEIC) {
        try {
          const convertedURL = await convertHEICUrlToJPEG(data.signedUrl, 0.9);
          setFileSignedURL(convertedURL);
          // HEIC 변환 완료 후 즉시 컨텐츠 초기화 상태를 true로 설정
          setIsContentInit(true);
        } catch (conversionError) {
          console.error("HEIC conversion failed:", conversionError);
        }
      } else {
        setFileSignedURL(data.signedUrl);
        // 일반 이미지의 경우 onLoad에서 true로 변경되어야 함
      }
    } catch (e) {
      console.error("File URL generation error:", e);
      handleError("파일을 불러오는데 실패했습니다.");
    } finally {
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
      console.log("File changed, resetting states:", file.id);
      setLastFileId(file.id);
      setIsContentInit(false);
      setFileSignedURL("");
      setError(null);
      getFileSignedURL();
    }
  }, [open, file.id, lastFileId, getFileSignedURL]);

  // Data URL을 사용하므로 Object URL 정리가 불필요

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
          {(!isContentInit || isLoading || !fileSignedURL) && (
            <Skeleton className="h-32 w-full rounded md:h-52" />
          )}
          {fileSignedURL && (
            <ContentRenderer
              file={file}
              fileSignedURL={fileSignedURL}
              isContentInit={isContentInit}
              isLoading={isLoading}
              error={error}
              onContentInit={handleContentInit}
              onError={handleError}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContentDetailDialog;
