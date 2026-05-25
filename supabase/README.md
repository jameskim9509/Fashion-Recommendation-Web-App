# Supabase migrations

관리자 인증 (admins / sessions 테이블) 의 스키마를 버전 관리합니다.
앱은 Supabase Auth 를 사용하지 않고 본 테이블 + 자체 비밀번호 해시 + 쿠키 세션을 사용합니다 ([src/lib/server/auth.ts](../src/lib/server/auth.ts) 참고).

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
