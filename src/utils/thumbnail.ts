/**
 * 서버 사이드 썸네일 생성 유틸리티
 *
 * 이 파일은 서버에서 이미지 파일의 썸네일을 생성하는 기능을 제공합니다.
 * HEIC/HEIF 포맷과 일반 이미지 포맷을 모두 지원하며, Sharp 라이브러리를 사용하여
 * 고품질 썸네일을 생성합니다.
 *
 * 주요 기능:
 * - 파일 확장자 기반 이미지 타입 판별
 * - HEIC/HEIF 파일을 JPEG로 변환 후 썸네일 생성
 * - 일반 이미지 파일 썸네일 생성
 * - 비율 유지하며 최대 크기 제한
 */

import sharp from 'sharp';
import { HEIC_EXTENSIONS, isHEICFile, SUPPORTED_IMAGE_EXTENSIONS } from './heic';

// heic-convert 라이브러리 타입 정의
interface HeicConvertOptions {
  buffer: Buffer | ArrayBuffer | Uint8Array;
  format: 'JPEG' | 'PNG';
  quality?: number;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const heicConvert = require('heic-convert') as (options: HeicConvertOptions) => Promise<ArrayBuffer>;

// 썸네일 생성 가능한 이미지 타입 정의
export type ImageThumbnailType = "image" | "heic" | "none";

/**
 * 파일명의 확장자를 기반으로 썸네일 생성 가능한 이미지 타입을 판별합니다.
 *
 * @param fileName - 판별할 파일명
 * @returns 이미지 타입 ("image" | "heic" | "none")
 *
 * 지원 포맷:
 * - image: jpg, jpeg, png, gif, bmp, webp, tiff, svg
 * - heic: heic, heif
 * - none: 썸네일 생성 불가능한 파일
 */
export function getImageThumbnailType(fileName: string): ImageThumbnailType {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (!extension) return "none";

  if (HEIC_EXTENSIONS.includes(extension)) {
    return "heic";
  }

  if (SUPPORTED_IMAGE_EXTENSIONS.includes(extension)) {
    return "image";
  }

  return "none";
}

/**
 * 이미지 파일의 썸네일을 생성합니다.
 *
 * @param type - 이미지 타입 (getImageThumbnailType 함수로 판별)
 * @param file - 썸네일을 생성할 원본 파일
 * @param maxSize - 썸네일 최대 크기 (기본값: 200px)
 * @returns 생성된 썸네일 Buffer (실패 시 null)
 *
 * 처리 과정:
 * 1. HEIC 파일인 경우: HEIC → JPEG 변환 후 썸네일 생성
 * 2. 일반 이미지인 경우: 직접 썸네일 생성
 * 3. 비율 유지하며 maxSize 내로 리사이즈
 * 4. JPEG 포맷으로 압축 (품질: 80%)
 */
export async function createThumbnail(
  type: ImageThumbnailType,
  file: File,
  maxSize: number = 200
): Promise<Buffer | null> {
  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    if (type === "heic") {
      // HEIC 파일을 JPEG로 변환 후 썸네일 생성
      const jpegBuffer = await heicConvert({
        buffer: fileBuffer,
        format: 'JPEG',
        quality: 0.8
      });

      return await sharp(Buffer.from(jpegBuffer))
        .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } else if (type === "image") {
      // 일반 이미지 썸네일 생성
      return await sharp(fileBuffer)
        .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    return null;
  } catch (error) {
    console.error('Thumbnail creation error:', error);
    return null;
  }
}