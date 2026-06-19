package kr.co.quietpath.api.summary.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.quietpath.api.path.dto.response.PathSummaryPayload;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.summary.entity.PathSummary;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PathSummaryGenerationService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    private final PathSummaryRepository pathSummaryRepository;
    private final RecordRepository recordRepository;
    private final AiSummaryClient aiSummaryClient;
    private final ObjectMapper objectMapper;

    @Transactional
    public void generateSummary(Long summaryId) {
        PathSummary summary = pathSummaryRepository.findById(summaryId)
            .orElse(null);
        if (summary == null) {
            return;
        }

        try {
            // 생성 시작 직전에 상태를 PROCESSING으로 바꿔 polling 응답이 즉시 전이되게 한다.
            summary.startProcessing();
            List<Record> records = recordRepository.findAllByPath_IdOrderByRecordDateAsc(summary.getPath().getId());
            if (records.isEmpty()) {
                summary.fail();
                return;
            }

            AiSummaryRequest request = AiSummaryRequest.builder()
                .directionName(summary.getPath().getDirectionName())
                .directionText(summary.getPath().getDirectionText())
                .categoryCode(summary.getPath().getCategoryCode())
                .createdAt(summary.getPath().getCreatedAt().toLocalDate().format(DATE_FORMATTER))
                .completedAt(summary.getPath().getCompletedAt() == null
                    ? null
                    : summary.getPath().getCompletedAt().toLocalDate().format(DATE_FORMATTER))
                .reviewAt(summary.getPath().getReviewAt().toLocalDate().format(DATE_FORMATTER))
                .records(records.stream()
                    .map(record -> AiSummaryRecordInput.builder()
                        .recordDate(record.getRecordDate().format(DATE_FORMATTER))
                        .sceneText(record.getSceneText())
                        .oneWordText(record.getOneWordText())
                        .tomorrowText(record.getTomorrowText())
                        .moodCode(record.getMoodCode())
                        .build())
                    .toList())
                .build();

            PathSummaryPayload payload = aiSummaryClient.summarize(request);
            summary.complete(writeContent(payload));
        } catch (Exception ex) {
            summary.fail();
            log.warn("AI summary generation failed. summaryId={}", summaryId, ex);
        }
    }

    private String writeContent(PathSummaryPayload payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("AI summary serialization failed", ex);
        }
    }
}
