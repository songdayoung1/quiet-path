# 운영 배포 설정

## 기록 이미지 S3 CORS

기록 카드 저장 기능은 비공개 S3 객체의 서명 URL을 브라우저 Canvas에서 읽음.
일반 이미지 표시는 CORS 설정 없이 가능하지만 Canvas 내보내기에는 운영 프론트 Origin을 허용해야 함.

적용 대상 버킷:

```text
quietpath-prod-record-images-381492289409-ap-northeast-2-an
```

AWS CLI 자격증명이 있는 환경에서 다음 명령으로 적용함.

```bash
aws s3api put-bucket-cors \
  --bucket quietpath-prod-record-images-381492289409-ap-northeast-2-an \
  --cors-configuration file://deploy/s3-record-images-cors.json \
  --region ap-northeast-2
```

적용 결과는 다음 명령으로 확인함.

```bash
aws s3api get-bucket-cors \
  --bucket quietpath-prod-record-images-381492289409-ap-northeast-2-an \
  --region ap-northeast-2
```

AWS 콘솔에서는 S3 버킷의 `권한 > CORS(Cross-origin 리소스 공유)`에
`s3-record-images-cors.json`의 `CORSRules` 배열 내부 규칙을 입력함.

적용 후 다음 항목을 확인함.

- `https://qpathlog.com`에서 사진이 포함된 기록 카드 저장 성공
- `https://www.qpathlog.com`에서 동일 동작 성공
- 브라우저 콘솔에 `Access-Control-Allow-Origin` 오류가 발생하지 않음
- S3 버킷의 퍼블릭 액세스 차단 설정이 유지됨
