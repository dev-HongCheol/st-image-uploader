"use client";

import { Button } from "@/components/ui/button";
import { ArrowDownUp, Trash } from "lucide-react";
import FileMoveDialog from "./FileMoveDialog";
import { useCallback, useState } from "react";
import { UploadedFile } from "@/types/database";

type Props = {
  selectedFiles: UploadedFile[];
  currentPath: string;
  onMoveComplete?: () => void;
};
const SelectedFileControlPanel = ({ selectedFiles, currentPath, onMoveComplete }: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const handleCloseDialog = useCallback(
    () => setOpenDialog(false),
    [openDialog],
  );
  return (
    <div
      className={`mb-2 flex items-center justify-between rounded bg-gray-200 p-2 text-sm transition-[visible] dark:bg-gray-800 ${selectedFiles.length > 0 ? "visible" : "invisible"}`}
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
