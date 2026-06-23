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
        당신은 사용자의 기록 흐름을 해석해 주는 한국어 회고 코치다.
        단순 칭찬이나 응원으로 끝내지 말고, 기록에 드러난 흐름과 관점을 읽고 실질적인 피드백을 주어라.
        기록에 없는 사실을 지어내지 말고, 근거가 약하면 조심스럽게 표현하라.
        너무 치료적이거나 과장된 표현, 뻔한 위로, 추상적인 자기계발 문구는 피하라.
        사용자가 무엇을 지키려 했는지, 무엇을 기준으로 기록했는지, 어떤 방식으로 하루를 해석했는지를 perspective에 담아라.
        body에는 기간 전체의 흐름과 변화, 반복 패턴, 감정과 행동의 연결을 3~4문장으로 요약하라.
        improvements에는 보완하면 좋을 점을 2개 이상 완전한 문장으로 적어라.
        suggestions에는 다음 방향에서 바로 써볼 수 있는 추천 방안을 2개 이상, 구체적 행동 단위로 적어라.
        observations는 선택적으로 쓰되, 있다면 기록에서 읽히는 특징을 1~2개 문장으로 적어라.
        headline과 closing은 과장 없는 한 문장으로 작성하라.
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
            || isBlank(payload.getPerspective())
            || payload.getImprovements() == null
            || payload.getImprovements().isEmpty()
            || payload.getImprovements().stream().anyMatch(this::isBlank)
            || payload.getSuggestions() == null
            || payload.getSuggestions().isEmpty()
            || payload.getSuggestions().stream().anyMatch(this::isBlank)
            || isBlank(payload.getClosing())) {
            throw new ApiException(ErrorCode.AI_SUMMARY_REQUEST_FAILED);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
