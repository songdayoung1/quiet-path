package kr.co.quietpath.api.auth.service;

import kr.co.quietpath.api.comment.service.CommentPageCacheService;
import kr.co.quietpath.api.feed.service.WeeklyTop3CacheService;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.reaction.entity.Reaction;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WithdrawalCommunityDataService {

    private final CommentRepository commentRepository;
    private final ReactionRepository reactionRepository;
    private final CommentPageCacheService commentPageCacheService;
    private final WeeklyTop3CacheService weeklyTop3CacheService;

    @Transactional
    public void anonymizeCommentsAndDeleteReactions(Long userId) {
        List<Long> commentRecordIds = commentRepository.findDistinctRecordIdsByUserId(userId);
        commentRepository.anonymizeByUserId(userId, LocalDateTime.now());
        commentRecordIds.forEach(commentPageCacheService::evictRecord);

        List<Reaction> reactions = reactionRepository.findAllWithRecordByUserId(userId);
        if (reactions.isEmpty()) {
            return;
        }

        reactions.forEach(reaction -> reaction.getRecord().decreaseReactionCount());
        reactionRepository.deleteAllInBatch(reactions);
        weeklyTop3CacheService.evict();
    }
}
