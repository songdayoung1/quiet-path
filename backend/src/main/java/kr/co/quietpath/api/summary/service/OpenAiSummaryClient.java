package kr.co.quietpath.api.summary.service;

import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.responses.StructuredResponse;
import com.openai.models.responses.StructuredResponseCreateParams;
import com.openai.models.responses.StructuredResponseOutputItem;
import com.openai.models.responses.StructuredResponseOutputMessage;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.response.PathSummaryPayload;
import kr.co.quietpath.api.summary.config.OpenAiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class OpenAiSummaryClient implements AiSummaryClient {

    private static final String SUMMARY_INSTRUCTIONS = """
        당신은 사용자의 기록 흐름을 조용하게 정리해 주는 한국어 회고 코치다.
        과장하거나 단정하지 말고, 기록에 드러난 흐름만 기반으로 요약하라.
        headline은 한 문장, body는 2~3문장, observations는 2~3개, closing은 한 문장으로 작성하라.
        observations는 각 항목을 완전한 문장으로 작성하라.
        비어 있는 정보를 추측으로 채우지 말고, 기록이 부족하면 조심스럽게 표현하라.
        """;

    private final OpenAiProperties openAiProperties;

    private volatile OpenAIClient client;

    @Override
    public void ensureConfigured() {
        if (!openAiProperties.isConfigured()) {
            throw new ApiException(ErrorCode.AI_CONFIG_MISSING);
        }
    }

    @Override
    public PathSummaryPayload summarize(AiSummaryRequest request) {
        ensureConfigured();

        StructuredResponseCreateParams<PathSummaryPayload> params =
            StructuredResponseCreateParams.<PathSummaryPayload>builder()
                .model(openAiProperties.getModel())
                .instructions(SUMMARY_INSTRUCTIONS)
                .input(request.toPromptInput())
                .maxOutputTokens(900L)
                .text(PathSummaryPayload.class)
                .build();

        StructuredResponse<PathSummaryPayload> response = getClient().responses().create(params);
        PathSummaryPayload payload = extractPayload(response.output());
        validatePayload(payload);
        return payload;
    }

    private OpenAIClient getClient() {
        if (client == null) {
            synchronized (this) {
                if (client == null) {
                    client = OpenAIOkHttpClient.builder()
                        .apiKey(openAiProperties.getApiKey())
                        .timeout(openAiProperties.getSummaryTimeout())
                        .build();
                }
            }
        }
        return client;
    }

    private PathSummaryPayload extractPayload(List<StructuredResponseOutputItem<PathSummaryPayload>> outputItems) {
        for (StructuredResponseOutputItem<PathSummaryPayload> outputItem : outputItems) {
            if (!outputItem.isMessage()) {
                continue;
            }
            StructuredResponseOutputMessage<PathSummaryPayload> message = outputItem.asMessage();
            for (StructuredResponseOutputMessage.Content<PathSummaryPayload> content : message.content()) {
                if (content.isOutputText() && content.outputText().isPresent()) {
                    return content.outputText().get();
                }
            }
        }
        throw new ApiException(ErrorCode.AI_SUMMARY_REQUEST_FAILED);
    }

    private void validatePayload(PathSummaryPayload payload) {
        if (payload == null
            || isBlank(payload.getHeadline())
            || isBlank(payload.getBody())
            || payload.getObservations() == null
            || payload.getObservations().isEmpty()
            || payload.getObservations().stream().anyMatch(this::isBlank)
            || isBlank(payload.getClosing())) {
            throw new ApiException(ErrorCode.AI_SUMMARY_REQUEST_FAILED);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
