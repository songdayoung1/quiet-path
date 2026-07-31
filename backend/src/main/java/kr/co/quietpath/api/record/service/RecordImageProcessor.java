package kr.co.quietpath.api.record.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.record.config.RecordImageProperties;
import kr.co.quietpath.domain.record.image.ProcessedRecordImage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class RecordImageProcessor {

    private static final String OUTPUT_CONTENT_TYPE = "image/webp";
    private static final String OUTPUT_EXTENSION = "webp";
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/webp"
    );

    private final RecordImageProperties properties;

    /** 업로드 파일을 검증하고 원본 비율을 유지한 WebP 이미지로 정규화한다. */
    public ProcessedRecordImage process(MultipartFile file) {
        validateFile(file);

        try (InputStream input = file.getInputStream()) {
            BufferedImage source = ImageIO.read(input);
            if (source == null) {
                throw new ApiException(ErrorCode.INVALID_IMAGE_FILE);
            }
            validateDimensions(source.getWidth(), source.getHeight());

            if (OUTPUT_CONTENT_TYPE.equals(file.getContentType())
                && Math.max(source.getWidth(), source.getHeight()) <= properties.getMaxLongEdge()) {
                return new ProcessedRecordImage(
                    file.getBytes(),
                    OUTPUT_CONTENT_TYPE,
                    OUTPUT_EXTENSION
                );
            }

            BufferedImage resized = resize(source);
            return new ProcessedRecordImage(
                encodeWebp(resized),
                OUTPUT_CONTENT_TYPE,
                OUTPUT_EXTENSION
            );
        } catch (ApiException ex) {
            throw ex;
        } catch (IOException | RuntimeException ex) {
            throw new ApiException(ErrorCode.INVALID_IMAGE_FILE);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_IMAGE_FILE);
        }
        if (file.getSize() > properties.getMaxFileSizeBytes()) {
            throw new ApiException(ErrorCode.IMAGE_TOO_LARGE);
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new ApiException(ErrorCode.UNSUPPORTED_IMAGE_TYPE);
        }
    }

    private void validateDimensions(int width, int height) {
        long pixelCount = (long) width * height;
        if (width <= 0 || height <= 0 || pixelCount > properties.getMaxPixelCount()) {
            throw new ApiException(ErrorCode.INVALID_IMAGE_DIMENSIONS);
        }
    }

    private BufferedImage resize(BufferedImage source) {
        int sourceWidth = source.getWidth();
        int sourceHeight = source.getHeight();
        int longEdge = Math.max(sourceWidth, sourceHeight);
        if (longEdge <= properties.getMaxLongEdge()) {
            return source;
        }

        double ratio = (double) properties.getMaxLongEdge() / longEdge;
        int targetWidth = Math.max(1, (int) Math.round(sourceWidth * ratio));
        int targetHeight = Math.max(1, (int) Math.round(sourceHeight * ratio));
        int imageType = source.getColorModel().hasAlpha()
            ? BufferedImage.TYPE_INT_ARGB
            : BufferedImage.TYPE_INT_RGB;
        BufferedImage target = new BufferedImage(targetWidth, targetHeight, imageType);

        Graphics2D graphics = target.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }
        return target;
    }

    private byte[] encodeWebp(BufferedImage image) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName(OUTPUT_EXTENSION);
        if (!writers.hasNext()) {
            throw new ApiException(ErrorCode.IMAGE_UPLOAD_FAILED);
        }

        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream output = new ByteArrayOutputStream();
             ImageOutputStream imageOutput = ImageIO.createImageOutputStream(output)) {
            ImageWriteParam params = writer.getDefaultWriteParam();
            if (params.canWriteCompressed()) {
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                String[] compressionTypes = params.getCompressionTypes();
                if (compressionTypes != null && compressionTypes.length > 0) {
                    params.setCompressionType(compressionTypes[0]);
                }
                params.setCompressionQuality(properties.getWebpQuality());
            }

            writer.setOutput(imageOutput);
            writer.write(null, new IIOImage(image, null, null), params);
            imageOutput.flush();
            return output.toByteArray();
        } finally {
            writer.dispose();
        }
    }
}
