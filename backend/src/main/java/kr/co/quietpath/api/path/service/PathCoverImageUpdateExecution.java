package kr.co.quietpath.api.path.service;

import kr.co.quietpath.api.path.dto.response.PathCoverImageResponse;

public record PathCoverImageUpdateExecution(
    PathCoverImageResponse response,
    String previousStorageKey
) {
}
