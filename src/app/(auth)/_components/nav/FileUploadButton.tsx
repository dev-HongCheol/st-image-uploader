"use client";

import { UploadResult } from "@/app/api/upload/route";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { CloudUpload } from "lucide-react";
import { useParams } from "next/navigation";
import { ChangeEvent, MouseEvent, useCallback, useRef, useState } from "react";
import { toast } from "sonner";

const batchSize = 10;

const FileUploadButton = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { path } = useParams();

  const handleClickFileBtn = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
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

    fileUpload([...files]);
  };

  const fileUpload = async (files: File[]) => {
    if (isUploading || files.length === 0) return;

    setIsUploading(true);

    // TODO: 동기화가 없어..문제없을까? 테스트 필요
    for (let i = 0; i < files.length; i += batchSize) {
      const uploadBatchFiles = files.slice(i, i + batchSize);

      try {
        const formData = new FormData();

        uploadBatchFiles.forEach((file) => {
          formData.append("files", file);
        });
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.results) {
          // 각 파일의 업로드 결과 처리
          result.results.forEach((fileResult: UploadResult) => {
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

          queryClient.invalidateQueries({ queryKey: ["content", path ?? ""] });
          new Promise((resolve) => setTimeout(resolve, 1000));
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
