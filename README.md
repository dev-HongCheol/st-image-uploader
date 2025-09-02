# supabase self hosting
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