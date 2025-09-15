"use client";

import { FolderRes } from "@/app/api/upload/route";
import { Button } from "@/components/ui/button";
import { CloudUpload } from "lucide-react";
import {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import useThumbnail from "./useThumbnail";
import { clientSupabase } from "@/utils/supabase/client";
import { BUCKET_NAMES } from "@/constants/common";

const batchSize = 10;

const FileUploadButton = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { createThumbnail, getImageThumbnailType } = useThumbnail();
  const supabase = useMemo(() => clientSupabase(), []);

  const handleClickFileBtn = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      console.log("🚀 ~ handleClickFileBtn ~ event_", event);
      event.preventDefault();
      const fileInput = fileInputRef.current;
      if (!fileInput) return;

      fileInput.click();
    },
    [],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files?.length === 0) return;
    console.log("🚀 ~ handleFileChange ~ files_", files);

    fileUpload([...files]);
  };

  const fileUpload = async (files: File[]) => {
    if (isUploading || files.length === 0) return;
    const user = (await supabase.auth.getUser()).data.user;
    const userId = user?.id || "";

    setIsUploading(true);

    for (let i = 0; i < batchSize; i += batchSize) {
      const uploadBatchFiles = files.slice(i, i + batchSize);
      console.log(
        `🚀 ~ ${Math.floor(files.length / batchSize)}번째 업로드 중 ${i % batchSize}번째 파일 업로드 중`,
      );
      try {
        const formData = new FormData();

        // 모든 파일을 FormData에 추가하고 썸네일 처리 완료 대기
        const thumbnailPromises = uploadBatchFiles.map(async (file) => {
          formData.append("files", file);

          let thumbnail = null;
          let thumbnailUploadPath = null;

          // 확장자를 확인 후 썸네일 생성
          const imageThumbnailType = getImageThumbnailType(file.name);
          if (imageThumbnailType !== "none")
            thumbnail = await createThumbnail(imageThumbnailType, file);

          // 썸네일을 성해야하는 확장자이지만 정상적으로 생성이 안된 경우 리턴
          if (imageThumbnailType !== "none" && !thumbnail) {
            return {
              success: false,
              error: `${file.name} Thumbnail create error`,
            };
          }

          // 썸네일을 정상적으로 생성한 경우 업르도
          if (imageThumbnailType !== "none" && thumbnail) {
            const thumbnailImageFilename = file.name.replace(/\.[^/.]+$/, "");
            thumbnailUploadPath = `${userId}/${thumbnailImageFilename}.jpeg`;
            const thumbnailUploadRes = await supabase.storage
              .from(BUCKET_NAMES.THUMBNAILS)
              .upload(thumbnailUploadPath, await thumbnail.arrayBuffer(), {
                cacheControl: "3600",
                contentType: "image/jpeg",
              });

            // 썸네일 업로드 실패한 경우
            if (thumbnailUploadRes.error) {
              console.log(
                "🚀 ~ fileUpload ~ error_",
                `${file.name} thumbnail upload failed`,
              );

              return {
                success: false,
                error: `${file.name} thumbnail upload failed`,
                thumbnailPath: thumbnailUploadPath,
              };
            }
          }

          return { success: true, thumbnailPath: thumbnailUploadPath };
        });

        const thumbnailResults = await Promise.all(thumbnailPromises);

        // 썸네일 처리 실패가 있는지 확인
        const failedThumbnail = thumbnailResults.find(
          (result) => !result.success,
        );
        if (failedThumbnail) {
          // 업로드된 썸네일들 삭제
          const uploadedThumbnails = thumbnailResults
            .filter((result) => result.success && result.thumbnailPath)
            .map((result) => result.thumbnailPath) as string[];

          if (uploadedThumbnails.length > 0) {
            console.log(
              "🚀 ~ fileUpload ~ 썸네일 로직 실패로 기존 업로드 된 썸네일 삭제",
              uploadedThumbnails,
            );

            await supabase.storage
              .from(BUCKET_NAMES.THUMBNAILS)
              .remove(uploadedThumbnails);
          }

          toast.error("썸네일 업로드 실패", {
            duration: Infinity,
            closeButton: true,
          });

          return;
        }
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (response.ok && result.results) {
          // 각 파일의 업로드 결과 처리
          result.results.forEach((fileResult: FolderRes) => {
            if ("error" in fileResult) {
              toast.error(`${fileResult.fileName} upload failed`, {
                duration: Infinity,
                closeButton: true,
                description: fileResult.error,
              });
            } else {
              toast.success(`${fileResult.fileName} upload success`, {
                closeButton: true,
              });
            }
          });

          new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          throw new Error(result.error || "Upload failed");
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Upload failed", {
          duration: Infinity,
          closeButton: true,
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsUploading(false);
        // 파일 입력 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  return (
    <form>
      <input
        type="file"
        hidden
        name="file"
        multiple
        accept="image/*,video/*"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        title="upload"
        onClick={handleClickFileBtn}
        disabled={isUploading}
      >
        <CloudUpload />
        {isUploading ? "Uploading..." : "Upload"}
      </Button>
    </form>
  );
};

export default FileUploadButton;
