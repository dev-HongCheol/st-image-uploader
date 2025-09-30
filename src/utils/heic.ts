/**
 * HEIC/HEIF 이미지 처리 공통 유틸리티
 * 
 * 클라이언트와 서버에서 공통으로 사용되는 HEIC 관련 함수들을 제공합니다.
 */

/**
 * HEIC/HEIF 파일 형식 확인
 * 
 * @param mimeType - 파일의 MIME 타입
 * @param filename - 파일명
 * @returns HEIC/HEIF 파일 여부
 */
export const isHEICFormat = (mimeType: string, filename: string): boolean => {
  const heicMimeTypes = ['image/heic', 'image/heif'];
  const heicExtensions = ['.heic', '.heif'];
  
  return heicMimeTypes.includes(mimeType.toLowerCase()) ||
         heicExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

/**
 * 파일 확장자를 기반으로 HEIC 타입 확인
 * 
 * @param fileName - 확인할 파일명
 * @returns HEIC 파일 여부
 */
export const isHEICFile = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return ['heic', 'heif'].includes(extension || '');
};

/**
 * 지원되는 이미지 확장자 목록
 */
export const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'svg'];

/**
 * HEIC 확장자 목록
 */
export const HEIC_EXTENSIONS = ['heic', 'heif'];

/**
 * HEIC MIME 타입 목록
 */
export const HEIC_MIME_TYPES = ['image/heic', 'image/heif'];