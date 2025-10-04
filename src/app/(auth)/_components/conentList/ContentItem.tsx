"use client";

import { UploadedFile, UploadedFileInfo } from "@/types/database";
import { File, Image, NotebookText, Video } from "lucide-react";
import { MouseEvent } from "react";
type props = {
  file: UploadedFileInfo;
  isSelected: boolean;
  index: number;
  handlePreviewFile: (file: UploadedFile) => void;
  handleFileSelect: (
    event: MouseEvent<HTMLDivElement>,
    selectFileIndex: number,
  ) => void;
};

const ContentItem = ({
  file,
  isSelected,
  index,
  handlePreviewFile,
  handleFileSelect,
}: props) => {
  /**
   * 파일 타입에 따른 아이콘 반환
   */
  const FileTypeIcon = (
    fileType: UploadedFile["file_type"],
    isTitle = true,
  ) => {
    const className = isTitle ? "size-4" : "stroke-1 opacity-80";
    const size = isTitle ? 16 : 96; // 24px -> 96px (6rem)
    const props = {
      className: className,
      width: size,
      height: size,
    };

    switch (fileType) {
      case "document":
        return <NotebookText {...props} />;
      case "image":
        return <Image {...props} />;
      case "video":
        return <Video {...props} />;
      default:
        return <File {...props} />;
    }
  };

  const handleClickContent = (
    event: MouseEvent<HTMLDivElement>,
    file: UploadedFile,
  ) => {
    event.stopPropagation();
    const { ctrlKey, shiftKey } = event;
    if (ctrlKey || shiftKey) return;
    handlePreviewFile(file);
  };

  return (
    <div
      onClick={(event: MouseEvent<HTMLDivElement>) =>
        handleFileSelect(event, index)
      }
      className={`flex flex-col gap-0.5 rounded-lg border p-1.5 transition-colors hover:border-dashed md:gap-2 md:p-4 ${isSelected ? "bg-stone-700" : "bg-inherit"}`}
    >
      {/* title section */}
      <div className="flex items-center gap-x-1.5">
        <p>{FileTypeIcon(file.file_type)}</p>
        <p className="flex-1 truncate font-medium">{file.display_filename}</p>
      </div>

      {file.signedThumbnailUrl && file.mime_type.includes("image") ? (
        <div
          onClick={(event) => handleClickContent(event, file)}
          className="flex h-32 justify-center sm:h-44 md:h-52"
        >
          <img
            src={file.signedThumbnailUrl}
            alt={file.display_filename}
            className={`h-full rounded object-fill`}
          />
        </div>
      ) : (
        <div
          onClick={(event) => handleClickContent(event, file)}
          className="flex flex-1 items-center justify-center"
        >
          {FileTypeIcon(file.file_type, false)}
        </div>
      )}
    </div>
  );
};

export default ContentItem;
