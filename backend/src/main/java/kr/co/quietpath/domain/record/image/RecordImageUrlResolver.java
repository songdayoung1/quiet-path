package kr.co.quietpath.domain.record.image;

public interface RecordImageUrlResolver {

    String resolve(String storageKey, String storedImageUrl);
}
