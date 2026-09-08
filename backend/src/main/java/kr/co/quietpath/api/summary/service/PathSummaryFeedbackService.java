package kr.co.quietpath.api.summary.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.response.PathSummaryFeedbackResponse;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.summary.entity.PathSummary;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PathSummaryFeedbackService {

    private final PathRepository pathRepository;
    private final PathSummaryRepository pathSummaryRepository;

    @Transactional
    public PathSummaryFeedbackResponse update(Long userId, Long pathId, boolean helpful) {
        Path path = pathRepository.findById(pathId)
            .orElseThrow(() -> new ApiException(ErrorCode.PATH_NOT_FOUND));
        if (!path.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.NOT_OWNER);
        }

        PathSummary summary = pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(pathId)
            .orElseThrow(() -> new ApiException(ErrorCode.AI_SUMMARY_FEEDBACK_NOT_AVAILABLE));
        if (!PathSummaryPolicy.STATUS_DONE.equals(summary.getStatus())) {
            throw new ApiException(ErrorCode.AI_SUMMARY_FEEDBACK_NOT_AVAILABLE);
        }

        summary.updateFeedback(helpful);
        return PathSummaryFeedbackResponse.builder()
            .pathId(pathId)
            .helpful(helpful)
            .build();
    }
}
