package kr.co.quietpath.api.record.service;

import kr.co.quietpath.domain.record.image.ProcessedRecordImage;
import kr.co.quietpath.domain.record.image.RecordImageStorage;
import kr.co.quietpath.domain.record.image.StoredRecordImage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class RecordImageService {

    private final RecordImageProcessor processor;
    private final RecordImageStorage storage;

    /** 파일 검증과 변환을 거쳐 현재 환경의 이미지 저장소에 저장한다. */
    public StoredRecordImage store(MultipartFile file) {
        ProcessedRecordImage processedImage = processor.process(file);
        return storage.store(processedImage);
    }

    /** DB 연결 해제 이후 저장소의 이미지 파일을 제거할 때 사용한다. */
    public void delete(String storageKey) {
        storage.delete(storageKey);
    }
}
