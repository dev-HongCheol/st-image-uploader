"use client";

import { UploadedFile, UploadedFileInfo } from "@/types/database";
import { File, Image, NotebookText, Video } from "lucide-react";
type props = {
  file: UploadedFileInfo;
  handleChangeFile: (file: UploadedFile) => void;
};

const ContentItem = ({ file, handleChangeFile }: props) => {
  /**
   * 파일 타입에 따른 아이콘 반환
   */
  const FileTypeIcon = (
    fileType: UploadedFile["file_type"],
    isTitle = true,
  ) => {
    const className = isTitle ? "size-4" : "stroke-1 opacity-80";
    const size = isTitle ? 16 : 96; // 24px -> 96px (6rem)

    switch (fileType) {
      case "document":
        return (
          <NotebookText className={className} width={size} height={size} />
        );
      case "image":
        return <Image className={className} width={size} height={size} />;
      case "video":
        return <Video className={className} width={size} height={size} />;
      default:
        return <File className={className} width={size} height={size} />;
    }
  };

  return (
    <div
      onClick={() => handleChangeFile(file)}
      className="flex cursor-pointer flex-col gap-0.5 rounded-lg border p-1.5 transition-colors hover:bg-gray-50 md:gap-2 md:p-4 dark:hover:bg-gray-900"
    >
      {/* title section */}
      <div className="flex items-center gap-x-1.5">
        <p>{FileTypeIcon(file.file_type)}</p>
        <p className="flex-1 truncate font-medium">{file.display_filename}</p>
      </div>

      {file.signedThumbnailUrl && file.mime_type.includes("image") ? (
        <div className="flex h-32 justify-center sm:h-44 md:h-52">
          <img
            src={file.signedThumbnailUrl}
            alt={file.display_filename}
            className={`h-full rounded object-fill`}
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          {FileTypeIcon(file.file_type, false)}
        </div>
      )}
    </div>
  );
};

export default ContentItem;
