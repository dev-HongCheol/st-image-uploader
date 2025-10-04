-- ================================================================
-- 초기 스키마 생성 스크립트
-- ================================================================
-- 목적: 깨끗한 폴더 시스템 스키마 생성
--
-- 핵심 개념:
-- 1. 물리적 저장: Supabase Storage의 실제 경로 (userId/folder_XXX)
-- 2. 논리적 구조: 사용자가 보는 폴더 트리 (데이터베이스 메타데이터)
-- 3. 파일 이동: 실제 파일은 그대로, DB의 folder_id만 변경
-- ================================================================

-- ⚠️ 주의: 기존 데이터를 모두 삭제합니다!

-- 기존 뷰 삭제
DROP VIEW IF EXISTS user_folder_tree CASCADE;
DROP VIEW IF EXISTS file_details CASCADE;
DROP VIEW IF EXISTS folder_tree_view CASCADE;
DROP VIEW IF EXISTS files_with_folder_view CASCADE;

-- 기존 함수들 삭제
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_folder_path() CASCADE;
DROP FUNCTION IF EXISTS prevent_circular_reference() CASCADE;
DROP FUNCTION IF EXISTS update_descendant_paths() CASCADE;
DROP FUNCTION IF EXISTS get_or_create_user_root(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_or_create_active_storage_folder(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_folder_tree(UUID, UUID) CASCADE;

-- 기존 테이블 삭제 (의존성 순서 고려)
DROP TABLE IF EXISTS uploaded_files CASCADE;
DROP TABLE IF EXISTS folder_counters CASCADE;
DROP TABLE IF EXISTS storage_folders CASCADE;
DROP TABLE IF EXISTS folders CASCADE;

-- ================================================================
-- 1. 테이블 생성
-- ================================================================

-- 1-1. 사용자가 보는 논리적 폴더 구조
CREATE TABLE folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    full_path TEXT NOT NULL,
    depth INTEGER NOT NULL DEFAULT 0,
    is_system_folder BOOLEAN DEFAULT FALSE,
    folder_color VARCHAR(7),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_folder_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT chk_depth_range CHECK (depth >= 0 AND depth <= 10),
    CONSTRAINT chk_no_path_separators CHECK (name !~ '[/\\]')
);

-- 1-2. 실제 파일이 저장되는 물리적 폴더 관리
CREATE TABLE storage_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_index INTEGER NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    file_count INTEGER NOT NULL DEFAULT 0,
    max_file_count INTEGER NOT NULL DEFAULT 1000,
    total_size BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, folder_index),
    CONSTRAINT chk_file_count_positive CHECK (file_count >= 0),
    CONSTRAINT chk_max_file_count_positive CHECK (max_file_count > 0),
    CONSTRAINT chk_total_size_positive CHECK (total_size >= 0)
);

-- 1-3. 파일 메타데이터 (논리적 폴더와 물리적 저장 연결)
CREATE TABLE uploaded_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE RESTRICT,
    storage_folder_id UUID NOT NULL REFERENCES storage_folders(id) ON DELETE RESTRICT,
    original_filename TEXT NOT NULL,
    display_filename TEXT,
    file_path TEXT NOT NULL UNIQUE,
    storage_bucket TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('image', 'video', 'document', 'other')),
    has_thumbnail BOOLEAN DEFAULT FALSE,
    thumbnail_path TEXT,
    thumbnail_size BIGINT,
    upload_status TEXT DEFAULT 'completed' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
    error_message TEXT,
    file_hash TEXT,
    last_accessed_at TIMESTAMPTZ,
    is_starred BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    media_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(storage_folder_id, original_filename),
    CONSTRAINT chk_file_size_positive CHECK (file_size > 0)
);

-- ================================================================
-- 2. 인덱스 생성
-- ================================================================

-- folders 테이블 인덱스
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_full_path ON folders(full_path);
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id);

-- storage_folders 테이블 인덱스
CREATE INDEX idx_storage_folders_user_id ON storage_folders(user_id);
CREATE INDEX idx_storage_folders_is_active ON storage_folders(is_active);
CREATE INDEX idx_storage_folders_user_active ON storage_folders(user_id, is_active, folder_index DESC);

-- uploaded_files 테이블 인덱스
CREATE INDEX idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_folder_id ON uploaded_files(folder_id);
CREATE INDEX idx_uploaded_files_storage_folder_id ON uploaded_files(storage_folder_id);
CREATE INDEX idx_uploaded_files_file_type ON uploaded_files(file_type);
CREATE INDEX idx_uploaded_files_created_at ON uploaded_files(created_at DESC);
CREATE INDEX idx_uploaded_files_is_starred ON uploaded_files(is_starred);
CREATE INDEX idx_uploaded_files_media_created_at ON uploaded_files(media_created_at DESC NULLS LAST, created_at DESC);
CREATE INDEX idx_uploaded_files_user_folder_status ON uploaded_files(user_id, folder_id, upload_status);

-- ================================================================
-- 3. 트리거 함수들
-- ================================================================

-- 3-1. updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3-2. 폴더 경로 자동 업데이트
CREATE OR REPLACE FUNCTION update_folder_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
    parent_depth INTEGER;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.full_path := NEW.name;
        NEW.depth := 0;
    ELSE
        SELECT full_path, depth INTO parent_path, parent_depth
        FROM folders
        WHERE id = NEW.parent_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent folder not found';
        END IF;

        NEW.full_path := parent_path || '/' || NEW.name;
        NEW.depth := parent_depth + 1;

        IF NEW.depth > 10 THEN
            RAISE EXCEPTION 'Maximum folder depth (10) exceeded';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3-3. 순환 참조 방지
CREATE OR REPLACE FUNCTION prevent_circular_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        IF NEW.id = NEW.parent_id THEN
            RAISE EXCEPTION 'A folder cannot be its own parent';
        END IF;

        IF EXISTS (
            WITH RECURSIVE ancestors AS (
                SELECT parent_id FROM folders WHERE id = NEW.parent_id
                UNION ALL
                SELECT f.parent_id FROM folders f
                INNER JOIN ancestors a ON f.id = a.parent_id
            )
            SELECT 1 FROM ancestors WHERE parent_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'Circular reference detected';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3-4. 하위 폴더 경로 업데이트 (폴더 이름 변경 시)
CREATE OR REPLACE FUNCTION update_descendant_paths()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.full_path != NEW.full_path THEN
        UPDATE folders
        SET full_path = REPLACE(full_path, OLD.full_path, NEW.full_path)
        WHERE full_path LIKE OLD.full_path || '/%';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 4. 트리거 등록
-- ================================================================

CREATE TRIGGER trigger_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_storage_folders_updated_at
    BEFORE UPDATE ON storage_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_uploaded_files_updated_at
    BEFORE UPDATE ON uploaded_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_folder_path_before_insert
    BEFORE INSERT ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_path();

CREATE TRIGGER trigger_folder_path_before_update
    BEFORE UPDATE OF name, parent_id ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_path();

CREATE TRIGGER trigger_prevent_circular_ref
    BEFORE INSERT OR UPDATE OF parent_id ON folders
    FOR EACH ROW
    EXECUTE FUNCTION prevent_circular_reference();

CREATE TRIGGER trigger_update_descendant_paths
    AFTER UPDATE OF full_path ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_descendant_paths();

-- ================================================================
-- 5. 뷰 생성
-- ================================================================

-- 5-1. 폴더 트리 뷰 (파일 개수 포함)
CREATE VIEW folder_tree_view AS
SELECT
    f.id,
    f.user_id,
    f.name,
    f.parent_id,
    f.full_path,
    f.depth,
    f.is_system_folder,
    f.folder_color,
    f.description,
    f.created_at,
    f.updated_at,
    COALESCE(file_stats.file_count, 0) as file_count,
    COALESCE(file_stats.total_size, 0) as total_size,
    COALESCE(subfolder_stats.subfolder_count, 0) as subfolder_count
FROM folders f
LEFT JOIN (
    SELECT folder_id, COUNT(*) as file_count, SUM(file_size) as total_size
    FROM uploaded_files
    WHERE upload_status = 'completed'
    GROUP BY folder_id
) file_stats ON f.id = file_stats.folder_id
LEFT JOIN (
    SELECT parent_id, COUNT(*) as subfolder_count
    FROM folders
    GROUP BY parent_id
) subfolder_stats ON f.id = subfolder_stats.parent_id;

-- 5-2. 파일 상세 정보 뷰
CREATE VIEW file_details AS
SELECT
    f.*,
    fld.name as folder_name,
    fld.full_path as folder_path,
    fld.depth as folder_depth,
    sf.storage_path as physical_path,
    sf.folder_index as storage_folder_index
FROM uploaded_files f
JOIN folders fld ON f.folder_id = fld.id
JOIN storage_folders sf ON f.storage_folder_id = sf.id;

-- ================================================================
-- 6. 컬럼 코멘트
-- ================================================================

COMMENT ON COLUMN folders.full_path IS '루트부터 현재 폴더까지의 전체 경로 (예: "Documents/Photos/2024")';
COMMENT ON COLUMN folders.depth IS '폴더 깊이 (루트=0, 최대 10레벨)';
COMMENT ON COLUMN folders.is_system_folder IS '시스템이 자동 생성한 폴더 여부 (예: 루트 폴더)';

COMMENT ON COLUMN storage_folders.folder_index IS '물리적 폴더 순번 (folder_000, folder_001, ...)';
COMMENT ON COLUMN storage_folders.storage_path IS 'Supabase Storage 내 실제 경로';
COMMENT ON COLUMN storage_folders.is_active IS '새 파일을 저장 가능한 활성 폴더 여부';

COMMENT ON COLUMN uploaded_files.original_filename IS '사용자가 업로드한 원본 파일명';
COMMENT ON COLUMN uploaded_files.display_filename IS '사용자에게 표시될 파일명 (이름 변경 가능)';
COMMENT ON COLUMN uploaded_files.media_created_at IS '미디어 촬영/생성 일시 (사진: EXIF DateTimeOriginal, 동영상: 메타데이터 CreateDate)';

-- ================================================================
-- 완료 메시지
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ 초기 스키마 생성 완료!';
    RAISE NOTICE '';
    RAISE NOTICE '생성된 테이블:';
    RAISE NOTICE '  - folders (논리적 폴더 구조)';
    RAISE NOTICE '  - storage_folders (물리적 저장 폴더)';
    RAISE NOTICE '  - uploaded_files (파일 메타데이터)';
    RAISE NOTICE '';
    RAISE NOTICE '생성된 뷰:';
    RAISE NOTICE '  - folder_tree_view';
    RAISE NOTICE '  - file_details';
END $$;
