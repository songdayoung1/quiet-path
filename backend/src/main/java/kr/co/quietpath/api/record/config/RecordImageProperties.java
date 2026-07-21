package kr.co.quietpath.api.record.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.record-image")
public class RecordImageProperties {

    @NotBlank
    private String storage;

    @Positive
    private long maxFileSizeBytes;

    @Positive
    private long maxPixelCount;

    @Positive
    private int maxLongEdge;

    @DecimalMin("0.1")
    @DecimalMax("1.0")
    private float webpQuality;

    @Valid
    private Local local = new Local();

    @Getter
    @Setter
    public static class Local {

        @NotBlank
        private String rootDirectory;

        @NotBlank
        private String publicPath;
    }
}
