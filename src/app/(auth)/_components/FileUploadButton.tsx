"use client";

import { Button } from "@/components/ui/button";
import { BUCKET_NAMES, FUNCTION_NAMES } from "@/constants/common";
import { clientSupabase } from "@/utils/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { CloudUpload } from "lucide-react";
import { ChangeEvent, MouseEvent, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import heic2any from "heic2any";

const convertHeicToJpeg = async (imageFile: File) => {
  return await heic2any({
    blob: imageFile,
    toType: "image/jpeg",
    quality: 0.8,
  });
};

type StorageUploadResponse = Awaited<
  ReturnType<SupabaseClient["storage"]["from"]>["upload"]
>;

const FileUploadButton = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // 전달받은 파일의 이름에서 확장자를 기준으로 썸네일 생성.
  const processImageThumbnail = (filePath: string) => {
    // 2. 확장자 확인 후 썸네일 생성 여부 결정
    const fileExtension = filePath.split(".").pop()?.toLowerCase() || "";
    // 가벼운 포맷은 ImageScript
    if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
      return supabase.functions.invoke<StorageUploadResponse>(
        FUNCTION_NAMES.GENERATE_THUMBNAIL_JS,
        {
          method: "POST",
          body: {
            imagePath: filePath,
          },
        },
      );
    }

    // 복잡한 포맷만 ImageMagick
    if (["heic", "webp", "raw"].includes(fileExtension)) {
      return supabase.functions.invoke<StorageUploadResponse>(
        FUNCTION_NAMES.GENERATE_THUMBNAIL_MAGICK,
        {
          method: "POST",
          body: {
            imagePath: filePath,
          },
        },
      );
    }

    // 나머지는 원본 사용
    // TODO:
    return "NONE";
  };

  const fileUpload = async (files: File[], batchSize = 5) => {
    const user = (await supabase.auth.getUser()).data.user;
    const userId = user?.id;

    console.log(`총 ${files.length}개 파일을 ${batchSize}개씩 나누어 업로드`);

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      console.log(
        `배치 ${Math.floor(i / batchSize) + 1}: ${batch.length}개 파일 동시 업로드`,
      );

      // 현재 배치의 파일들을 Promise.all로 동시 업로드
      const batchPromises = batch.map(async (file) => {
        const resThumbNail = await convertHeicToJpeg(file);
        console.log("🚀 ~ fileUpload ~ resThumbNail_", resThumbNail);
        const thumbnail = Array.isArray(resThumbNail)
          ? resThumbNail[0]
          : resThumbNail;
        const upload = await supabase.storage
          .from(BUCKET_NAMES.THUMBNAILS)
          .upload(`${userId}/${file.name}`, await thumbnail.arrayBuffer(), {
            cacheControl: "3600",
            contentType: thumbnail.type,
          });
        console.log("🚀 ~ fileUpload ~ upload_", upload);

        return supabase.storage
          .from(BUCKET_NAMES.ORIGINALS)
          .upload(`${userId}/${file.name}`, file, {
            cacheControl: "3600",
            contentType: file.type,
          });
      });

      const uploadRes = await Promise.all(batchPromises);

      uploadRes.map(async (res) => {
        if (!res.error) {
          console.log("🚀 ~ fileUpload ~ res.data_", res.data);

          const thumbnailRes = await processImageThumbnail(res.data.fullPath);

          if (thumbnailRes)
            toast.success(`${files[i].name} upload success`, {
              closeButton: true,
            });
        } else {
          toast.error(`${files[i].name} upload failed`, {
            duration: Infinity,
            closeButton: true,
            description: res.error.message,
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
