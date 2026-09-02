package kr.co.quietpath.domain.record.image;

public interface RecordImageStorage {

    default StoredRecordImage store(ProcessedRecordImage image) {
        return store(image, "records");
    }

    StoredRecordImage store(ProcessedRecordImage image, String keyPrefix);

    void delete(String storageKey);
}
