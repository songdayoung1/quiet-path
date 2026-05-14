package kr.co.quietpath.api.feed.dto.response;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class FeedResponseSerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void feedItemSerializesBooleanFieldAsIsReacted() throws Exception {
        FeedItem item = FeedItem.builder()
            .recordId(1L)
            .reactionCount(3L)
            .commentCount(2L)
            .isReacted(true)
            .build();

        String json = objectMapper.writeValueAsString(item);

        assertTrue(json.contains("\"isReacted\":true"));
    }

    @Test
    void weeklyTop3ItemSerializesBooleanFieldAsIsReacted() throws Exception {
        WeeklyTop3Item item = WeeklyTop3Item.builder()
            .rank(1)
            .pathId(1L)
            .reactionCount(5L)
            .isReacted(false)
            .build();

        String json = objectMapper.writeValueAsString(item);

        assertTrue(json.contains("\"isReacted\":false"));
    }
}
