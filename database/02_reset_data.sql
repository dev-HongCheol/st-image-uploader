-- ================================================================
-- 테이블 데이터 초기화 스크립트
-- ================================================================
--
-- ⚠️ 주의사항:
-- 1. 이 스크립트는 모든 업로드 데이터를 삭제합니다!
-- 2. Supabase Storage의 실제 파일은 삭제되지 않습니다
-- 3. 실행 전 반드시 백업을 생성하세요
-- 4. 개발/테스트 환경에서만 사용하세요
-- ================================================================

-- 실행 확인용 메시지
DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '⚠️  데이터 초기화 스크립트 실행 중...';
    RAISE NOTICE '   모든 업로드 데이터가 삭제됩니다!';
    RAISE NOTICE '=======================================================';
END $$;

-- ================================================================
-- 1. 기존 데이터 백업 (선택사항)
-- ================================================================

-- 백업 테이블 생성 (타임스탬프 포함)
CREATE TABLE IF NOT EXISTS uploaded_files_backup AS
SELECT *, NOW() as backup_created_at
FROM uploaded_files
WHERE FALSE; -- 구조만 복사

CREATE TABLE IF NOT EXISTS folders_backup AS
SELECT *, NOW() as backup_created_at
FROM folders
WHERE FALSE;

CREATE TABLE IF NOT EXISTS storage_folders_backup AS
SELECT *, NOW() as backup_created_at
FROM storage_folders
WHERE FALSE;

-- 현재 데이터를 백업 테이블에 저장
INSERT INTO uploaded_files_backup
SELECT *, NOW() as backup_created_at FROM uploaded_files;

INSERT INTO folders_backup
SELECT *, NOW() as backup_created_at FROM folders;

INSERT INTO storage_folders_backup
SELECT *, NOW() as backup_created_at FROM storage_folders;

-- 백업 완료 메시지
DO $$
DECLARE
    files_count INTEGER;
    folders_count INTEGER;
    storage_folders_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO files_count FROM uploaded_files_backup;
    SELECT COUNT(*) INTO folders_count FROM folders_backup;
    SELECT COUNT(*) INTO storage_folders_count FROM storage_folders_backup;

    RAISE NOTICE '✅ 백업 완료:';
    RAISE NOTICE '   - 파일: % 개', files_count;
    RAISE NOTICE '   - 폴더: % 개', folders_count;
    RAISE NOTICE '   - 저장 폴더: % 개', storage_folders_count;
END $$;

-- ================================================================
-- 2. 모든 데이터 삭제 (의존성 순서 고려)
-- ================================================================

-- 2-1. 파일 데이터 삭제 (가장 하위 레벨)
DELETE FROM uploaded_files;

-- 2-2. 논리적 폴더 삭제 (부모-자식 관계 고려)
WITH RECURSIVE folder_hierarchy AS (
    -- 최하위 폴더들 (자식이 없는 폴더)
    SELECT id, parent_id, name, depth
    FROM folders f1
    WHERE NOT EXISTS (
        SELECT 1 FROM folders f2 WHERE f2.parent_id = f1.id
    )

    UNION ALL

    -- 재귀적으로 상위 폴더들
    SELECT f.id, f.parent_id, f.name, f.depth
    FROM folders f
    INNER JOIN folder_hierarchy fh ON f.id = fh.parent_id
)
DELETE FROM folders
WHERE id IN (SELECT id FROM folder_hierarchy);

-- 남은 폴더가 있다면 모두 삭제 (안전장치)
DELETE FROM folders;

-- 2-3. 물리적 저장 폴더 삭제
DELETE FROM storage_folders;

-- ================================================================
-- 3. 삭제 결과 확인
-- ================================================================

DO $$
DECLARE
    remaining_files INTEGER;
    remaining_folders INTEGER;
    remaining_storage_folders INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_files FROM uploaded_files;
    SELECT COUNT(*) INTO remaining_folders FROM folders;
    SELECT COUNT(*) INTO remaining_storage_folders FROM storage_folders;

    RAISE NOTICE '';
    RAISE NOTICE '📊 삭제 결과:';
    RAISE NOTICE '   - 남은 파일: % 개', remaining_files;
    RAISE NOTICE '   - 남은 폴더: % 개', remaining_folders;
    RAISE NOTICE '   - 남은 저장 폴더: % 개', remaining_storage_folders;

    IF remaining_files = 0 AND remaining_folders = 0 AND remaining_storage_folders = 0 THEN
        RAISE NOTICE '✅ 모든 데이터가 성공적으로 삭제되었습니다!';
    ELSE
        RAISE NOTICE '⚠️  일부 데이터가 남아있습니다. 수동 확인이 필요합니다.';
    END IF;
END $$;

-- ================================================================
-- 4. Supabase Storage 정리 안내
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📝 추가 작업 필요사항:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Supabase Storage 버킷 정리:';
    RAISE NOTICE '   - originals 버킷의 모든 파일 삭제';
    RAISE NOTICE '   - thumbnails 버킷의 모든 파일 삭제';
    RAISE NOTICE '';
    RAISE NOTICE '2. 수동으로 Storage 정리하는 방법:';
    RAISE NOTICE '   - Supabase Dashboard → Storage → 각 버킷 → 모든 파일 선택 후 삭제';
    RAISE NOTICE '   - 또는 API/SDK를 통한 일괄 삭제';
    RAISE NOTICE '';
    RAISE NOTICE '3. 백업 테이블 정리 (필요시):';
    RAISE NOTICE '   DROP TABLE uploaded_files_backup;';
    RAISE NOTICE '   DROP TABLE folders_backup;';
    RAISE NOTICE '   DROP TABLE storage_folders_backup;';
    RAISE NOTICE '';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '✅ 데이터 초기화 스크립트 완료!';
    RAISE NOTICE '=======================================================';
END $$;
