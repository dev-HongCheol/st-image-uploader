"use client";

import { Button } from "@/components/ui/button";
import { BUCKET_NAMES } from "@/constants/common";
import { clientSupabase } from "@/utils/supabase/client";
import { CloudUpload } from "lucide-react";
import { ChangeEvent, MouseEvent, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import useThumbnail from "./useThumbnail";

const FileUploadButton = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => clientSupabase(), []);
  const { getImageThumbnailType, createThumbnail } = useThumbnail();

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

  const fileUpload = async (files: File[], batchSize = 5) => {
    const user = (await supabase.auth.getUser()).data.user;
    const userId = user?.id || "";

    console.log(`총 ${files.length}개 파일을 ${batchSize}개씩 나누어 업로드`);

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      console.log(
        `배치 ${Math.floor(i / batchSize) + 1}: ${batch.length}개 파일 동시 업로드`,
      );

      // 현재 배치의 파일들을 Promise.all로 동시 업로드
      const batchPromises = batch.map(async (file) => {
        console.log("🚀 ~ fileUpload ~ file:", file);
        let thumbnail = null;

        // 확장자를 확인 후 썸네일 생성
        const imageThumbnailType = getImageThumbnailType(file.name);
        if (imageThumbnailType !== "none")
          thumbnail = await createThumbnail(imageThumbnailType, file);
        console.log("🚀 ~ fileUpload ~ thumbnail_", thumbnail);

        // 썸네일을 샏성해야하는 확장자이지만 정상적으로 생성이 안된 경우 리턴
        if (imageThumbnailType !== "none" && !thumbnail) {
          throw new Error(`${file.name} Thumbnail create error`);
        }

        if (imageThumbnailType !== "none" && thumbnail) {
          const thumbnailImageFilename = file.name.replace(/\.[^/.]+$/, "");
          const thumbnailUploadRes = await supabase.storage
            .from(BUCKET_NAMES.THUMBNAILS)
            .upload(
              `${userId}/${thumbnailImageFilename}.jpeg`,
              await thumbnail.arrayBuffer(),
              {
                cacheControl: "3600",
                contentType: "image/jpeg",
              },
            );

          // 썸네일 업로드 실패한 경우
          if (thumbnailUploadRes.error) {
            toast.error(`${files[i].name} thumbnail upload failed`, {
              duration: Infinity,
              closeButton: true,
              description: thumbnailUploadRes.error.message,
            });
            throw new Error(`${file.name} Thumbnail upload error`);
          }
        }

        // 원본 이미지 업로드
        return supabase.storage
          .from(BUCKET_NAMES.ORIGINALS)
          .upload(`${userId}/${file.name}`, file, {
            cacheControl: "3600",
            contentType: file.type,
          });
      });

      const uploadRes = await Promise.all(batchPromises);

      uploadRes.map(async (res) => {
        if (res && !res.error) {
          toast.success(`${files[i].name} upload success`, {
            closeButton: true,
          });
        } else {
          toast.error(`${files[i].name} upload failed`, {
            duration: Infinity,
            closeButton: true,
            description: res?.error.message,
          });
        }
      });

      console.log("🚀 ~ fileUpload ~ uploadRes_", uploadRes);

      // 다음 배치까지 0.5초 대기 (마지막 배치 제외)
      if (i + batchSize < files.length) {
        console.log("0.5초 대기...");
        await new Promise((resolve) => setTimeout(resolve, 500));
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
      <Button variant="outline" title="upload" onClick={handleClickFileBtn}>
        <CloudUpload />
        Upload
      </Button>
    </form>
  );
};

export default FileUploadButton;
