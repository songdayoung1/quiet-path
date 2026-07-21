package kr.co.quietpath.api.common.error;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(new ErrorResponse(errorCode.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        FieldError fieldError = ex.getBindingResult().getFieldError();
        if (fieldError != null && "directionName".equals(fieldError.getField())) {
            return ResponseEntity
                .status(ErrorCode.DIRECTION_NAME_REQUIRED.getHttpStatus())
                .body(ErrorResponse.of(ErrorCode.DIRECTION_NAME_REQUIRED));
        }
        if (fieldError != null && "content".equals(fieldError.getField())) {
            return ResponseEntity
                .status(ErrorCode.CONTENT_REQUIRED.getHttpStatus())
                .body(ErrorResponse.of(ErrorCode.CONTENT_REQUIRED));
        }
        return ResponseEntity
            .status(ErrorCode.INVALID_REQUEST.getHttpStatus())
            .body(ErrorResponse.of(ErrorCode.INVALID_REQUEST));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        return ResponseEntity
            .status(ErrorCode.IMAGE_TOO_LARGE.getHttpStatus())
            .body(ErrorResponse.of(ErrorCode.IMAGE_TOO_LARGE));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity
            .status(ErrorCode.INVALID_REQUEST.getHttpStatus())
            .body(ErrorResponse.of(ErrorCode.INVALID_REQUEST));
    }
}
