package kr.co.quietpath.global.config;

import kr.co.quietpath.api.comment.dto.response.CommentListItem;
import kr.co.quietpath.api.comment.dto.response.CommentListResponse;
import kr.co.quietpath.api.feed.dto.response.OwnerSummary;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3BaseItem;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3BaseResponse;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Window;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

class CacheSerializationTest {

    private final GenericJacksonJsonRedisSerializer serializer = CacheConfig.redisJsonSerializer();

    @Test
    void weeklyTop3BaseResponse_roundTripsWithJacksonizedBuilder() {
        WeeklyTop3BaseResponse source = WeeklyTop3BaseResponse.builder()
            .window(WeeklyTop3Window.builder()
                .from("2026-06-11")
                .to("2026-06-18")
                .build())
            .items(List.of(
                WeeklyTop3BaseItem.builder()
                    .pathId(1L)
                    .recordId(10L)
                    .title("질문")
                    .content("내용")
                    .status("ACTIVE")
                    .owner(OwnerSummary.builder()
                        .userId(99L)
                        .nickname("nick")
                        .profileImageUrl(null)
                        .build())
                    .categoryCode("study")
                    .reactionCount(5L)
                    .commentCount(2L)
                    .sharedAt("2026-06-18T10:00:00")
                    .createdAt("2026-06-18T09:00:00")
                    .build()
            ))
            .build();

        Object restored = serializer.deserialize(serializer.serialize(source));

        WeeklyTop3BaseResponse response = assertInstanceOf(WeeklyTop3BaseResponse.class, restored);
        assertEquals("2026-06-11", response.getWindow().getFrom());
        assertEquals(10L, response.getItems().get(0).getRecordId());
        assertEquals("nick", response.getItems().get(0).getOwner().getNickname());
    }

    @Test
    void commentListResponse_roundTripsWithJacksonizedBuilder() {
        CommentListResponse source = CommentListResponse.builder()
            .items(List.of(
                CommentListItem.builder()
                    .commentId(100L)
                    .userId(1L)
                    .nickname("nick1")
                    .profileImageUrl(null)
                    .content("댓글")
                    .deleted(false)
                    .createdAt("2026-06-18T10:00:00")
                    .updatedAt("2026-06-18T10:05:00")
                    .build()
            ))
            .page(0)
            .size(20)
            .totalElements(1L)
            .totalPages(1)
            .build();

        Object restored = serializer.deserialize(serializer.serialize(source));

        CommentListResponse response = assertInstanceOf(CommentListResponse.class, restored);
        assertEquals(1, response.getItems().size());
        assertEquals(100L, response.getItems().get(0).getCommentId());
        assertEquals("nick1", response.getItems().get(0).getNickname());
    }
}
