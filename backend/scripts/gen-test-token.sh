#!/bin/bash
# 로컬 테스트용 JWT 생성 스크립트
# 사용법: bash scripts/gen-test-token.sh [userId]
#
# JWT secret은 .env.local의 APP_JWT_SECRET 또는 default 값 사용
# userId 기본값: 799

USER_ID=${1:-799}
ENV_FILE="$(dirname "$0")/../.env.local"

if [ -f "$ENV_FILE" ]; then
  SECRET=$(grep "APP_JWT_SECRET" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' ')
fi

SECRET=${SECRET:-"change-this-jwt-secret-key-to-32-bytes-min"}

node -e "
const crypto = require('crypto');
const secret = '$SECRET';
const userId = '$USER_ID';
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  sub: userId,
  sid: 'test-session',
  iss: 'quiet-path',
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 86400 * 30
})).toString('base64url');
const sig = crypto.createHmac('sha256', secret).update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
"
