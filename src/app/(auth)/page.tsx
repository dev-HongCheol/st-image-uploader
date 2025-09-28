import { Folder, UploadedFileInfo } from "@/types/database";
import {
  findFolderByPath,
  getFolders,
  getFolderFiles,
  getOrCreateUserRoot,
} from "@/utils/folder-system";
import { createClient } from "@/utils/supabase/server";
import ContentList from "./_components/ContentList";

type Props = {
  searchParams: { path: string };
};

/**
 * 메인 페이지 컴포넌트 - 사용자의 최상위 폴더에 있는 폴더와 파일들을 표시
 * @returns {Promise<JSX.Element>} 메인 페이지 JSX 엘리먼트
 */
export default async function MainPage({ searchParams }: Props) {
  const supabase = await createClient();
  const loginUser = await supabase.auth.getUser();

  if (!loginUser.data.user) {
    return <div>로그인이 필요합니다.</div>;
  }

  const { path } = await searchParams;
  let currentPath = path || "";
  let files: UploadedFileInfo[] = [];
  let folders: Folder[] = [];
  let folderId: string;

  if (!currentPath) {
    // 사용자의 루트 폴더 가져오기 또는 생성
    const rootFolder = await getOrCreateUserRoot(loginUser.data.user.id);
    folderId = rootFolder.id;

    // 루트 폴더의 하위 폴더들과 파일들을 분리해서 조회
    [folders, files] = await Promise.all([
      getFolders(rootFolder.id, loginUser.data.user.id),
      getFolderFiles(rootFolder.id, loginUser.data.user.id, {
        limit: 50,
        sortBy: "created_at",
        sortOrder: "desc",
      }),
    ]);
  } else {
    // 경로를 기반으로 폴더 찾기
    const foundFolderId = await findFolderByPath(
      loginUser.data.user.id,
      currentPath,
    );

    if (foundFolderId) {
      folderId = foundFolderId;

      // 해당 경로의 하위 폴더들과 파일들을 분리해서 조회
      [folders, files] = await Promise.all([
        getFolders(foundFolderId, loginUser.data.user.id),
        getFolderFiles(foundFolderId, loginUser.data.user.id, {
          limit: 50,
          sortBy: "created_at",
          sortOrder: "desc",
        }),
      ]);
    }
  }

  // 초기 데이터 준비
  const initialData = {
    folders: folders || [],
    files: files || [],
    currentPath,
    folderId: folderId || "",
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">내 파일</h1>
      
      {/* 클라이언트 컴포넌트로 실시간 업데이트 처리 */}
      <ContentList initialData={initialData} />
    </div>
  );
}
