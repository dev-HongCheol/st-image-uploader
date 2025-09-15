-- 업로드 파일 관리를 위한 테이블 생성

-- 1. 폴더 카운터 테이블
CREATE TABLE IF NOT EXISTS folder_counters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_index INTEGER NOT NULL,
    file_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, folder_index)
);

-- 2. 업로드된 파일 메타데이터 테이블
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_path TEXT NOT NULL, -- 예: "user_id/folder_001"
    folder_index INTEGER NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL, -- 저장된 파일명 (타임스탬프 포함)
    file_path TEXT NOT NULL, -- 전체 저장 경로
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'originals',

    -- 썸네일 관련 필드
    has_thumbnail BOOLEAN DEFAULT FALSE,
    thumbnail_path TEXT,
    thumbnail_size BIGINT,

    -- 업로드 상태
    upload_status TEXT DEFAULT 'completed' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_folder_counters_user_id ON folder_counters(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_counters_user_folder ON folder_counters(user_id, folder_index);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_folder ON uploaded_files(user_id, folder_index);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_at ON uploaded_files(created_at);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE folder_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 접근 가능
CREATE POLICY "Users can manage their own folder counters" ON folder_counters
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own uploaded files" ON uploaded_files
    FOR ALL USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_folder_counters_updated_at
    BEFORE UPDATE ON folder_counters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploaded_files_updated_at
    BEFORE UPDATE ON uploaded_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();