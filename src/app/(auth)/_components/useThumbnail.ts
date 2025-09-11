const useThumbnail = () => {
  // 파일 확장가를 기준으로 썸네일을 생성하기 위해 타입 확인
  const getImageThumbnailType = (filename: string) => {
    const fileExtension = filename.toLowerCase().split(".").pop() || "";
    const iosImageExtensions = ["heic", "heif"];
    const defaultImageExtensions = ["jpg", "jpeg", "png"];

    return iosImageExtensions.includes(fileExtension)
      ? "ios"
      : defaultImageExtensions.includes(fileExtension)
        ? "default"
        : "none";
  };

  // 썸네일 생성
  const createThumbnail = async (imageType: "ios" | "default", file: File) => {
    let thumbnail = null;
    try {
      if (imageType === "ios") {
        // HEIC 파일은 createHeicThumbnail 사용
        const converted = await createHeicThumbnail(file);
        thumbnail = Array.isArray(converted) ? converted[0] : converted;
      } else if (imageType === "default") {
        // 다른 이미지 파일은 캔버스로 썸네일 생성
        thumbnail = await createCanvasThumbnail(file);
      }

      if (!thumbnail) {
        throw new Error('🚀 ~ createThumbnail ~ thumbnail_", thumbnail');
      }
    } catch (e) {
      console.log("🚀 ~ fileUpload ~ thumbnail creation error:", e);
    }
    return thumbnail;
  };

  const createHeicThumbnail = async (imageFile: File) => {
    const heic2any = (await import("heic2any")).default;
    return await heic2any({
      blob: imageFile,
      toType: "image/jpeg",
      quality: 0.8,
    });
  };

  const createCanvasThumbnail = async (
    imageFile: File,
    maxWidth = 300,
    maxHeight = 300,
    quality = 0.8,
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // 비율을 유지하면서 썸네일 크기 계산
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 이미지를 캔버스에 그리기
        ctx?.drawImage(img, 0, 0, width, height);

        // Blob으로 변환
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas to blob conversion failed"));
            }
          },
          "image/jpeg",
          quality,
        );
      };

      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(imageFile);
    });
  };

  return { getImageThumbnailType, createThumbnail };
};

export default useThumbnail;
