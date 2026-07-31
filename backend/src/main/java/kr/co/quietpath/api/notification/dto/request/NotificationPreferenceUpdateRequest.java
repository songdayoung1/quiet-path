package kr.co.quietpath.api.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

@Getter
@Setter
public class NotificationPreferenceUpdateRequest {

    @NotNull
    private Boolean reactionEnabled;

    @NotNull
    private Boolean commentEnabled;

    @NotNull
    private Boolean reviewReminderEnabled;

    @NotNull
    private LocalTime reviewReminderTime;

    @NotBlank
    @Size(max = 50)
    private String timeZone;
}
