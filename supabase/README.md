# Supabase migrations

다음 두 가지 인증 도메인의 스키마를 버전 관리합니다. 둘 다 **Supabase Auth 를 사용하지 않고** 자체 테이블 + 쿠키 세션을 씁니다.

- **관리자**: admins / sessions 테이블 + scrypt 비밀번호 해시 ([src/lib/server/auth.ts](../src/lib/server/auth.ts))
- **일반 사용자**: users / user_sessions / user_favorites 테이블 + OAuth 2.0 (Google·Kakao) ([src/lib/server/user-auth.ts](../src/lib/server/user-auth.ts))

## 첫 셋업 (한 번만)

1. Supabase 프로젝트 생성: https://supabase.com/dashboard → New project (Free 티어 OK)
2. Supabase CLI 설치 — 택일:
   - Windows: `scoop install supabase` (또는 [GitHub Releases](https://github.com/supabase/cli/releases) 바이너리)
   - macOS: `brew install supabase/tap/supabase`
   - 자세히: https://supabase.com/docs/guides/cli
3. CLI 로그인 + 프로젝트 link:
   ```bash
   supabase login                       # 브라우저로 토큰 발급
   supabase link --project-ref <ref>    # ref 는 프로젝트 URL https://<ref>.supabase.co 에서 추출
   ```
4. 환경변수 채우기 — `.env.local` 에 다음 두 값 입력 ([.env.example](../.env.example) 참고):
   ```
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role key from Project Settings → API>
   ```

## 마이그레이션 적용

```bash
supabase db push     # supabase/migrations/ 의 미적용 .sql 을 remote 프로젝트에 순차 적용
```

상태 확인:
```bash
supabase migration list   # local vs remote 적용 현황
```

## 새 마이그레이션 추가

```bash
supabase migration new <짧은_설명>     # supabase/migrations/<timestamp>_<설명>.sql 생성
# 파일 편집 후
supabase db push
```

## 로컬 개발 (선택)

원격 프로젝트 대신 로컬 Postgres 로 작업하려면:
```bash
supabase start       # Docker 기반 로컬 스택 부팅 (DB + Studio)
supabase db reset    # migrations + seed 재적용
```
이 경우 `.env.local` 의 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 를 `supabase status` 가 출력하는 로컬 값으로 바꿔야 합니다.

## 테스트 관리자 계정

[20260525000000_admin_auth.sql](migrations/20260525000000_admin_auth.sql) 가 다음 계정을 자동 시드합니다:

- username: `admin`
- password: `admin1234!`

비밀번호 해시는 scrypt 사전 계산값 (재현 가능). 운영 배포 전 별도 마이그레이션으로 비번 교체 또는 행 삭제 후 새 관리자 등록 권장.

## 사용자 OAuth 로그인 (Google · Kakao)

[20260531000000_user_oauth.sql](migrations/20260531000000_user_oauth.sql) 가 `users` / `user_sessions` / `user_favorites` 테이블을 만듭니다. 적용은 위 "마이그레이션 적용" 과 동일하게 `supabase db push`.

OAuth 제공자 콘솔에서 클라이언트를 발급하고 **redirect URI** 를 등록해야 합니다:

- Google: `<origin>/api/auth/oauth/google/callback`
- Kakao: `<origin>/api/auth/oauth/kakao/callback`

`<origin>` 은 로컬 `http://localhost:3000`, 운영은 배포 도메인. 프록시로 origin 과 외부 URL 이 다르면 `OAUTH_REDIRECT_BASE_URL` 로 고정할 수 있습니다.

발급한 값을 `.env.local` (운영은 Vercel 환경변수) 에 입력 ([.env.example](../.env.example) 참고):

```ini
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
KAKAO_CLIENT_ID=...          # 카카오 "REST API 키"
KAKAO_CLIENT_SECRET=         # [카카오 로그인 → 보안] 에서 사용함으로 켠 경우에만
```

제공자별 동의항목: Google 은 `openid email profile`, Kakao 는 `profile_nickname,profile_image` 를 요청합니다 (Kakao 는 콘솔의 동의항목 설정과 일치해야 함 — 요청하는 항목이 콘솔에서 활성화돼 있지 않으면 `KOE006` 오류). Kakao 의 `account_email` 은 비즈니스 앱 전환이 필요해 기본 scope 에서 제외했고, 이 경우 사용자 `email` 은 `null` 로 저장됩니다(테이블상 nullable). 세션은 `user_session` 쿠키로 30일 유지되며, 무효화하려면 `public.user_sessions` 행을 삭제하면 됩니다.
