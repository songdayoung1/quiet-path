package kr.co.quietpath.domain.record.image;

public record ProcessedRecordImage(
    byte[] bytes,
    String contentType,
    String extension
) {
}
