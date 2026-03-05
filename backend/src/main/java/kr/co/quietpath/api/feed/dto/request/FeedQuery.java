package kr.co.quietpath.api.feed.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class FeedQuery {
    private Integer size;
    private String cursor;
}
