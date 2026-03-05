package kr.co.quietpath.api.common.error;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ErrorResponse.of(errorCode));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        FieldError fieldError = ex.getBindingResult().getFieldError();
        if (fieldError != null && "keyQuestion".equals(fieldError.getField())) {
            return ResponseEntity
                .status(ErrorCode.KEY_QUESTION_REQUIRED.getHttpStatus())
                .body(ErrorResponse.of(ErrorCode.KEY_QUESTION_REQUIRED));
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

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity
            .status(ErrorCode.INVALID_REQUEST.getHttpStatus())
            .body(ErrorResponse.of(ErrorCode.INVALID_REQUEST));
    }
}
