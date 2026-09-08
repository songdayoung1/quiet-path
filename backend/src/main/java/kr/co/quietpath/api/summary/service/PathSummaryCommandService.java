package kr.co.quietpath.api.summary.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.response.PathSummaryStartResponse;
import kr.co.quietpath.api.summary.config.OpenAiProperties;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.summary.entity.PathSummary;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PathSummaryCommandService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    private final PathRepository pathRepository;
    private final RecordRepository recordRepository;
    private final PathSummaryRepository pathSummaryRepository;
    private final AiSummaryClient aiSummaryClient;
    private final OpenAiProperties openAiProperties;
    private final ApplicationEventPublisher applicationEventPublisher;

    public PathSummaryStartResponse requestSummary(Long userId, Long pathId) {
        aiSummaryClient.ensureConfigured();

        Path path = pathRepository.findByIdForUpdate(pathId)
            .orElseThrow(() -> new ApiException(ErrorCode.PATH_NOT_FOUND));
        if (!path.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.NOT_OWNER);
        }
        if (!PathSummaryPolicy.PATH_STATUS_COMPLETED.equals(path.getStatus())) {
            throw new ApiException(ErrorCode.PATH_SUMMARY_NOT_COMPLETED);
        }
        if (LocalDate.now().isBefore(path.getReviewAt().toLocalDate())) {
            throw new ApiException(ErrorCode.PATH_SUMMARY_LOCKED);
        }

        List<Record> records = recordRepository.findAllByPath_IdAndIsHiddenFalseOrderByRecordDateAsc(pathId);
        if (records.isEmpty()) {
            throw new ApiException(ErrorCode.PATH_SUMMARY_EMPTY);
        }

        PathSummary latestSummary = pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(pathId)
            .orElse(null);
        // 진행 중인 요약은 그대로 유지하고, DONE/FAILED는 같은 재생성 경로로 태운다.
        if (latestSummary != null && PathSummaryPolicy.isInFlight(latestSummary.getStatus())
            && !PathSummaryPolicy.isStale(latestSummary)) {
            return buildProcessingResponse(pathId, latestSummary);
        }
        if (latestSummary != null
            && PathSummaryPolicy.remainingRegenerationCount(latestSummary) == 0) {
            throw new ApiException(ErrorCode.AI_SUMMARY_REGENERATION_LIMIT_EXCEEDED);
        }

        String inputHash = hash(buildHashSource(path, records));
        // 1차에서는 새 version을 늘리지 않고 latest row를 재활용해 재시도한다.
        PathSummary summary = prepareSummary(path, latestSummary, inputHash);
        pathSummaryRepository.save(summary);
        applicationEventPublisher.publishEvent(new PathSummaryRequestedEvent(summary.getId()));

        return buildProcessingResponse(pathId, summary);
    }

    private PathSummaryStartResponse buildProcessingResponse(Long pathId, PathSummary summary) {
        return PathSummaryStartResponse.builder()
            .pathId(pathId)
            .summaryStatus(PathSummaryPolicy.STATUS_PROCESSING)
            .regenerationCount(summary.getRegenerationCount())
            .regenerationLimit(PathSummaryPolicy.MAX_REGENERATION_COUNT)
            .regenerationRemaining(PathSummaryPolicy.remainingRegenerationCount(summary))
            .build();
    }

    private PathSummary prepareSummary(Path path, PathSummary latestSummary, String inputHash) {
        if (latestSummary == null) {
            return PathSummary.builder()
                .path(path)
                .versionNo(1)
                .promptVersion(openAiProperties.getSummaryPromptVersion())
                .model(openAiProperties.getModel())
                .inputHash(inputHash)
                .build();
        }

        latestSummary.retry(
            openAiProperties.getSummaryPromptVersion(),
            openAiProperties.getModel(),
            inputHash
        );
        return latestSummary;
    }

    private String buildHashSource(Path path, List<Record> records) {
        StringBuilder builder = new StringBuilder();
        builder.append(path.getId()).append('|');
        builder.append(path.getDirectionName()).append('|');
        builder.append(path.getDirectionText()).append('|');
        builder.append(path.getCategoryCode()).append('|');
        builder.append(path.getCreatedAt().toLocalDate().format(DATE_FORMATTER)).append('|');
        builder.append(path.getCompletedAt() == null ? "-" : path.getCompletedAt().toLocalDate().format(DATE_FORMATTER)).append('|');
        builder.append(path.getReviewAt().toLocalDate().format(DATE_FORMATTER));

        for (Record record : records) {
            builder.append('|').append(record.getRecordDate());
            builder.append('|').append(safe(record.getSceneText()));
            builder.append('|').append(safe(record.getOneWordText()));
            builder.append('|').append(safe(record.getTomorrowText()));
            builder.append('|').append(safe(record.getMoodCode()));
        }

        return builder.toString();
    }

    private String hash(String source) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(source.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
