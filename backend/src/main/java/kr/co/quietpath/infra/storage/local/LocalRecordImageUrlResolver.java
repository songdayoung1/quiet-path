package kr.co.quietpath.infra.storage.local;

import kr.co.quietpath.domain.record.image.RecordImageUrlResolver;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.record-image.storage", havingValue = "local", matchIfMissing = true)
public class LocalRecordImageUrlResolver implements RecordImageUrlResolver {

    /** 로컬 저장소의 정적 파일 경로는 별도의 서명 없이 그대로 반환한다. */
    @Override
    public String resolve(String storageKey, String storedImageUrl) {
        return storedImageUrl;
    }
}
