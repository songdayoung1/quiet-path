package kr.co.quietpath.api.record.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RecordPinRequest {

    @NotNull
    private Boolean pinned;
}
