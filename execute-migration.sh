#!/bin/bash

# SQL 마이그레이션 실행 스크립트
# uploaded_files 테이블에 file_type 컬럼을 추가하는 마이그레이션을 실행합니다.

echo "🔧 Supabase 마이그레이션 실행 중..."

# 환경변수 로드
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# SQL 마이그레이션 파일 읽기
SQL_FILE="database/02_add_file_type_column.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL 파일을 찾을 수 없습니다: $SQL_FILE"
  exit 1
fi

echo "📁 SQL 파일 읽는 중: $SQL_FILE"
echo "실행할 SQL 내용:"
echo "---"
cat "$SQL_FILE"
echo "---"

# 개별 SQL 명령문 실행
echo ""
echo "⚡ 1단계: file_type 컬럼 추가 중..."
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{
    "sql": "ALTER TABLE uploaded_files ADD COLUMN file_type TEXT CHECK (file_type IN ('"'"'image'"'"', '"'"'video'"'"', '"'"'other'"'"'));"
  }'

echo ""
echo "⚡ 2단계: 기존 데이터 업데이트 중..."
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{
    "sql": "UPDATE uploaded_files SET file_type = CASE WHEN mime_type LIKE '"'"'image/%'"'"' THEN '"'"'image'"'"' WHEN mime_type LIKE '"'"'video/%'"'"' THEN '"'"'video'"'"' ELSE '"'"'other'"'"' END WHERE file_type IS NULL;"
  }'

echo ""
echo "⚡ 3단계: 기본값 설정 중..."
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{
    "sql": "ALTER TABLE uploaded_files ALTER COLUMN file_type SET DEFAULT '"'"'other'"'"';"
  }'

echo ""
echo "🎉 마이그레이션 완료!"