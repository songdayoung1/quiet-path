package kr.co.quietpath.global.config;

import kr.co.quietpath.api.record.config.RecordImageProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.record-image.storage", havingValue = "local", matchIfMissing = true)
public class RecordImageWebConfig implements WebMvcConfigurer {

    private final RecordImageProperties properties;

    /** 로컬 저장 이미지를 설정된 공개 URL 아래에서 정적 리소스로 제공한다. */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String publicPath = normalizePublicPath(properties.getLocal().getPublicPath());
        String resourceLocation = Path.of(properties.getLocal().getRootDirectory())
            .toAbsolutePath()
            .normalize()
            .toUri()
            .toString();
        if (!resourceLocation.endsWith("/")) {
            resourceLocation += "/";
        }

        registry.addResourceHandler(publicPath + "/**")
            .addResourceLocations(resourceLocation);
    }

    private String normalizePublicPath(String path) {
        String normalized = path.startsWith("/") ? path : "/" + path;
        return normalized.endsWith("/") ? normalized.substring(0, normalized.length() - 1) : normalized;
    }
}
