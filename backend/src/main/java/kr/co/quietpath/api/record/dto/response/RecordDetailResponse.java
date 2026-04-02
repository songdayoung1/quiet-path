package kr.co.quietpath.api.record.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecordDetailResponse {
    private Long id;
    private Long pathId;
    private String recordDate;
    private String content;
    private String moodCode;
    private String visibility;
    private OwnerSummary owner;
    private long reactionCount;
    private boolean isReacted;
    private long commentCount;
    private String createdAt;
    private String updatedAt;

    @Getter
    @Builder
    public static class OwnerSummary {
        private Long userId;
        private String nickname;
        private String profileImageUrl;
    }
}
