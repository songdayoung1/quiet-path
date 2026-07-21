package kr.co.quietpath.api.record.dto.response;

import java.math.BigDecimal;

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
    private String imageUrl;
    private BigDecimal imagePositionX;
    private BigDecimal imagePositionY;
    private BigDecimal imageScale;
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
