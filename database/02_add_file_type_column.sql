-- uploaded_files 테이블에 file_type 컬럼 추가

ALTER TABLE uploaded_files
ADD COLUMN file_type TEXT CHECK (file_type IN ('image', 'video', 'other'));

-- 기존 데이터를 위한 기본값 설정 (mime_type 기반으로 추론)
UPDATE uploaded_files
SET file_type = CASE
    WHEN mime_type LIKE 'image/%' THEN 'image'
    WHEN mime_type LIKE 'video/%' THEN 'video'
    ELSE 'other'
END
WHERE file_type IS NULL;

-- 새로운 레코드에 대한 기본값 설정
ALTER TABLE uploaded_files
ALTER COLUMN file_type SET DEFAULT 'other';