package kr.co.quietpath.api.notification.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class NotificationListResponse {
    private List<NotificationItem> items;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
