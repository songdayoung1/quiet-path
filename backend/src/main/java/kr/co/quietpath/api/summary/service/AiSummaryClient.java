package kr.co.quietpath.api.summary.service;

import kr.co.quietpath.api.path.dto.response.PathSummaryPayload;

public interface AiSummaryClient {

    void ensureConfigured();

    PathSummaryPayload summarize(AiSummaryRequest request);
}
