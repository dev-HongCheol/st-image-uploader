# Image Uploader

Next.js 15 기반의 이미지 업로드 애플리케이션으로, Supabase 인증과 자체 호스팅 백엔드를 사용합니다.

## 데이터베이스 구조

### 테이블 설명

#### `folder_counters`
사용자별 폴더 관리 및 파일 개수 추적
- `id`: 기본키 (UUID)
- `user_id`: 사용자 ID (auth.users 참조)
- `folder_index`: 폴더 인덱스 (0부터 시작)
- `file_count`: 폴더 내 파일 개수
- `created_at`, `updated_at`: 생성/수정 시간

#### `uploaded_files`
업로드된 파일의 메타데이터 저장
- `id`: 기본키 (UUID)
- `user_id`: 사용자 ID
- `folder_path`: 폴더 경로 (예: `user123/folder_001`)
- `folder_index`: 폴더 인덱스
- `original_filename`: 원본 파일명
- `stored_filename`: 저장된 파일명
- `file_path`: 전체 저장 경로
- `file_size`: 파일 크기 (bytes)
- `mime_type`: MIME 타입
- `storage_bucket`: 저장소 버킷명 (기본: 'originals')
- `has_thumbnail`: 썸네일 존재 여부
- `thumbnail_path`: 썸네일 경로 (선택사항)
- `thumbnail_size`: 썸네일 크기 (bytes)
- `upload_status`: 업로드 상태 (`uploading`, `completed`, `failed`)
- `error_message`: 오류 메시지 (선택사항)

### 폴더 및 파일 네이밍 구조

#### 폴더 구조
```
{user_id}/folder_{index}/
```
- 예시: `user123/folder_001/`, `user123/folder_002/`
- 각 폴더당 최대 1,000개 파일
- 폴더 인덱스는 3자리 0 패딩

#### 파일명 구조
```
{timestamp}_{original_filename}
```
- 예시: `1703123456789_image.jpg`
- 타임스탬프로 파일명 중복 방지

#### 썸네일 구조
```
{user_id}/thumbnails/folder_{index}/thumb_{timestamp}_{original_filename}
```
- 예시: `user123/thumbnails/folder_001/thumb_1703123456789_image.jpg`

### 보안 정책
- **RLS (Row Level Security)** 활성화
- 사용자는 자신의 데이터만 접근 가능
- 모든 테이블에 사용자별 격리 정책 적용

### 데이터베이스 초기화
1. `database/01_create_upload_tables.sql` 파일을 Supabase SQL Editor에서 실행
2. 테이블, 인덱스, RLS 정책이 자동 생성됨

# Supabase Self Hosting
### docker
- https://supabase.com/docs/guides/self-hosting
- postgres의 비밀번호 변경
  - 변경하기 위해서 .env파일의 `POSTGRES_PASSWORD` 변경 시 일부 컨테이너에서 비밀번호 에러가 발생함.(모든 컨테이너의 설정이 정상적으로 변경이 안되는 것으로 보임)
  - https://github.com/supabase/supabase/issues/22605#issuecomment-2455781878
    - 일부 계정이 없다고 에러 나지만 우선 대시보드 클릭한 메뉴들 중에 오류를 표시하는 경우는 현재 없음.

### google auth 설정
- id, password 방식만 기본적으로 지원하여 google auth를 사용하기 위한 설정 추가
- https://www.reddit.com/r/Supabase/comments/1h46b6d/set_up_selfhosted_supabase_auth_with_github_oauth/
    ```yml
    auth
        environment
            GOTRUE_EXTERNAL_GOOGLE_ENABLED: "true"
            GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: "..."
            GOTRUE_EXTERNAL_GOOGLE_SECRET: "..."
            GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: "..."
    ```



## todo
1. 나말고는 회원가입 막기.(현재는 구글 로그인이라..자동회원가입임. 하지만 내 메일을 체크해서 나머지는 막는 형태)