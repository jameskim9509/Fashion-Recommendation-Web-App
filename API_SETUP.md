# Fashion API 설정 가이드

이 앱은 Google Apps Script를 통해 스프레드시트를 데이터베이스로 사용합니다.

## 1. Google Apps Script 설정

### 1-1. Apps Script 프로�ェ트 생성

1. Google Drive에서 새 Apps Script 프로젝트 생성
2. `src/imports/pasted_text/fashion-api.txt` 파일의 코드를 복사하여 붙여넣기
3. 저장 (Ctrl+S 또는 Cmd+S)

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

`src/app/services/fashionApi.ts` 파일을 열어서:

```typescript
const API_BASE_URL = 'YOUR_DEPLOYMENT_URL_HERE';  // 여기에 배포 URL 붙여넣기
const API_TOKEN = '728185da-bc7f-476a-b3d4-c977556dcc8f';  // 생성된 토큰
```

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
