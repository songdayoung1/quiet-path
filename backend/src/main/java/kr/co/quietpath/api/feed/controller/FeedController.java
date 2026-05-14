package kr.co.quietpath.api.feed.controller;

import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.feed.dto.response.FeedResponse;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Response;
import kr.co.quietpath.api.feed.service.FeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/feed")
@Validated
public class FeedController {

    private final FeedService feedService;

    @GetMapping
    public FeedResponse getFeed(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) String category,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String cursor
    ) {
        Long userId = principal != null ? principal.getUserId() : null;
        return feedService.getFeed(userId, category, size, cursor);
    }

    @GetMapping("/weekly-top3")
    public WeeklyTop3Response getWeeklyTop3(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getUserId() : null;
        return feedService.getWeeklyTop3(userId);
    }
}
