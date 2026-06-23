package kr.co.quietpath.api.summary.service;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AiSummaryRequest {
    private String directionName;
    private String directionText;
    private String categoryCode;
    private String createdAt;
    private String completedAt;
    private String reviewAt;
    private List<AiSummaryRecordInput> records;

    public String toPromptInput() {
        StringBuilder builder = new StringBuilder();
        builder.append("directionName: ").append(safe(directionName)).append('\n');
        builder.append("directionText: ").append(safe(directionText)).append('\n');
        builder.append("categoryCode: ").append(safe(categoryCode)).append('\n');
        builder.append("createdAt: ").append(safe(createdAt)).append('\n');
        builder.append("completedAt: ").append(safe(completedAt)).append('\n');
        builder.append("reviewAt: ").append(safe(reviewAt)).append('\n');
        builder.append("records:\n");

        if (records == null || records.isEmpty()) {
            builder.append("- none\n");
            return builder.toString();
        }

        for (AiSummaryRecordInput record : records) {
            builder.append("- date: ").append(safe(record.getRecordDate())).append('\n');
            builder.append("  sceneText: ").append(safe(record.getSceneText())).append('\n');
            builder.append("  oneWordText: ").append(safe(record.getOneWordText())).append('\n');
            builder.append("  tomorrowText: ").append(safe(record.getTomorrowText())).append('\n');
            builder.append("  moodCode: ").append(safe(record.getMoodCode())).append('\n');
        }

        return builder.toString();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
