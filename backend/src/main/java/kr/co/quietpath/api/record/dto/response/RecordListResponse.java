package kr.co.quietpath.api.record.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class RecordListResponse {
    private List<RecordListItem> items;
}
