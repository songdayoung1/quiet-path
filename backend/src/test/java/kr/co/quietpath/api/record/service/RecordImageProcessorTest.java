package kr.co.quietpath.api.record.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.record.config.RecordImageProperties;
import kr.co.quietpath.domain.record.image.ProcessedRecordImage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RecordImageProcessorTest {

    private final RecordImageProperties properties = new RecordImageProperties();
    private final RecordImageProcessor processor = new RecordImageProcessor(properties);

    @BeforeEach
    void setUpProperties() {
        properties.setMaxFileSizeBytes(10 * 1024 * 1024);
        properties.setMaxPixelCount(40_000_000);
        properties.setMaxLongEdge(1080);
        properties.setWebpQuality(0.85f);
    }

    @Test
    void process_resizesLongEdgeAndEncodesWebp() throws IOException {
        MockMultipartFile file = createPngFile(2000, 1000);

        ProcessedRecordImage result = processor.process(file);
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(result.bytes()));

        assertEquals("image/webp", result.contentType());
        assertEquals("webp", result.extension());
        assertNotNull(decoded);
        assertEquals(1080, decoded.getWidth());
        assertEquals(540, decoded.getHeight());
        assertTrue(result.bytes().length > 0);
    }

    @Test
    void process_doesNotUpscaleSmallImage() throws IOException {
        MockMultipartFile file = createPngFile(720, 540);

        ProcessedRecordImage result = processor.process(file);
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(result.bytes()));

        assertNotNull(decoded);
        assertEquals(720, decoded.getWidth());
        assertEquals(540, decoded.getHeight());
    }

    @Test
    void process_rejectsUnsupportedContentType() {
        MockMultipartFile file = new MockMultipartFile(
            "image",
            "record.gif",
            "image/gif",
            new byte[]{1, 2, 3}
        );

        ApiException exception = assertThrows(ApiException.class, () -> processor.process(file));

        assertEquals(ErrorCode.UNSUPPORTED_IMAGE_TYPE, exception.getErrorCode());
    }

    @Test
    void process_rejectsImageOverPixelLimit() throws IOException {
        properties.setMaxPixelCount(100);
        MockMultipartFile file = createPngFile(20, 20);

        ApiException exception = assertThrows(ApiException.class, () -> processor.process(file));

        assertEquals(ErrorCode.INVALID_IMAGE_DIMENSIONS, exception.getErrorCode());
    }

    private MockMultipartFile createPngFile(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setColor(new Color(95, 124, 255));
            graphics.fillRect(0, 0, width, height);
        } finally {
            graphics.dispose();
        }

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return new MockMultipartFile(
            "image",
            "record.png",
            "image/png",
            output.toByteArray()
        );
    }
}
