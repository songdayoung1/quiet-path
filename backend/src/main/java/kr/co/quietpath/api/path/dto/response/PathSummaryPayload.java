package kr.co.quietpath.api.path.dto.response;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class PathSummaryPayload {
    private String headline;
    private String body;
    private String perspective;
    private List<String> observations;
    private List<String> improvements;
    private List<String> suggestions;
    private String closing;
}
