package kr.co.quietpath.domain.record.image;

public interface RecordImageStorage {

    StoredRecordImage store(ProcessedRecordImage image);

    void delete(String storageKey);
}
