import { createClient } from "@/utils/supabase/server";
import { getUserFolderTree, getFolderFiles, getOrCreateUserRoot } from "@/utils/folder-system";

/**
 * 메인 페이지 컴포넌트 - 사용자의 최상위 폴더에 있는 폴더와 파일들을 표시
 * @returns {Promise<JSX.Element>} 메인 페이지 JSX 엘리먼트
 */
export default async function MainPage() {
  const supabase = await createClient();
  const loginUser = await supabase.auth.getUser();

  if (!loginUser.data.user) {
    return <div>로그인이 필요합니다.</div>;
  }

  try {
    // 사용자의 루트 폴더 가져오기 또는 생성
    const rootFolder = await getOrCreateUserRoot(loginUser.data.user.id);
    // 루트 폴더에 직접 있는 파일들 가져오기
    const rootFiles = await getFolderFiles(rootFolder.id, loginUser.data.user.id, {
      limit: 50,
      sortBy: "created_at",
      sortOrder: "desc"
    });


    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">내 파일</h1>

        {/* 폴더 목록 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">폴더</h2>
          {rootFiles && rootFiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rootFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="mr-3">
                    <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                  </div>
                  <div className="flex-1">
                    {file.signedThumbnailUrl && file.mime_type.includes('image') && <img src={file.signedThumbnailUrl} />}
                    <div className="font-medium">{file.display_filename}</div>
                    <div className="text-sm text-gray-500">
                      {Math.round(file.file_size / 1024)}KB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 p-4 border rounded-lg">폴더가 없습니다.</div>
          )}
        </div>
      </div >
    );
  } catch (error) {
    console.error("파일 목록 가져오기 오류:", error);
    return (
      <div className="p-6">
        <div className="text-red-500">파일 목록을 가져오는데 실패했습니다.</div>
        <div className="text-sm text-gray-500 mt-2">
          오류: {error instanceof Error ? error.message : '알 수 없는 오류'}
        </div>
      </div>
    );
  }
}
