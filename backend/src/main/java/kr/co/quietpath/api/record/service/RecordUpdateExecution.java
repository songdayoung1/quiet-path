package kr.co.quietpath.api.record.service;

import kr.co.quietpath.api.record.dto.response.RecordUpdateResponse;

public record RecordUpdateExecution(
    RecordUpdateResponse response,
    String previousStorageKey
) {
}
