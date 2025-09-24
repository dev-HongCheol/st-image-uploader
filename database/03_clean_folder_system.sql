-- ================================================================
-- 깔끔한 폴더 시스템 스키마 (최종 버전)
-- 기존 테이블들을 모두 지우고 새로운 구조로 시작
-- ================================================================
--
-- 핵심 개념:
-- 1. 물리적 저장: Supabase Storage의 실제 경로 (userId/folder_XXX)
-- 2. 논리적 구조: 사용자가 보는 폴더 트리 (데이터베이스 메타데이터)
-- 3. 파일 이동: 실제 파일은 그대로, DB의 folder_id만 변경
-- ================================================================

-- ⚠️ 주의: 기존 데이터를 모두 삭제합니다!
-- 실제 운영 환경에서는 04_migration_script.sql을 사용하세요!

-- 기존 테이블 삭제 (의존성 순서 고려)
DROP TABLE IF EXISTS uploaded_files CASCADE;
DROP TABLE IF EXISTS folder_counters CASCADE;
DROP TABLE IF EXISTS storage_folders CASCADE;
DROP TABLE IF EXISTS folders CASCADE;

-- 기존 함수들 삭제
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_folder_path() CASCADE;
DROP FUNCTION IF EXISTS prevent_circular_reference() CASCADE;
DROP FUNCTION IF EXISTS update_descendant_paths() CASCADE;
DROP FUNCTION IF EXISTS get_or_create_user_root(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_or_create_active_storage_folder(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_folder_tree(UUID, UUID) CASCADE;

-- 기존 뷰 삭제
DROP VIEW IF EXISTS user_folder_tree CASCADE;
DROP VIEW IF EXISTS file_details CASCADE;
DROP VIEW IF EXISTS folder_tree_view CASCADE;
DROP VIEW IF EXISTS files_with_folder_view CASCADE;

-- ================================================================
-- 1. 새로운 테이블들 생성
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 제약 조건
    UNIQUE(user_id, full_path),
    CHECK(depth >= 0 AND depth <= 10),
    CHECK(LENGTH(name) > 0 AND LENGTH(name) <= 255),
    CHECK(name NOT LIKE '%/%'),
    CHECK(CASE WHEN parent_id IS NULL THEN depth = 0 ELSE depth > 0 END)
);

-- 1-2. 실제 파일이 저장되는 물리적 폴더 관리
CREATE TABLE storage_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_index INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    file_count INTEGER DEFAULT 0,
    max_file_count INTEGER DEFAULT 1000,
    total_size BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 제약 조건
    UNIQUE(user_id, folder_index),
    UNIQUE(storage_path),
    CHECK(file_count >= 0),
    CHECK(max_file_count > 0),
    CHECK(total_size >= 0)
);

-- 1-3. 파일 메타데이터 (논리적 폴더와 물리적 저장 연결)
CREATE TABLE uploaded_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    storage_folder_id UUID NOT NULL REFERENCES storage_folders(id),
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    display_filename TEXT,
    file_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'originals',
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('image', 'video', 'document', 'other')) DEFAULT 'other',
    has_thumbnail BOOLEAN DEFAULT FALSE,
    thumbnail_path TEXT,
    thumbnail_size BIGINT,
    upload_status TEXT DEFAULT 'completed' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
    error_message TEXT,
    file_hash TEXT,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    is_starred BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 제약 조건
    UNIQUE(folder_id, display_filename),
    UNIQUE(storage_folder_id, stored_filename),
    CHECK(file_size > 0),
    CHECK(LENGTH(original_filename) > 0)
);

-- ================================================================
-- 2. 컬럼 주석 추가
-- ================================================================

-- folders 테이블 주석
COMMENT ON TABLE folders IS '사용자가 보는 논리적 폴더 구조';
COMMENT ON COLUMN folders.id IS '폴더 고유 식별자';
COMMENT ON COLUMN folders.user_id IS '폴더 소유자 (사용자 ID)';
COMMENT ON COLUMN folders.name IS '사용자가 설정한 폴더명';
COMMENT ON COLUMN folders.parent_id IS '상위 폴더 ID (NULL이면 루트 폴더)';
COMMENT ON COLUMN folders.full_path IS '전체 경로 캐시 (성능 최적화용)';
COMMENT ON COLUMN folders.depth IS '폴더 깊이 (루트=0, 최대 10레벨)';
COMMENT ON COLUMN folders.is_system_folder IS '시스템 폴더 여부';
COMMENT ON COLUMN folders.folder_color IS '폴더 색상 (UI용, HEX 코드)';
COMMENT ON COLUMN folders.description IS '폴더 설명';

-- storage_folders 테이블 주석
COMMENT ON TABLE storage_folders IS '실제 파일이 저장되는 물리적 폴더 관리';
COMMENT ON COLUMN storage_folders.id IS '물리적 저장 폴더 고유 식별자';
COMMENT ON COLUMN storage_folders.user_id IS '저장 폴더 소유자';
COMMENT ON COLUMN storage_folders.folder_index IS '폴더 번호 (0, 1, 2...)';
COMMENT ON COLUMN storage_folders.storage_path IS '실제 스토리지 경로';
COMMENT ON COLUMN storage_folders.file_count IS '현재 저장된 파일 개수';
COMMENT ON COLUMN storage_folders.max_file_count IS '최대 파일 개수';
COMMENT ON COLUMN storage_folders.total_size IS '저장된 파일들의 총 크기 (바이트)';
COMMENT ON COLUMN storage_folders.is_active IS '새 파일 저장 가능 여부';

-- uploaded_files 테이블 주석
COMMENT ON TABLE uploaded_files IS '파일 메타데이터 (논리적 폴더와 물리적 저장 연결)';
COMMENT ON COLUMN uploaded_files.id IS '파일 고유 식별자';
COMMENT ON COLUMN uploaded_files.user_id IS '파일 소유자';
COMMENT ON COLUMN uploaded_files.folder_id IS '논리적 상위 폴더 ID (사용자가 보는 폴더)';
COMMENT ON COLUMN uploaded_files.storage_folder_id IS '실제 저장된 물리적 폴더 ID';
COMMENT ON COLUMN uploaded_files.original_filename IS '사용자가 업로드한 원본 파일명';
COMMENT ON COLUMN uploaded_files.stored_filename IS '스토리지에 저장된 실제 파일명';
COMMENT ON COLUMN uploaded_files.display_filename IS '사용자에게 표시될 파일명';
COMMENT ON COLUMN uploaded_files.file_path IS '스토리지 내 전체 파일 경로';
COMMENT ON COLUMN uploaded_files.storage_bucket IS '저장된 버킷명';
COMMENT ON COLUMN uploaded_files.file_size IS '파일 크기 (바이트)';
COMMENT ON COLUMN uploaded_files.mime_type IS 'MIME 타입';
COMMENT ON COLUMN uploaded_files.file_type IS '파일 분류 (UI 표시용)';
COMMENT ON COLUMN uploaded_files.has_thumbnail IS '썸네일 존재 여부';
COMMENT ON COLUMN uploaded_files.thumbnail_path IS '썸네일 파일 경로';
COMMENT ON COLUMN uploaded_files.thumbnail_size IS '썸네일 파일 크기 (바이트)';
COMMENT ON COLUMN uploaded_files.upload_status IS '업로드 상태';
COMMENT ON COLUMN uploaded_files.error_message IS '업로드 실패 시 오류 메시지';
COMMENT ON COLUMN uploaded_files.file_hash IS '파일 해시값 (중복 검출용)';
COMMENT ON COLUMN uploaded_files.last_accessed_at IS '마지막 접근 시간';
COMMENT ON COLUMN uploaded_files.is_starred IS '즐겨찾기 여부';
COMMENT ON COLUMN uploaded_files.tags IS '사용자 정의 태그 배열';

-- ================================================================
-- 3. 인덱스 생성 (성능 최적화)
-- ================================================================

-- folders 테이블 인덱스
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_full_path ON folders(user_id, full_path);
CREATE INDEX idx_folders_depth ON folders(user_id, depth);

-- storage_folders 테이블 인덱스
CREATE INDEX idx_storage_folders_user_id ON storage_folders(user_id);
CREATE INDEX idx_storage_folders_active ON storage_folders(user_id, is_active);

-- uploaded_files 테이블 인덱스
CREATE INDEX idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_folder_id ON uploaded_files(folder_id);
CREATE INDEX idx_uploaded_files_storage_folder_id ON uploaded_files(storage_folder_id);
CREATE INDEX idx_uploaded_files_file_type ON uploaded_files(user_id, file_type);
CREATE INDEX idx_uploaded_files_created_at ON uploaded_files(created_at);
CREATE INDEX idx_uploaded_files_tags ON uploaded_files USING GIN(tags);
CREATE INDEX idx_uploaded_files_starred ON uploaded_files(user_id, is_starred);

-- ================================================================
-- 4. RLS (Row Level Security) 정책
-- ================================================================

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own folders" ON folders
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own storage folders" ON storage_folders
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own files" ON uploaded_files
    FOR ALL USING (auth.uid() = user_id);

-- ================================================================
-- 5. 트리거 함수들
-- ================================================================

-- 5-1. updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5-2. 폴더 경로 자동 생성/업데이트 함수
CREATE OR REPLACE FUNCTION update_folder_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
    parent_depth INTEGER;
BEGIN
    -- 루트 폴더인 경우
    IF NEW.parent_id IS NULL THEN
        NEW.full_path = '/' || NEW.name;
        NEW.depth = 0;
    ELSE
        -- 부모 폴더 정보 가져오기
        SELECT full_path, depth INTO parent_path, parent_depth
        FROM folders
        WHERE id = NEW.parent_id AND user_id = NEW.user_id;

        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Invalid parent folder';
        END IF;

        NEW.full_path = parent_path || '/' || NEW.name;
        NEW.depth = parent_depth + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5-3. 순환 참조 방지 함수
CREATE OR REPLACE FUNCTION prevent_circular_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- 자기 자신을 부모로 설정하는 것 방지
    IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'Folder cannot be its own parent';
    END IF;

    -- 하위 폴더를 부모로 설정하는 것 방지
    IF NEW.parent_id IS NOT NULL THEN
        IF EXISTS (
            WITH RECURSIVE descendants AS (
                SELECT id FROM folders WHERE parent_id = NEW.id
                UNION ALL
                SELECT f.id FROM folders f
                JOIN descendants d ON f.parent_id = d.id
            )
            SELECT 1 FROM descendants WHERE id = NEW.parent_id
        ) THEN
            RAISE EXCEPTION 'Circular reference detected';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5-4. 하위 폴더 경로 업데이트 함수
CREATE OR REPLACE FUNCTION update_descendant_paths()
RETURNS TRIGGER AS $$
BEGIN
    -- 경로가 변경된 경우 모든 하위 폴더 경로 업데이트
    IF OLD.full_path IS DISTINCT FROM NEW.full_path THEN
        UPDATE folders
        SET full_path = REPLACE(full_path, OLD.full_path || '/', NEW.full_path || '/'),
            depth = depth + (NEW.depth - OLD.depth)
        WHERE full_path LIKE OLD.full_path || '/%'
        AND user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 6. 트리거 생성
-- ================================================================

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_folders_updated_at
    BEFORE UPDATE ON storage_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploaded_files_updated_at
    BEFORE UPDATE ON uploaded_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 폴더 경로 관리 트리거
CREATE TRIGGER trigger_folder_path_insert
    BEFORE INSERT ON folders
    FOR EACH ROW EXECUTE FUNCTION update_folder_path();

CREATE TRIGGER trigger_folder_path_update
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_folder_path();

CREATE TRIGGER trigger_prevent_circular_reference
    BEFORE INSERT OR UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION prevent_circular_reference();

CREATE TRIGGER trigger_update_descendant_paths
    AFTER UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_descendant_paths();

-- ================================================================
-- 7. 유용한 뷰 생성
-- ================================================================

-- 7-1. 폴더 트리 뷰 (통계 포함)
CREATE VIEW folder_tree_view AS
WITH folder_stats AS (
    SELECT
        folder_id,
        COUNT(*) as file_count,
        SUM(file_size) as total_size
    FROM uploaded_files
    WHERE upload_status = 'completed'
    GROUP BY folder_id
)
SELECT
    f.*,
    COALESCE(fs.file_count, 0) as file_count,
    COALESCE(fs.total_size, 0) as total_size,
    (SELECT COUNT(*) FROM folders sub WHERE sub.parent_id = f.id) as subfolder_count
FROM folders f
LEFT JOIN folder_stats fs ON f.id = fs.folder_id;

-- 7-2. 파일 상세 정보 뷰
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
-- 8. 편의 함수들
-- ================================================================

-- 8-1. 사용자의 루트 폴더 가져오기/생성
CREATE OR REPLACE FUNCTION get_or_create_user_root(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    root_folder_id UUID;
BEGIN
    SELECT id INTO root_folder_id
    FROM folders
    WHERE user_id = p_user_id AND parent_id IS NULL AND name = 'My Files';

    IF root_folder_id IS NULL THEN
        INSERT INTO folders (user_id, name, parent_id, is_system_folder)
        VALUES (p_user_id, 'My Files', NULL, TRUE)
        RETURNING id INTO root_folder_id;
    END IF;

    RETURN root_folder_id;
END;
$$ LANGUAGE plpgsql;

-- 8-2. 활성 저장 폴더 가져오기/생성
CREATE OR REPLACE FUNCTION get_or_create_active_storage_folder(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    storage_folder_id UUID;
    next_index INTEGER;
    storage_path TEXT;
BEGIN
    -- 활성 저장 폴더 찾기
    SELECT id INTO storage_folder_id
    FROM storage_folders
    WHERE user_id = p_user_id AND is_active = TRUE
    ORDER BY folder_index DESC
    LIMIT 1;

    -- 활성 폴더가 없으면 새로 생성
    IF storage_folder_id IS NULL THEN
        SELECT COALESCE(MAX(folder_index), -1) + 1 INTO next_index
        FROM storage_folders
        WHERE user_id = p_user_id;

        storage_path := p_user_id::text || '/folder_' || LPAD(next_index::text, 3, '0');

        INSERT INTO storage_folders (user_id, folder_index, storage_path)
        VALUES (p_user_id, next_index, storage_path)
        RETURNING id INTO storage_folder_id;
    END IF;

    RETURN storage_folder_id;
END;
$$ LANGUAGE plpgsql;

-- 8-3. 폴더 트리 조회 함수
CREATE OR REPLACE FUNCTION get_folder_tree(p_user_id UUID, p_parent_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    parent_id UUID,
    full_path TEXT,
    depth INTEGER,
    file_count BIGINT,
    total_size BIGINT,
    subfolder_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE folder_tree AS (
        -- 루트 레벨
        SELECT
            f.id, f.name, f.parent_id, f.full_path, f.depth,
            f.file_count, f.total_size, f.subfolder_count, f.created_at
        FROM folder_tree_view f
        WHERE f.user_id = p_user_id
        AND f.parent_id IS NOT DISTINCT FROM p_parent_id

        UNION ALL

        -- 재귀적으로 하위 폴더들
        SELECT
            f.id, f.name, f.parent_id, f.full_path, f.depth,
            f.file_count, f.total_size, f.subfolder_count, f.created_at
        FROM folder_tree_view f
        INNER JOIN folder_tree ft ON f.parent_id = ft.id
        WHERE f.user_id = p_user_id
    )
    SELECT * FROM folder_tree ORDER BY full_path;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 완료 메시지
-- ================================================================
DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '✅ 깔끔한 폴더 시스템이 생성되었습니다!';
    RAISE NOTICE '';
    RAISE NOTICE '📁 생성된 테이블:';
    RAISE NOTICE '   - folders: 논리적 폴더 구조';
    RAISE NOTICE '   - storage_folders: 물리적 저장 관리';
    RAISE NOTICE '   - uploaded_files: 파일 메타데이터';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 생성된 기능:';
    RAISE NOTICE '   - 자동 경로 생성/업데이트';
    RAISE NOTICE '   - 순환 참조 방지';
    RAISE NOTICE '   - 통계 뷰';
    RAISE NOTICE '   - 편의 함수들';
    RAISE NOTICE '=======================================================';
END $$;