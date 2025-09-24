# Image Uploader

Next.js 15 기반의 파일 업로드 애플리케이션으로, Supabase 인증과 자체 호스팅 백엔드를 사용합니다.

## 🎯 주요 기능

### ✨ 새로운 폴더 시스템 (v2.0)
- **진짜 폴더 트리 구조**: 사용자가 자유롭게 폴더를 생성하고 계층 구조 구성
- **드래그&드롭 파일 이동**: 실제 파일은 그대로, 메타데이터만 변경으로 빠른 이동
- **스마트 저장**: 물리적 저장과 논리적 구조 분리로 성능과 유연성 동시 확보
- **파일 관리**: 즐겨찾기, 태그, 파일 이름 변경, 폴더별 통계

### 🔧 기술 스택
- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Supabase (자체 호스팅), PostgreSQL
- **인증**: Supabase Auth (Google OAuth)
- **스토리지**: Supabase Storage (자체 호스팅)
- **상태관리**: Zustand
- **폼 검증**: React Hook Form + Zod

## 📊 데이터베이스 구조

### 🏗️ 아키텍처 개념

```
📁 논리적 구조 (사용자가 보는 것)
├── 내 사진/
│   ├── 2024년/
│   │   ├── 여행/
│   │   │   └── 제주도/ ← 사용자가 보는 폴더
│   │   └── 일상/
│   └── 업무/

💾 물리적 저장 (Supabase Storage)
├── userId/folder_000/ ← 실제 파일 위치
├── userId/folder_001/
└── userId/folder_002/
```

### 📋 테이블 구조

#### 1. `folders` - 논리적 폴더 구조
사용자가 보는 폴더 트리 구조를 관리
```sql
- id: 폴더 고유 식별자 (UUID)
- user_id: 소유자 ID
- name: 폴더명 (예: "여행 사진", "업무 문서")
- parent_id: 상위 폴더 ID (NULL이면 루트)
- full_path: 전체 경로 캐시 (예: "/내 사진/2024년/여행")
- depth: 폴더 깊이 (0~10)
- folder_color: UI 폴더 색상
- description: 폴더 설명
```

#### 2. `storage_folders` - 물리적 저장 관리
실제 Supabase Storage 폴더 관리 (기존 folder_counters 개선)
```sql
- id: 물리적 폴더 식별자
- user_id: 소유자 ID
- folder_index: 폴더 번호 (0, 1, 2...)
- storage_path: 실제 경로 (userId/folder_000)
- file_count: 현재 파일 개수
- max_file_count: 최대 파일 개수 (기본 1000)
- total_size: 총 파일 크기
- is_active: 새 파일 저장 가능 여부
```

#### 3. `uploaded_files` - 파일 메타데이터
논리적 폴더와 물리적 저장을 연결
```sql
- id: 파일 식별자
- user_id: 소유자 ID
- folder_id: 논리적 폴더 ID ← 사용자가 보는 폴더
- storage_folder_id: 물리적 폴더 ID ← 실제 저장 위치
- original_filename: 원본 파일명
- stored_filename: 저장된 파일명 (충돌 방지)
- display_filename: 표시용 파일명 (이름 변경 시)
- file_size, mime_type, file_type
- has_thumbnail, thumbnail_path
- is_starred: 즐겨찾기
- tags: 사용자 태그 배열
```

### 🔄 파일 이동 시스템

```sql
-- 파일을 다른 폴더로 "이동"
UPDATE uploaded_files
SET folder_id = '새폴더ID'
WHERE id = '파일ID';

-- 실제 Storage의 파일은 그대로!
-- userId/folder_000/abc123.jpg (변경 없음)
```

## 🚀 새로운 기능

### 📁 폴더 시스템
- **무제한 계층**: 최대 10단계 깊이까지 폴더 중첩
- **자유로운 폴더명**: "여행 사진", "프로젝트 A" 등 원하는 이름
- **폴더 색상**: UI에서 폴더별 색상 지정
- **폴더 통계**: 파일 개수, 총 크기, 하위 폴더 개수

### 🎯 파일 관리
- **즐겨찾기**: 중요한 파일 북마크
- **태그 시스템**: 여러 태그로 파일 분류
- **파일 검색**: 이름, 태그, 파일 타입별 검색
- **파일 이름 변경**: 실제 파일은 그대로, 표시명만 변경

### ⚡ 성능 최적화
- **하이브리드 방식**: Adjacency List + Path Enumeration
- **인덱스 최적화**: 사용자별, 폴더별, 파일 타입별 빠른 조회
- **캐시된 경로**: full_path로 빠른 경로 조회

## 🔧 설치 및 설정

### 데이터베이스 마이그레이션

#### 새 설치 (권장)
```sql
-- 깔끔한 새 폴더 시스템 생성 (기존 데이터 삭제됨)
database/03_clean_folder_system.sql
```

#### 기존 시스템 업그레이드 (데이터 보존)
```sql
-- 1. 기존 테이블들 생성 (호환성)
database/01_create_upload_tables.sql

-- 2. file_type 컬럼 추가
database/02_add_file_type_column.sql

-- 3. 새로운 폴더 시스템으로 변환
database/03_clean_folder_system.sql
```

### API 엔드포인트

#### 새로운 업로드 API
```typescript
POST /api/upload
Content-Type: multipart/form-data

// FormData
files: File[]           // 업로드할 파일들
folderId?: string       // 선택적 대상 폴더 ID

// Response
{
  results: [
    {
      success: true,
      fileName: "photo.jpg",
      fileId: "uuid",
      folderId: "uuid"    // 논리적 폴더 ID
    }
  ],
  metadata: {
    newFolderSystemEnabled: true
  }
}
```

#### 폴더 관리 API
```typescript
// 폴더 트리 조회
GET /api/folders/tree

// 폴더 생성
POST /api/folders
{ name: "새 폴더", parentId?: "uuid" }

// 파일 이동
PUT /api/files/:fileId/move
{ targetFolderId: "uuid" }

// 폴더별 파일 조회
GET /api/folders/:folderId/files
```

## 💡 사용 예시

### 폴더 구조 예시
```
📁 My Files (루트)
├── 📁 개인
│   ├── 📁 사진
│   │   ├── 📁 2024년
│   │   │   ├── 📁 여행
│   │   │   └── 📁 일상
│   │   └── 📁 2023년
│   └── 📁 문서
└── 📁 업무
    ├── 📁 프로젝트 A
    └── 📁 프로젝트 B
```

### TypeScript 사용법
```typescript
import { getUserFolderTree, moveFileToFolder } from '@/utils/folder-system';

// 폴더 트리 조회
const folderTree = await getUserFolderTree(userId);

// 파일 이동 (실제 파일은 그대로, DB만 변경)
await moveFileToFolder(fileId, targetFolderId, userId);

// 특정 폴더의 파일 목록
const files = await getFolderFiles(folderId, userId, {
  fileType: 'image',
  sortBy: 'created_at',
  limit: 20
});
```

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