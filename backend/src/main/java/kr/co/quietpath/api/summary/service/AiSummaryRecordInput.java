package kr.co.quietpath.api.summary.service;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AiSummaryRecordInput {
    private String recordDate;
    private String sceneText;
    private String oneWordText;
    private String tomorrowText;
    private String moodCode;
}
