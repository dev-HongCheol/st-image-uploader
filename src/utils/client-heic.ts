/**
 * 클라이언트 사이드 HEIC/HEIF 이미지 변환 유틸리티
 * 
 * 브라우저에서 HEIC 이미지를 JPEG로 변환하는 기능을 제공합니다.
 */

/**
 * HEIC/HEIF 이미지를 JPEG로 변환
 * 
 * @param blob - 변환할 HEIC 이미지 Blob
 * @param quality - JPEG 품질 (0.1 ~ 1.0, 기본값: 0.9)
 * @returns 변환된 JPEG Blob
 */
export const convertHEICToJPEG = async (blob: Blob, quality: number = 0.9): Promise<Blob> => {
  try {
    // 동적 임포트로 클라이언트에서만 로드
    const heic2any = (await import("heic2any")).default;
    
    const convertedBlob = await heic2any({
      blob,
      toType: "image/jpeg",
      quality,
    }) as Blob;
    return convertedBlob;
  } catch (error) {
    console.error("HEIC to JPEG conversion failed:", error);
    throw error;
  }
};

/**
 * HEIC URL을 JPEG Data URL로 변환
 * 
 * @param heicUrl - HEIC 이미지 URL
 * @param quality - JPEG 품질 (0.1 ~ 1.0, 기본값: 0.9)
 * @returns 변환된 JPEG Data URL
 */
export const convertHEICUrlToJPEG = async (heicUrl: string, quality: number = 0.9): Promise<string> => {
  // 서버 사이드에서는 실행하지 않음
  if (typeof window === 'undefined') {
    throw new Error('HEIC conversion is only available on client side');
  }

  try {
    console.log('Fetching HEIC file:', heicUrl);
    const response = await fetch(heicUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('Fetched blob:', {
      size: blob.size,
      type: blob.type
    });
    
    if (blob.size === 0) {
      throw new Error('Empty blob received');
    }
    
    const convertedBlob = await convertHEICToJPEG(blob, quality);
    console.log('Converted blob:', {
      size: convertedBlob.size,
      type: convertedBlob.type
    });
    
    // Data URL로 변환 (Blob URL 대신)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        console.log('Data URL created, length:', dataUrl.length);
        resolve(dataUrl);
      };
      reader.onerror = () => {
        console.error('FileReader error');
        reject(new Error('Failed to create data URL'));
      };
      reader.readAsDataURL(convertedBlob);
    });
  } catch (error) {
    console.error("HEIC URL conversion failed:", error);
    throw error;
  }
};