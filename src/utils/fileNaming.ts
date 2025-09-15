/**
 * 파일 업로드 관련 네이밍 유틸리티
 *
 * 폴더 구조: {user_id}/folder_{index}/
 * 파일명 구조: {timestamp}_{original_filename}
 * 썸네일 구조: {user_id}/thumbnails/folder_{index}/thumb_{timestamp}_{original_filename}
 */

export interface FileNamingConfig {
  userId: string;
  folderIndex: number;
  originalFilename: string;
  timestamp?: number;
}

export interface GeneratedPaths {
  folderPath: string;
  fileName: string;
  filePath: string;
  thumbnailFolderPath: string;
  thumbnailFileName: string;
  thumbnailPath: string;
}

/**
 * 폴더 경로 생성
 * @param userId 사용자 ID
 * @param folderIndex 폴더 인덱스 (0부터 시작)
 * @returns 폴더 경로 (예: "user123/folder_001")
 */
export function generateFolderPath(userId: string, folderIndex: number): string {
  const paddedIndex = String(folderIndex).padStart(3, '0');
  return `${userId}/folder_${paddedIndex}`;
}

/**
 * 저장용 파일명 생성 (타임스탬프 + 원본 파일명)
 * @param originalFilename 원본 파일명
 * @param timestamp 타임스탬프 (선택사항, 기본값: 현재 시간)
 * @returns 저장용 파일명 (예: "1703123456789_image.jpg")
 */
export function generateStoredFilename(originalFilename: string, timestamp?: number): string {
  const ts = timestamp ?? Date.now();
  return `${ts}_${originalFilename}`;
}

/**
 * 썸네일 폴더 경로 생성
 * @param userId 사용자 ID
 * @param folderIndex 폴더 인덱스
 * @returns 썸네일 폴더 경로 (예: "user123/thumbnails/folder_001")
 */
export function generateThumbnailFolderPath(userId: string, folderIndex: number): string {
  const paddedIndex = String(folderIndex).padStart(3, '0');
  return `${userId}/thumbnails/folder_${paddedIndex}`;
}

/**
 * 썸네일 파일명 생성
 * @param originalFilename 원본 파일명
 * @param timestamp 타임스탬프
 * @returns 썸네일 파일명 (예: "thumb_1703123456789_image.jpg")
 */
export function generateThumbnailFilename(originalFilename: string, timestamp?: number): string {
  const ts = timestamp ?? Date.now();
  return `thumb_${ts}_${originalFilename}`;
}

/**
 * 완전한 파일 경로들 생성
 * @param config 파일 네이밍 설정
 * @returns 생성된 모든 경로들
 */
export function generateAllPaths(config: FileNamingConfig): GeneratedPaths {
  const timestamp = config.timestamp ?? Date.now();

  const folderPath = generateFolderPath(config.userId, config.folderIndex);
  const fileName = generateStoredFilename(config.originalFilename, timestamp);
  const filePath = `${folderPath}/${fileName}`;

  const thumbnailFolderPath = generateThumbnailFolderPath(config.userId, config.folderIndex);
  const thumbnailFileName = generateThumbnailFilename(config.originalFilename, timestamp);
  const thumbnailPath = `${thumbnailFolderPath}/${thumbnailFileName}`;

  return {
    folderPath,
    fileName,
    filePath,
    thumbnailFolderPath,
    thumbnailFileName,
    thumbnailPath,
  };
}

/**
 * 파일 확장자 추출
 * @param filename 파일명
 * @returns 확장자 (점 포함, 예: ".jpg")
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
}

/**
 * 파일명에서 확장자 제거
 * @param filename 파일명
 * @returns 확장자가 제거된 파일명
 */
export function removeFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
}

/**
 * 안전한 파일명으로 변환 (특수문자 제거/변환)
 * @param filename 원본 파일명
 * @returns 안전한 파일명
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // 금지된 문자들을 언더스코어로 변경
    .replace(/\s+/g, '_') // 공백을 언더스코어로 변경
    .replace(/_{2,}/g, '_') // 연속된 언더스코어를 하나로 변경
    .replace(/^_+|_+$/g, ''); // 시작과 끝의 언더스코어 제거
}

// 상수 정의
export const FILE_NAMING_CONSTANTS = {
  MAX_FOLDER_FILES: 1000, // 폴더당 최대 파일 수
  FOLDER_INDEX_PADDING: 3, // 폴더 인덱스 패딩 자릿수
  SUPPORTED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  THUMBNAIL_SIZES: {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 500, height: 500 },
  }
} as const;