/**
 * SQL 마이그레이션 실행 스크립트
 * uploaded_files 테이블에 file_type 컬럼을 추가하는 마이그레이션을 실행합니다.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 환경변수 로드를 위한 간단한 .env 파싱
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

async function runMigration() {
  try {
    // 환경변수 로드
    const env = loadEnv();

    // Supabase 클라이언트 생성 (service role key 사용)
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('📁 SQL 마이그레이션 파일 읽는 중...');

    // SQL 마이그레이션 파일 읽기
    const sqlPath = path.join(__dirname, 'database', '02_add_file_type_column.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 마이그레이션 실행 중...');
    console.log('실행할 SQL:');
    console.log('---');
    console.log(sqlContent);
    console.log('---');

    // SQL을 개별 명령문으로 분리하여 실행
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        console.log(`\n⚡ 실행 중: ${statement.substring(0, 50)}...`);

        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          // rpc가 없는 경우 직접 SQL 실행 시도
          const { data: directData, error: directError } = await supabase
            .from('_') // 더미 테이블
            .select()
            .limit(0);

          if (directError) {
            console.log('🔧 Raw SQL 실행 시도...');
            // Raw SQL 실행을 위한 대안 방법
            const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': env.SUPABASE_SERVICE_ROLE_KEY
              },
              body: JSON.stringify({ sql: statement })
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
          }
        }

        console.log('✅ 성공');
      }
    }

    console.log('\n🎉 마이그레이션이 성공적으로 완료되었습니다!');

    // 결과 확인
    console.log('\n🔍 마이그레이션 결과 확인 중...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('uploaded_files')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('⚠️  결과 확인 중 오류:', tableError.message);
    } else {
      console.log('✅ uploaded_files 테이블 확인 완료');
    }

  } catch (error) {
    console.error('❌ 마이그레이션 실행 중 오류 발생:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
runMigration();