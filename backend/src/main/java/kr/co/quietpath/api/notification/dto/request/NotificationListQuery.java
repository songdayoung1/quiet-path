package kr.co.quietpath.api.notification.dto.request;

import jakarta.validation.constraints.Max;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class NotificationListQuery {

    private Integer page;

    @Max(50)
    private Integer size;

    private Boolean unreadOnly;
}
