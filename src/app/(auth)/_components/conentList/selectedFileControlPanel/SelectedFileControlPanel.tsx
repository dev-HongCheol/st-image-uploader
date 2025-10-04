"use client";

import { Button } from "@/components/ui/button";
import { ArrowDownUp, Trash } from "lucide-react";
import FileMoveDialog from "./FileMoveDialog";
import { useCallback, useState } from "react";
import { UploadedFile } from "@/types/database";
import { toast } from "sonner";

type Props = {
  selectedFiles: UploadedFile[];
  currentPath: string;
  onMoveComplete?: () => void;
};
const SelectedFileControlPanel = ({
  selectedFiles,
  currentPath,
  onMoveComplete,
}: Props) => {
  const [openDialog, setOpenDialog] = useState(false);

  const handleCloseDialog = useCallback(
    () => setOpenDialog(false),
    [openDialog],
  );

  /**
   * 파일 삭제 핸들러
   *
   * 안전한 삭제 순서:
   * 1. 사용자 확인
   * 2. API 호출로 DB 트랜잭션 처리
   * 3. UI 새로고침
   */
  const handleDeleteFiles = async () => {
    const isDelete = confirm(
      `선택한 파일 ${selectedFiles.length}개를 삭제하시겠습니까?\n삭제된 파일은 복구할 수 없습니다.`,
    );
    if (!isDelete) return;

    try {
      const fileIds = selectedFiles.map((file) => file.id);

      // API 호출로 안전한 트랜잭션 처리
      const response = await fetch("/api/files/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "파일 삭제 실패");
      }

      // 성공 시 UI 새로고침
      toast.success(result.message || "파일이 삭제되었습니다.");
      onMoveComplete?.(); // 파일 목록 새로고침
    } catch (error) {
      console.error("파일 삭제 중 오류:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "파일 삭제 중 오류가 발생했습니다.",
      );
    }
  };
  return (
    <div
      className={`sticky top-7 mb-2 flex items-center justify-between rounded bg-gray-200 p-2 text-sm transition-[visible] dark:bg-gray-800 ${selectedFiles.length > 0 ? "visible" : "invisible"}`}
    >
      <p>선택된 파일 수 : {selectedFiles.length}</p>
      <div className="flex gap-1">
        <Button
          size="icon"
          className="size-6 hover:cursor-pointer"
          variant={"outline"}
          onClick={() => setOpenDialog(true)}
        >
          <ArrowDownUp />
        </Button>
        <Button
          size="icon"
          className="size-6 hover:cursor-pointer"
          variant={"outline"}
          onClick={handleDeleteFiles}
        >
          <Trash />
        </Button>
      </div>

      <FileMoveDialog
        open={openDialog}
        onClose={handleCloseDialog}
        currentPath={currentPath}
        selectedFiles={selectedFiles}
        onMoveComplete={onMoveComplete}
      />
    </div>
  );
};

export default SelectedFileControlPanel;
