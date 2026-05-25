# Fashion API 설정 가이드

이 앱은 Google Apps Script를 통해 스프레드시트를 데이터베이스로 사용합니다.

## 1. Google Apps Script 설정

### 1-1. Apps Script 프로젝트 열기

1. 아래 Apps Script 프로젝트로 이동 (서버 코드 원본 위치):
   https://script.google.com/u/0/home/projects/11MzB0opiGkHBdjx5OLtAqL4EMkV31u2tOZqGEbX1r9Ap4Lnkv-elzzax/edit
2. 자체 환경에 사본이 필요하면 코드를 복사해 새 Apps Script 프로젝트에 붙여넣고 저장 (Ctrl+S 또는 Cmd+S)

### 1-2. 초기 설정 실행

Apps Script 에디터에서 다음 함수들을 순서대로 실행:

```javascript
// 1. 스프레드시트 생성 및 초기화
setupFashionSpreadsheet()

// 2. API 토큰 생성 (로그에 출력된 토큰을 복사)
setApiToken()
```

실행 결과:
- 스프레드시트가 생성됩니다
- 샘플 데이터가 입력됩니다
- API 토큰이 생성됩니다 (로그 확인)

### 1-3. Web App 배포

1. Apps Script 에디터 우측 상단 "배포" > "새 배포" 클릭
2. 유형 선택: "웹 앱"
3. 설정:
   - **실행 계정**: 나
   - **액세스 권한**: 모든 사용자
4. "배포" 클릭
5. **배포 URL 복사** (예: `https://script.google.com/macros/s/AKfycbx.../exec`)

## 2. 앱에 API URL 설정

브라우저는 same-origin `/api/fashion` 만 호출하며, Apps Script URL/토큰은 **서버 환경 변수**로만 보관합니다 (`app/api/fashion/route.ts` 및 `src/lib/server/appsScript.ts` 에서 사용).

로컬 개발: 프로젝트 루트의 `.env.local` (gitignore 됨) 에 다음 두 값을 채웁니다 — 템플릿은 [.env.example](.env.example) 참고:

```bash
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
APPS_SCRIPT_TOKEN=YOUR_GENERATED_TOKEN
```

배포 (Vercel): Project Settings → Environment Variables 에 동일한 두 키를 등록합니다. `NEXT_PUBLIC_` 접두사를 절대 붙이지 마세요 — 토큰이 클라이언트 번들로 새어 나갑니다.

## 3. API 엔드포인트

### GET 요청 (데이터 조회)

```bash
# 전체 목록
GET /exec

# 날씨별 조회
GET /exec?weather=sunny

# 성별 조회
GET /exec?gender=female

# 기온별 조회
GET /exec?temperature=28
GET /exec?temperature_band=hot

# 복합 조건
GET /exec?weather=sunny&gender=female&temperature=28
```

### POST 요청 (데이터 생성/수정/삭제)

```bash
# 데이터 추가/수정 (upsert)
POST /exec
{
  "token": "728185da-bc7f-476a-b3d4-c977556dcc8f",
  "action": "upsert",
  "item": {
    "id": "LOOK_001",
    "weather": "sunny",
    "temperature_avg_c": 28,
    "gender": "female",
    "fashion_category": "casual",
    "top": "white shirt",
    "bottom": "beige shorts",
    "description": "여름 캐주얼 룩",
    "image_prompt": "summer casual outfit..."
  }
}

# 데이터 삭제
POST /exec
{
  "token": "728185da-bc7f-476a-b3d4-c977556dcc8f",
  "action": "delete",
  "id": "LOOK_001"
}
```

## 4. 스프레드시트 직접 편집

Google Spreadsheet에서 직접 데이터를 추가/수정할 수도 있습니다:

1. Apps Script 에디터에서 `getSpreadsheetUrl()` 함수 실행
2. 로그에 출력된 URL로 이동
3. 데이터 입력/수정

### 필수 필드

- `weather`: sunny, cloudy, rainy, snowy, windy, foggy
- `gender`: male, female, unisex
- `temperature_band`: freezing, cold, cool, mild, warm, hot
- `fashion_category`: casual, street, minimal, formal, sporty, business, date, travel

## 5. 테스트

브라우저에서 테스트:

```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=health
```

응답:
```json
{
  "success": true,
  "message": "Fashion API is running",
  "timestamp": "2026-05-11T..."
}
```

## 문제 해결

### CORS 에러
- Apps Script Web App은 자동으로 CORS를 허용합니다
- 배포 시 "모든 사용자" 액세스 권한 확인

### 401 인증 오류
- API 토큰이 정확한지 확인
- `setApiToken()` 함수를 다시 실행하여 새 토큰 생성

### 데이터가 안 보임
- 스프레드시트의 `active` 열이 체크되어 있는지 확인
- Apps Script 실행 로그 확인

## 참고

- 제공된 스프레드시트 URL: https://docs.google.com/spreadsheets/d/13w_XLQWRMBzu8w0RkJB8nVBOeh9grnH2kgZv6YCXO14/edit
- 현재 API는 Mock 데이터로 동작하며, Web App 배포 후 실제 데이터로 전환됩니다.
