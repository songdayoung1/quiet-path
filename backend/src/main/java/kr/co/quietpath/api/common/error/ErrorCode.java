package kr.co.quietpath.api.common.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    AUTH_REQUIRED(HttpStatus.UNAUTHORIZED, "AUTH_REQUIRED", "로그인이 필요합니다."),
    KAKAO_AUTH_FAILED(HttpStatus.UNAUTHORIZED, "KAKAO_AUTH_FAILED", "카카오 인증에 실패했습니다."),
    KAKAO_UNLINK_FAILED(HttpStatus.BAD_GATEWAY, "KAKAO_UNLINK_FAILED", "카카오 연결 해제에 실패했습니다."),
    REFRESH_TOKEN_REQUIRED(HttpStatus.BAD_REQUEST, "REFRESH_TOKEN_REQUIRED", "리프레시 토큰이 필요합니다."),
    REFRESH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_INVALID", "리프레시 토큰이 유효하지 않습니다."),
    AUTH_CONFIG_MISSING(HttpStatus.INTERNAL_SERVER_ERROR, "AUTH_CONFIG_MISSING", "인증 설정값이 누락되었습니다."),
    NICKNAME_GENERATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "NICKNAME_GENERATION_FAILED", "닉네임 생성에 실패했습니다."),
    NICKNAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "NICKNAME_ALREADY_EXISTS", "이미 사용 중인 닉네임입니다."),
    INVALID_NICKNAME_FORMAT(HttpStatus.BAD_REQUEST, "INVALID_NICKNAME_FORMAT", "닉네임 형식이 올바르지 않습니다."),
    PATH_ALREADY_ACTIVE(HttpStatus.CONFLICT, "PATH_ALREADY_ACTIVE", "이미 진행 중인 방향이 있습니다."),
    PATH_REVIEW_REQUIRED(HttpStatus.CONFLICT, "PATH_REVIEW_REQUIRED", "회고일이 지난 방향을 먼저 연장하거나 마무리해 주세요."),
    PATH_NOT_ACTIVE(HttpStatus.CONFLICT, "PATH_NOT_ACTIVE", "진행 중인 방향이 아닙니다."),
    NOT_OWNER(HttpStatus.FORBIDDEN, "NOT_OWNER", "본인 경로가 아닙니다."),
    PATH_NOT_FOUND(HttpStatus.NOT_FOUND, "PATH_NOT_FOUND", "Path를 찾을 수 없습니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User를 찾을 수 없습니다."),
    RECORD_NOT_FOUND(HttpStatus.NOT_FOUND, "RECORD_NOT_FOUND", "Record를 찾을 수 없습니다."),
    RECORD_NOT_PUBLIC(HttpStatus.FORBIDDEN, "RECORD_NOT_PUBLIC", "공개되지 않은 Record입니다."),
    TARGET_NOT_FOUND(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "대상을 찾을 수 없습니다."),
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND", "Comment를 찾을 수 없습니다."),
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Notification을 찾을 수 없습니다."),
    WEB_PUSH_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "WEB_PUSH_NOT_CONFIGURED", "웹 푸시 설정이 준비되지 않았습니다."),
    INVALID_PERIOD(HttpStatus.BAD_REQUEST, "INVALID_PERIOD", "기간 설정이 올바르지 않습니다."),
    DIRECTION_NAME_REQUIRED(HttpStatus.BAD_REQUEST, "DIRECTION_NAME_REQUIRED", "directionName은 필수입니다."),
    CONTENT_REQUIRED(HttpStatus.BAD_REQUEST, "CONTENT_REQUIRED", "content는 필수입니다."),
    INVALID_STATUS(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "지원하지 않는 status입니다."),
    INVALID_CURSOR(HttpStatus.BAD_REQUEST, "INVALID_CURSOR", "cursor 형식이 올바르지 않습니다."),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "요청이 올바르지 않습니다."),
    RECORD_ALREADY_EXISTS(HttpStatus.CONFLICT, "RECORD_ALREADY_EXISTS", "이미 오늘의 기록이 존재합니다."),
    RECORD_NOT_EDITABLE(HttpStatus.CONFLICT, "RECORD_NOT_EDITABLE", "작성 당일에만 수정할 수 있습니다."),
    RECORD_ALREADY_SHARED(HttpStatus.CONFLICT, "RECORD_ALREADY_SHARED", "이미 공개된 기록입니다."),
    INVALID_IMAGE_FILE(HttpStatus.BAD_REQUEST, "INVALID_IMAGE_FILE", "이미지 파일이 올바르지 않습니다."),
    UNSUPPORTED_IMAGE_TYPE(HttpStatus.BAD_REQUEST, "UNSUPPORTED_IMAGE_TYPE", "지원하지 않는 이미지 형식입니다."),
    IMAGE_TOO_LARGE(HttpStatus.BAD_REQUEST, "IMAGE_TOO_LARGE", "이미지 파일이 허용 크기를 초과했습니다."),
    INVALID_IMAGE_DIMENSIONS(HttpStatus.BAD_REQUEST, "INVALID_IMAGE_DIMENSIONS", "이미지 해상도가 올바르지 않습니다."),
    IMAGE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "IMAGE_UPLOAD_FAILED", "이미지 저장에 실패했습니다."),
    PATH_SUMMARY_LOCKED(HttpStatus.CONFLICT, "PATH_SUMMARY_LOCKED", "아직 회고 캡슐을 열 수 없습니다."),
    PATH_SUMMARY_EMPTY(HttpStatus.CONFLICT, "PATH_SUMMARY_EMPTY", "기록이 없어 회고 캡슐을 만들 수 없습니다."),
    PATH_SUMMARY_NOT_COMPLETED(HttpStatus.CONFLICT, "PATH_SUMMARY_NOT_COMPLETED", "종료된 방향만 회고 캡슐을 만들 수 있습니다."),
    AI_CONFIG_MISSING(HttpStatus.INTERNAL_SERVER_ERROR, "AI_CONFIG_MISSING", "AI 설정값이 누락되었습니다."),
    AI_SUMMARY_REQUEST_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI_SUMMARY_REQUEST_FAILED", "AI 요약 생성에 실패했습니다."),
    ACTIVE_PATH_REQUIRED(HttpStatus.CONFLICT, "ACTIVE_PATH_REQUIRED", "진행 중인 방향이 없습니다."),
    REACTION_ALREADY_EXISTS(HttpStatus.CONFLICT, "REACTION_ALREADY_EXISTS", "이미 공감한 대상입니다."),
    TARGET_NOT_PUBLIC(HttpStatus.FORBIDDEN, "TARGET_NOT_PUBLIC", "공개되지 않은 대상입니다."),
    INVALID_TARGET_TYPE(HttpStatus.BAD_REQUEST, "INVALID_TARGET_TYPE", "허용되지 않은 targetType입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
