package kr.co.quietpath.api.summary.config;

import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "openai")
public class OpenAiProperties {

    private String apiKey;

    private String model = "gpt-5.5";

    private String summaryPromptVersion = "v1";

    @Positive
    private Long summaryTimeoutMs = 45_000L;

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public Duration getSummaryTimeout() {
        return Duration.ofMillis(summaryTimeoutMs);
    }
}
