package kr.co.quietpath.api.path.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PathListResponse {
    private List<PathListItem> items;
    private String nextCursor;
}
