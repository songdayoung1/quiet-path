# 기록 단건 이미지 API 정의

## 1. 결정 사항

- 기록 1개에는 이미지 1장만 연결함
- 별도 이미지 업로드 API를 두지 않고 기록 생성·수정 API가 JSON과 파일을 함께 받음
- 컨트롤러 API는 합치되 이미지 검증·변환·저장은 별도 서비스와 저장소 인터페이스로 분리함
- 원본 비율은 유지하고 긴 변이 1080px을 넘으면 축소한 뒤 WebP로 저장함
- 화면 구도는 4:3 프레임 기준 위치 `0~100`, 확대 비율 `1~3`으로 저장함
- 로컬은 파일시스템을 사용하며 원격 테스트용 S3 구현은 후속 범위로 둠

## 2. 데이터 구조

`records.image_id`가 `record_images.id`를 참조함.

| 컬럼 | 설명 |
| --- | --- |
| `record_images.storage_key` | 로컬 또는 S3에서 파일을 찾기 위한 내부 키 |
| `record_images.image_url` | 브라우저가 이미지를 조회할 URL |
| `record_images.position_x` | 4:3 프레임의 가로 초점 위치, 기본 50 |
| `record_images.position_y` | 4:3 프레임의 세로 초점 위치, 기본 50 |
| `record_images.scale` | 프레임을 채운 상태 기준 추가 확대 비율, 기본 1 |

기존 `records.image_url` 데이터는 `record_images`로 이관한 뒤 레거시 컬럼을 제거함.

## 3. 기록 생성

### Endpoint

`POST /api/v1/records`

### Content-Type

`multipart/form-data`

### Request Parts

| 파트 | 필수 | Content-Type | 설명 |
| --- | --- | --- | --- |
| `record` | Y | `application/json` | 기록 본문과 이미지 구도 |
| `image` | N | 이미지 MIME | 새로 저장할 이미지 파일 1개 |

### record 파트

```json
{
  "content": "오늘 본 장면을 남긴다",
  "oneWordText": "잔잔",
  "tomorrowText": "내일도 천천히 걷기",
  "moodCode": "포근",
  "imagePositionX": 46,
  "imagePositionY": 38,
  "imageScale": 1.35,
  "visibility": "PRIVATE"
}
```

이미지가 없으면 구도 필드는 생략함.

### 요청 예시

```bash
curl -X POST http://localhost:8080/api/v1/records \
  -H "Authorization: Bearer {accessToken}" \
  -F 'record={"content":"오늘 본 장면을 남긴다","moodCode":"포근","imagePositionX":46,"imagePositionY":38,"imageScale":1.35,"visibility":"PRIVATE"};type=application/json' \
  -F 'image=@/path/to/photo.jpg;type=image/jpeg'
```

### 응답 예시

```json
{
  "id": 29461,
  "pathId": 646,
  "recordDate": "2026-07-16",
  "content": "오늘 본 장면을 남긴다",
  "moodCode": "포근",
  "imageUrl": "/uploads/records/2026/07/16/uuid.webp",
  "imagePositionX": 46,
  "imagePositionY": 38,
  "imageScale": 1.35,
  "visibility": "PRIVATE",
  "createdAt": "2026-07-16T15:30:00"
}
```

## 4. 기록 수정

### Endpoint

`PATCH /api/v1/records/{recordId}`

생성과 동일하게 `multipart/form-data`를 사용함. `record.imageAction`으로 이미지 변경 의도를 반드시 구분함.

| imageAction | image 파트 | 동작 |
| --- | --- | --- |
| `KEEP` | 없음 | 기존 파일을 유지하고 구도값만 수정 가능 |
| `REPLACE` | 필수 | 새 파일로 교체하고 새 구도값 저장 |
| `REMOVE` | 없음 | 이미지 연결과 이미지 행 제거 |

```json
{
  "content": "수정한 기록",
  "oneWordText": "차분",
  "moodCode": "잔잔",
  "imageAction": "KEEP",
  "imagePositionX": 52,
  "imagePositionY": 41,
  "imageScale": 1.6
}
```

`REPLACE`인데 파일이 없거나 `KEEP/REMOVE`인데 파일이 오면 잘못된 요청으로 처리함.

## 5. 이미지 검증과 변환

- 허용 형식: JPEG, PNG, WebP
- 원본 파일 크기: 최대 10MB
- 원본 픽셀 수: 최대 4천만 픽셀
- 저장 크기: 원본 비율 유지, 긴 변 최대 1080px, 작은 이미지는 확대하지 않음
- 저장 형식: WebP, 기본 품질 0.85
- 구도 범위: `positionX/Y=0~100`, `scale=1~3`
- GIF, HEIC, 다중 이미지는 지원하지 않음

프론트도 같은 기준으로 WebP를 먼저 만들지만, 백엔드는 클라이언트 값을 신뢰하지 않고 다시 검증함.

## 6. 로컬 저장과 조회

기본 설정은 다음과 같음.

```yaml
app:
  record-image:
    storage: local
    local:
      root-directory: uploads
      public-path: /uploads
```

서버를 `backend`에서 실행하면 파일은 다음 경로에 저장됨.

```text
backend/uploads/records/2026/07/16/{uuid}.webp
```

`RecordImageWebConfig`가 `/uploads/**` 요청을 로컬 `uploads/**` 파일에 연결함.

```text
GET /uploads/records/2026/07/16/{uuid}.webp
```

## 7. 서비스 책임과 실패 처리

```text
RecordController
  -> RecordCommandService
       -> RecordImageService
            -> RecordImageProcessor
            -> RecordImageStorage
       -> RecordService (쓰기 메서드별 @Transactional)
```

- 파일 처리는 DB 트랜잭션 밖에서 수행해 이미지 변환 시간 동안 DB 커넥션을 점유하지 않음
- 새 파일 저장 후 기록 DB 저장이 실패하면 새 파일을 삭제함
- 이미지 교체 DB 저장이 성공하면 이전 파일을 삭제함
- 이전 파일 삭제 실패는 기록 수정 성공을 되돌리지 않고 경고 로그를 남김
- 파일과 DB를 하나의 원자적 트랜잭션으로 묶을 수 없으므로 장애 복구용 고아 파일 정리는 후속 작업으로 둠

## 8. 에러 코드

- `400 INVALID_IMAGE_FILE`: 빈 파일 또는 실제 이미지로 읽을 수 없는 파일
- `400 UNSUPPORTED_IMAGE_TYPE`: JPEG, PNG, WebP가 아닌 형식
- `400 IMAGE_TOO_LARGE`: multipart 또는 애플리케이션 파일 크기 제한 초과
- `400 INVALID_IMAGE_DIMENSIONS`: 해상도 또는 픽셀 수 제한 위반
- `500 IMAGE_UPLOAD_FAILED`: 변환기 또는 저장소 처리 실패

## 9. 프론트 흐름

1. 파일 선택
2. 브라우저에서 긴 변 1080px 이하 WebP로 정규화
3. `blob:` URL로 4:3 미리보기 표시
4. 드래그와 확대 슬라이더로 구도 조정
5. 저장 시 JSON 파트와 이미지 파일을 한 요청으로 전송
6. 서버 응답의 URL과 구도값으로 앱 상태 갱신
7. 수정 화면은 저장된 URL과 구도값을 불러와 재편집

상세, 기록 목록, 앨범, 홈 카드와 카드 저장 이미지에도 동일한 구도값을 적용함.

## 10. QA

- 이미지 없는 기록 생성·수정
- 이미지 포함 기록 생성
- 기존 이미지 위치와 확대값만 수정
- 기존 이미지 교체
- 기존 이미지 제거
- 잘못된 형식, 10MB 초과, 손상된 이미지 차단
- 생성·교체 DB 실패 시 새 파일 삭제
- 로컬 정적 URL 직접 접근
- 상세, 기록 목록, 앨범, 홈, 카드 저장 결과의 구도 일치
- 새로고침 후 저장된 구도 복원

## 11. 후속 범위

- 고아 파일 주기 정리
- presigned URL, 썸네일, 다중 이미지가 필요해질 경우 별도 설계

## 12. S3 배포 설정

`APP_RECORD_IMAGE_STORAGE=s3`이면 로컬 저장소 대신 `S3RecordImageStorage`가 활성화됨.

```env
APP_RECORD_IMAGE_STORAGE=s3
APP_RECORD_IMAGE_S3_BUCKET=quiet-path-record-images
APP_RECORD_IMAGE_S3_REGION=ap-northeast-2
APP_RECORD_IMAGE_S3_BASE_URL=https://cdn.example.com
```

- `APP_RECORD_IMAGE_S3_BASE_URL`은 S3 객체 또는 CDN을 브라우저에서 조회할 수 있는 기본 URL임
- AWS 인증은 SDK 기본 자격 증명 체인을 사용함
- 운영에서는 액세스 키 직접 등록보다 EC2/ECS IAM Role 사용을 우선함
- 로컬 원격 테스트에서는 `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`를 사용할 수 있음

애플리케이션 IAM에는 해당 버킷의 기록 이미지 prefix에 대한 최소 권한만 부여함.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::quiet-path-record-images/records/*"
    }
  ]
}
```

카드 저장 기능은 원격 이미지를 Canvas에 그리므로 버킷 또는 CDN CORS에 실제 프론트 Origin의 `GET`과 `HEAD`를 허용해야 함. 현재 `baseUrl` 구현은 브라우저가 직접 접근 가능한 URL을 전제로 하며, private 객체용 presigned URL은 별도 후속 범위임.

실제 버킷 연결 후 다음을 확인함.

- 이미지 생성 시 `records/yyyy/MM/dd/{uuid}.webp` 객체 업로드
- 이미지 교체 후 이전 객체 삭제
- 이미지 제거 후 기존 객체 삭제
- 상세·목록·앨범·홈·카드 저장 이미지 조회
- 잘못된 IAM, CORS, base URL 설정 시 로그와 API 오류 응답

## 13. 중복 요청과 동시 수정 후속 정책

- 프론트의 모든 생성·수정 버튼에 실행 중 중복 클릭 차단 적용
- 기록 생성은 현재 사용자·방향·기록일 기준 유니크 제약 유지
- 댓글 생성과 이미지 교체 요청에 `clientRequestId` 적용 검토
- 처리된 멱등성 키를 Redis에 짧은 TTL로 보관하는 방식 검토
- 서로 다른 요청이 같은 데이터를 동시에 수정하는 문제가 확인되면 `@Version` 낙관적 잠금을 우선 검토하고, 충돌 비용이 큰 구간에만 비관적 잠금 검토

멱등성 처리를 먼저 적용하고, DB 잠금은 실제 동시 수정 충돌이 확인된 기능에 한해 추가함.
