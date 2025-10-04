/**
 * 미디어 파일(이미지, 동영상)에서 촬영/생성 일시를 추출하는 유틸리티
 */

import ExifReader from "exifreader";

/**
 * 이미지 파일에서 EXIF 촬영 일시를 추출
 *
 * @param file - 이미지 파일
 * @returns ISO 8601 형식의 촬영 일시 문자열 또는 null
 */
async function extractImageCreatedDate(file: File): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);

    // EXIF 날짜 우선순위: DateTimeOriginal > CreateDate > DateTime
    const dateFields = [
      "DateTimeOriginal",
      "CreateDate",
      "DateTime",
    ];

    for (const field of dateFields) {
      const dateTag = tags[field];
      if (dateTag?.description) {
        // EXIF 날짜 형식: "2024:01:15 14:30:45"
        const exifDate = dateTag.description;

        // ISO 8601 형식으로 변환: "2024-01-15T14:30:45"
        const isoDate = exifDate
          .replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
          .replace(" ", "T");

        // 유효한 날짜인지 확인
        const parsedDate = new Date(isoDate);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      }
    }

    return null;
  } catch (error) {
    console.error("EXIF 추출 실패:", error);
    return null;
  }
}

/**
 * 동영상 파일에서 생성 일시를 추출
 *
 * @param file - 동영상 파일
 * @returns ISO 8601 형식의 생성 일시 문자열 또는 null
 */
async function extractVideoCreatedDate(file: File): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);

    // QuickTime/MP4 메타데이터에서 생성 날짜 추출
    const dateFields = [
      "CreateDate",
      "CreationDate",
      "MediaCreateDate",
      "TrackCreateDate",
    ];

    for (const field of dateFields) {
      const dateTag = tags[field];
      if (dateTag?.description) {
        const dateStr = dateTag.description;

        // 다양한 형식 처리
        let isoDate: string;

        // "2024:01:15 14:30:45" 형식
        if (dateStr.includes(":") && dateStr.includes(" ")) {
          isoDate = dateStr
            .replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
            .replace(" ", "T");
        } else {
          isoDate = dateStr;
        }

        const parsedDate = new Date(isoDate);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      }
    }

    return null;
  } catch (error) {
    console.error("동영상 메타데이터 추출 실패:", error);
    return null;
  }
}

/**
 * 미디어 파일에서 촬영/생성 일시를 추출하는 통합 함수
 *
 * @param file - 미디어 파일
 * @returns ISO 8601 형식의 촬영/생성 일시 문자열 또는 null
 */
export async function extractMediaCreatedDate(
  file: File,
): Promise<string | null> {
  const mimeType = file.type.toLowerCase();

  if (mimeType.startsWith("image/")) {
    return extractImageCreatedDate(file);
  }

  if (mimeType.startsWith("video/")) {
    return extractVideoCreatedDate(file);
  }

  // 이미지나 동영상이 아닌 경우 null 반환
  return null;
}
