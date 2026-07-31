package kr.co.quietpath.domain.record.entity;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RecordImageTest {

    @Test
    void create_usesDefaultDisplayPosition() {
        RecordImage image = RecordImage.builder()
            .storageKey("records/2026/07/image.webp")
            .imageUrl("https://static.quietpath.app/records/2026/07/image.webp")
            .build();

        assertEquals(new BigDecimal("50.00"), image.getPositionX());
        assertEquals(new BigDecimal("50.00"), image.getPositionY());
        assertEquals(new BigDecimal("1.00"), image.getScale());
    }

    @Test
    void updateDisplayPosition_updatesValidValues() {
        RecordImage image = RecordImage.builder()
            .imageUrl("https://static.quietpath.app/records/2026/07/image.webp")
            .build();

        image.updateDisplayPosition(
            new BigDecimal("35.50"),
            new BigDecimal("72.25"),
            new BigDecimal("1.40")
        );

        assertEquals(new BigDecimal("35.50"), image.getPositionX());
        assertEquals(new BigDecimal("72.25"), image.getPositionY());
        assertEquals(new BigDecimal("1.40"), image.getScale());
    }

    @Test
    void create_rejectsOutOfRangeDisplayPosition() {
        assertThrows(IllegalArgumentException.class, () -> RecordImage.builder()
            .imageUrl("https://static.quietpath.app/records/2026/07/image.webp")
            .positionX(new BigDecimal("100.01"))
            .build());

        assertThrows(IllegalArgumentException.class, () -> RecordImage.builder()
            .imageUrl("https://static.quietpath.app/records/2026/07/image.webp")
            .scale(new BigDecimal("3.01"))
            .build());
    }

    @Test
    void create_rejectsBlankImageUrl() {
        assertThrows(IllegalArgumentException.class, () -> RecordImage.builder()
            .imageUrl(" ")
            .build());
    }
}
