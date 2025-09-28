// ================================================================
// 새로운 폴더 시스템 타입 정의
// ================================================================

// 사용자가 보는 논리적 폴더 구조
export interface Folder {
  /** 폴더 고유 식별자 */
  id: string;
  /** 폴더 소유자 (사용자 ID) */
  user_id: string;
  /** 사용자가 설정한 폴더명 */
  name: string;
  /** 상위 폴더 ID (NULL이면 루트 폴더) */
  parent_id: string | null;
  /** 전체 경로 캐시 (성능 최적화용) */
  full_path: string;
  /** 폴더 깊이 (루트=0, 최대 10레벨) */
  depth: number;
  /** 시스템 폴더 여부 (자동 생성된 루트 폴더 등) */
  is_system_folder: boolean;
  /** 폴더 색상 (UI용, HEX 코드) */
  folder_color?: string;
  /** 폴더 설명 (사용자가 입력한 메모) */
  description?: string;
  /** 폴더 생성 시간 */
  created_at: string;
  /** 폴더 정보 마지막 수정 시간 */
  updated_at: string;
}

// 실제 파일이 저장되는 물리적 폴더 관리
export interface StorageFolder {
  /** 물리적 저장 폴더 고유 식별자 */
  id: string;
  /** 저장 폴더 소유자 */
  user_id: string;
  /** 폴더 인덱스 (0, 1, 2, ... folder_000, folder_001 형태) */
  folder_index: number;
  /** 실제 스토리지 경로 */
  storage_path: string;
  /** 현재 저장된 파일 개수 */
  file_count: number;
  /** 이 폴더에 저장 가능한 최대 파일 개수 */
  max_file_count: number;
  /** 저장된 파일들의 총 크기 (바이트) */
  total_size: number;
  /** 새 파일 저장 가능 여부 */
  is_active: boolean;
  /** 물리적 폴더 생성 시간 */
  created_at: string;
  /** 마지막 업데이트 시간 */
  updated_at: string;
}

// 파일 메타데이터 (논리적 폴더와 물리적 저장 연결)
export interface UploadedFile {
  /** 파일 고유 식별자 */
  id: string;
  /** 파일 소유자 */
  user_id: string;
  /** 논리적 상위 폴더 ID (사용자가 보는 폴더 구조) */
  folder_id: string;
  /** 실제 저장된 물리적 폴더 ID */
  storage_folder_id: string;
  /** 사용자가 업로드한 원본 파일명 */
  original_filename: string;
  /** 스토리지에 저장된 실제 파일명 */
  stored_filename: string;
  /** 사용자에게 표시될 파일명 (이름 변경 시 사용) */
  display_filename?: string;
  /** 스토리지 내 전체 파일 경로 */
  file_path: string;
  /** 저장된 버킷명 */
  storage_bucket: string;
  /** 파일 크기 (바이트) */
  file_size: number;
  /** MIME 타입 */
  mime_type: string;
  /** 파일 분류 (UI 표시용) */
  file_type: "image" | "video" | "document" | "other";
  /** 썸네일 존재 여부 */
  has_thumbnail: boolean;
  /** 썸네일 파일 경로 */
  thumbnail_path?: string;
  /** 썸네일 파일 크기 (바이트) */
  thumbnail_size?: number;
  /** 업로드 상태 */
  upload_status: "uploading" | "completed" | "failed";
  /** 업로드 실패 시 오류 메시지 */
  error_message?: string;
  /** 파일 해시값 (중복 파일 검출용) */
  file_hash?: string;
  /** 마지막 접근 시간 (아카이빙 정책용) */
  last_accessed_at?: string;
  /** 즐겨찾기 여부 */
  is_starred: boolean;
  /** 사용자 정의 태그 배열 */
  tags?: string[];
  /** 파일 생성 시간 */
  created_at: string;
  /** 메타데이터 마지막 수정 시간 */
  updated_at: string;
}

/** 리스트용 썸네일 URL을 포함한 파일 메타데이터 */
export type UploadedFileInfo = UploadedFile & {
  signedThumbnailUrl: string | null;
};

// ================================================================
// Insert 타입들 (auto-generated 필드 제외)
// ================================================================

export interface FolderInsert {
  user_id: string;
  name: string;
  parent_id?: string | null;
  is_system_folder?: boolean;
  folder_color?: string;
  description?: string;
}

export interface StorageFolderInsert {
  user_id: string;
  folder_index: number;
  storage_path: string;
  file_count?: number;
  max_file_count?: number;
  total_size?: number;
  is_active?: boolean;
}

export interface UploadedFileInsert {
  user_id: string;
  folder_id: string;
  storage_folder_id: string;
  original_filename: string;
  stored_filename: string;
  display_filename?: string;
  file_path: string;
  storage_bucket: string;
  file_size: number;
  mime_type: string;
  file_type?: "image" | "video" | "document" | "other";
  has_thumbnail?: boolean;
  thumbnail_path?: string;
  thumbnail_size?: number;
  upload_status?: "uploading" | "completed" | "failed";
  error_message?: string;
  file_hash?: string;
  last_accessed_at?: string;
  is_starred?: boolean;
  tags?: string[];
}

// ================================================================
// Update 타입들 (모든 필드 옵셔널)
// ================================================================

export interface FolderUpdate {
  name?: string;
  parent_id?: string | null;
  folder_color?: string;
  description?: string;
  updated_at?: string;
}

export interface StorageFolderUpdate {
  file_count?: number;
  max_file_count?: number;
  total_size?: number;
  is_active?: boolean;
  updated_at?: string;
}

export interface UploadedFileUpdate {
  folder_id?: string;
  display_filename?: string;
  has_thumbnail?: boolean;
  thumbnail_path?: string;
  thumbnail_size?: number;
  upload_status?: "uploading" | "completed" | "failed";
  error_message?: string;
  file_hash?: string;
  last_accessed_at?: string;
  is_starred?: boolean;
  tags?: string[];
  updated_at?: string;
}

// ================================================================
// 뷰와 관련된 확장 타입들
// ================================================================

export interface FolderWithStats extends Folder {
  /** 폴더 내 파일 개수 */
  file_count: number;
  /** 폴더 내 파일 총 크기 */
  total_size: number;
  /** 하위 폴더 개수 */
  subfolder_count: number;
}

export interface FileWithFolderInfo extends UploadedFile {
  /** 소속 폴더명 */
  folder_name: string;
  /** 소속 폴더 전체 경로 */
  folder_path: string;
  /** 소속 폴더 깊이 */
  folder_depth: number;
  /** 물리적 저장 경로 */
  physical_path: string;
  /** 물리적 저장 폴더 인덱스 */
  storage_folder_index: number;
}

// ================================================================
// 트리 구조 관련 타입들
// ================================================================

export interface FolderTreeNode extends FolderWithStats {
  /** 하위 폴더들 */
  children?: FolderTreeNode[];
  /** 폴더 내 파일들 */
  files?: UploadedFile[];
  /** 트리에서의 레벨 (UI 렌더링용) */
  level?: number;
  /** 확장 상태 (UI 상태 관리용) */
  expanded?: boolean;
}

// ================================================================
// ================================================================
// 레거시 호환성 타입들 (deprecated)
// ================================================================

/** @deprecated Use StorageFolder instead */
export type FolderCounter = StorageFolder;

/** @deprecated Use StorageFolderInsert instead */
export type FolderCounterInsert = StorageFolderInsert;

/** @deprecated Use StorageFolderUpdate instead */
export type FolderCounterUpdate = StorageFolderUpdate;

// Response types for API
export interface UploadResult {
  success: boolean;
  fileName: string;
  filePath?: string;
  fileUrl?: string;
  error?: string;
}

export interface UploadResponse {
  results: UploadResult[];
}
