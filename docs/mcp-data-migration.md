# MCP 서버 — Apps Script/Sheets → MongoDB Cloud 마이그레이션 도구

Apps Script API 의 원천 데이터(Google Drive 스프레드시트)를 **MongoDB Cloud(Atlas)** 로 옮기기 위해,
프로젝트 루트 [.mcp.json](../.mcp.json) 에 MCP 서버 2개를 등록해 두었다.

| 서버 | 패키지 | 역할 |
|------|--------|------|
| `gdrive` | [`@isaacphi/mcp-gdrive`](https://www.npmjs.com/package/@isaacphi/mcp-gdrive) | 원천 Drive 파일 / Google Sheets **읽기** |
| `mongodb` | [`mongodb-mcp-server`](https://www.npmjs.com/package/mongodb-mcp-server) (공식) | Atlas 클러스터에 **쓰기/조회** |

## 비밀값 취급 — 중요

`.mcp.json` 은 git 에 커밋되지만 **비밀값은 들어가지 않는다.** 각 `env` 값은 `${VAR}` 참조이며,
실제 값은 **Claude Code 를 실행하는 셸/OS 의 환경변수**에서 확장된다.

> ⚠️ Claude Code 의 `.mcp.json` 변수 확장은 Next.js 의 `.env.local` 을 읽지 않는다.
> 아래 변수들은 **OS/사용자 환경변수**(또는 `claude` 실행 전 셸 export)로 설정해야 한다.

설정해야 하는 환경변수:

| 변수 | 서버 | 설명 |
|------|------|------|
| `GDRIVE_CLIENT_ID` | gdrive | Google OAuth 클라이언트 ID (아래 발급) |
| `GDRIVE_CLIENT_SECRET` | gdrive | Google OAuth 클라이언트 시크릿 |
| `GDRIVE_CREDS_DIR` | gdrive | (선택) OAuth 토큰 저장 폴더. 미설정 시 `./.gdrive-creds` (gitignore 됨) |
| `MDB_MCP_CONNECTION_STRING` | mongodb | Atlas 연결 문자열 (비밀번호 포함 — 절대 커밋 금지) |

---

## 1. Google Drive MCP (`gdrive`)

원천 스프레드시트를 읽기 위한 OAuth 클라이언트를 발급한다.
**사용자 로그인용 웹 OAuth 클라이언트(`GOOGLE_CLIENT_ID`)와는 별개**다 — MCP 는 로컬 브라우저 플로우를
쓰므로 **데스크톱 앱** 유형 클라이언트가 필요하다.

1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 선택/생성.
2. **API 및 서비스 → 라이브러리** 에서 다음을 사용 설정:
   - Google Drive API
   - Google Sheets API
3. **OAuth 동의 화면** 구성(외부, 테스트 사용자에 본인 계정 추가).
4. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID → 애플리케이션 유형: 데스크톱 앱**.
5. 발급된 ID/시크릿을 환경변수로 설정:
   - `GDRIVE_CLIENT_ID`, `GDRIVE_CLIENT_SECRET`
6. Claude Code 재시작 후 `gdrive` 서버 최초 실행 시 브라우저 인증 창이 뜬다. 승인하면 토큰이
   `GDRIVE_CREDS_DIR`(기본 `./.gdrive-creds`)에 저장된다 — 이 폴더는 gitignore 되어 있다.

## 2. MongoDB Cloud MCP (`mongodb`)

1. [MongoDB Atlas](https://cloud.mongodb.com/) 에서 클러스터 생성(M0 무료 등).
2. **Database Access** 에서 DB 사용자 생성, **Network Access** 에서 접속 IP 허용
   (로컬 작업 시 본인 IP, Vercel 런타임은 별도 — 운영 연결 문자열은 앱의 `.env.local`/Vercel 환경변수로 관리).
3. **Connect → Drivers** 에서 연결 문자열 복사 후 비밀번호 치환:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority`
4. 이 값을 `MDB_MCP_CONNECTION_STRING` 환경변수로 설정.

> 앱 런타임이 Mongo 에 붙는 연결 문자열은 Vercel **프로젝트 환경변수**로 따로 관리한다.
> 여기 `MDB_MCP_CONNECTION_STRING` 은 **로컬 개발 도구(MCP)** 전용이다.

---

## Windows 환경변수 설정 예

PowerShell 에서 사용자 영구 환경변수로 설정(설정 후 Claude Code 재시작 필요):

```powershell
setx GDRIVE_CLIENT_ID "xxxxx.apps.googleusercontent.com"
setx GDRIVE_CLIENT_SECRET "xxxxx"
setx MDB_MCP_CONNECTION_STRING "mongodb+srv://user:pass@cluster.mongodb.net/fashion?retryWrites=true&w=majority"
```

## 확인

Claude Code 재시작 후 `/mcp` 실행 → `gdrive`, `mongodb` 두 서버가 **connected** 로 보이면 완료.

> Windows 에서 `npx` 인식 실패 시, 해당 서버의 `command` 를 `"cmd"`, `args` 앞에 `"/c", "npx"` 형태로 바꾼다.
