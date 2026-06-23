package kr.co.quietpath.api.summary.service;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SummaryGenerationContext {
    private Long summaryId;
    private AiSummaryRequest request;
}
