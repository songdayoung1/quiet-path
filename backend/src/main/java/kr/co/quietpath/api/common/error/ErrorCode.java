package kr.co.quietpath.api.common.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    PATH_ALREADY_ACTIVE(HttpStatus.CONFLICT, "PATH_ALREADY_ACTIVE", "이미 진행 중인 방향이 있습니다."),
    PATH_NOT_ACTIVE(HttpStatus.CONFLICT, "PATH_NOT_ACTIVE", "진행 중인 방향이 아닙니다."),
    NOT_OWNER(HttpStatus.FORBIDDEN, "NOT_OWNER", "본인 경로가 아닙니다."),
    PATH_NOT_FOUND(HttpStatus.NOT_FOUND, "PATH_NOT_FOUND", "Path를 찾을 수 없습니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User를 찾을 수 없습니다."),
    RECORD_NOT_FOUND(HttpStatus.NOT_FOUND, "RECORD_NOT_FOUND", "Record를 찾을 수 없습니다."),
    RECORD_NOT_PUBLIC(HttpStatus.FORBIDDEN, "RECORD_NOT_PUBLIC", "공개되지 않은 Record입니다."),
    TARGET_NOT_FOUND(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "대상을 찾을 수 없습니다."),
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND", "Comment를 찾을 수 없습니다."),
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Notification을 찾을 수 없습니다."),
    INVALID_PERIOD(HttpStatus.BAD_REQUEST, "INVALID_PERIOD", "기간 설정이 올바르지 않습니다."),
    DIRECTION_NAME_REQUIRED(HttpStatus.BAD_REQUEST, "DIRECTION_NAME_REQUIRED", "directionName은 필수입니다."),
    CONTENT_REQUIRED(HttpStatus.BAD_REQUEST, "CONTENT_REQUIRED", "content는 필수입니다."),
    INVALID_STATUS(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "지원하지 않는 status입니다."),
    INVALID_CURSOR(HttpStatus.BAD_REQUEST, "INVALID_CURSOR", "cursor 형식이 올바르지 않습니다."),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "요청이 올바르지 않습니다."),
    RECORD_ALREADY_EXISTS(HttpStatus.CONFLICT, "RECORD_ALREADY_EXISTS", "이미 오늘의 기록이 존재합니다."),
    RECORD_NOT_EDITABLE(HttpStatus.CONFLICT, "RECORD_NOT_EDITABLE", "작성 당일에만 수정할 수 있습니다."),
    RECORD_ALREADY_SHARED(HttpStatus.CONFLICT, "RECORD_ALREADY_SHARED", "이미 공개된 기록입니다."),
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
