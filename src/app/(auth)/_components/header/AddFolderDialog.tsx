"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilePlus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFolderApi } from "@/lib/api/folder-api";

/**
 * 폴더 추가 다이얼로그 컴포넌트
 * @returns {JSX.Element} 폴더 추가 다이얼로그
 */
export default function AddFolderDialog() {
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const searchParams = useSearchParams();
  const path = searchParams.get("path") || "";
  const queryClient = useQueryClient();

  // Optimistic Updates를 지원하는 mutation
  const { mutateAsync, isPending } = useMutation({
    mutationFn: createFolderApi,
    onMutate: async (newFolder) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ["content", path] });

      // 이전 데이터 백업
      const previousData = queryClient.getQueryData(["content", path]);

      // Optimistic update
      queryClient.setQueryData(["content", path], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          folders: [
            ...old.folders,
            {
              id: `temp-${Date.now()}`, // 임시 ID
              name: newFolder.name,
              folder_color: newFolder.folderColor || "#3b82f6",
              description: newFolder.description || "",
              created_at: new Date().toISOString(),
              // 기타 필요한 필드들
            },
          ],
        };
      });

      return { previousData };
    },
    onError: (err, newFolder, context) => {
      // 에러 시 롤백
      if (context?.previousData) {
        queryClient.setQueryData(["content", path], context.previousData);
      }
      toast.error(`폴더 생성 실패: ${err.message}`);
    },
    onSuccess: () => {
      // 성공 시 서버에서 최신 데이터 다시 가져오기
      queryClient.invalidateQueries({ queryKey: ["content", path] });
      toast.success("폴더가 성공적으로 생성되었습니다.");
    },
  });

  /**
   * 폴더명 유효성 검증
   * @param {string} name - 검증할 폴더명
   * @returns {string | null} 에러 메시지 또는 null
   */
  const validateFolderName = (name: string): string | null => {
    if (!name.trim()) {
      return "폴더명을 입력해주세요.";
    }
    if (name.includes("/") || name.includes("\\")) {
      return "폴더명에 '/' 또는 '\\'는 사용할 수 없습니다.";
    }
    if (name.length > 100) {
      return "폴더명은 100자 이하로 입력해주세요.";
    }
    return null;
  };

  /**
   * 폴더 추가 처리
   * @param {React.FormEvent} e - 폼 이벤트
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateFolderName(folderName);
    if (error) {
      toast.error(error);
      return;
    }

    try {
      // Optimistic update와 함께 폴더 생성
      await mutateAsync({
        name: folderName,
        path: path, // path 쿼리스트링 사용
      });

      setFolderName("");
      setOpen(false);
    } catch (error) {
      // 에러는 이미 mutation에서 toast로 처리됨
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="size-8 hover:cursor-pointer"
          variant={"secondary"}
          title="Add Folder"
        >
          <FilePlus />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Folder</DialogTitle>
            <DialogDescription className="text-start! md:text-center">
              {path ? `현재 경로: ${path}` : "/"}에 폴더를 추가합니다.
            </DialogDescription>
            <ul>
              <li className="text-start!">
                <span className="inline-block rounded bg-gray-300 p-0.5 text-xs font-normal dark:bg-gray-800">
                  이미 존재하는 폴더명은 불가능합니다.
                </span>
              </li>
              <li className="text-start!">
                <span className="inline-block rounded bg-gray-300 p-0.5 text-xs font-normal dark:bg-gray-800">
                  '/'와 같은 특수문자는 제한됩니다.
                </span>
              </li>
            </ul>
          </DialogHeader>
          <div className="my-4 flex items-center gap-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="FolderName" className="sr-only">
                FolderName
              </Label>
              <Input
                className="placeholder:text-xs"
                id="FolderName"
                placeholder="폴더명을 입력하세요."
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "추가 중..." : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
