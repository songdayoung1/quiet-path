package kr.co.quietpath.api.reaction.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.reaction.dto.request.ReactionCreateRequest;
import kr.co.quietpath.api.reaction.dto.request.ReactionDeleteRequest;
import kr.co.quietpath.api.reaction.dto.request.ReactionMeQuery;
import kr.co.quietpath.api.reaction.dto.response.ReactionCountResponse;
import kr.co.quietpath.api.reaction.dto.response.ReactionCreateResponse;
import kr.co.quietpath.api.reaction.dto.response.ReactionDeleteResponse;
import kr.co.quietpath.api.reaction.dto.response.ReactionMeResponse;
import kr.co.quietpath.domain.reaction.entity.Reaction;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Transactional
public class ReactionService {

    private static final String TARGET_RECORD = "RECORD";
    private static final String VISIBILITY_PUBLIC = "PUBLIC";

    private final ReactionRepository reactionRepository;
    private final RecordRepository recordRepository;
    private final UserRepository userRepository;

    public ReactionCreateResponse createReaction(Long userId, ReactionCreateRequest request) {
        validateTargetType(request.getTargetType());
        Record record = getRecord(request.getTargetId());
        validatePublic(record);

        if (reactionRepository.existsByUserIdAndTargetTypeAndTargetId(userId, request.getTargetType(), request.getTargetId())) {
            throw new ApiException(ErrorCode.REACTION_ALREADY_EXISTS);
        }

        User user = getUser(userId);
        Reaction reaction = Reaction.builder()
            .record(record)
            .user(user)
            .build();
        reactionRepository.save(reaction);

        record.increaseReactionCount();

        long reactionCount = reactionRepository.countByTargetTypeAndTargetId(request.getTargetType(), request.getTargetId());
        return ReactionCreateResponse.builder()
            .reactionId(reaction.getId())
            .targetType(request.getTargetType())
            .targetId(request.getTargetId())
            .reacted(true)
            .reactionCount(reactionCount)
            .reactedAt(formatDateTime(reaction.getCreatedAt()))
            .build();
    }

    public ReactionDeleteResponse deleteReaction(Long userId, ReactionDeleteRequest request) {
        validateTargetType(request.getTargetType());
        Reaction reaction = reactionRepository.findByUserIdAndTargetTypeAndTargetId(userId, request.getTargetType(), request.getTargetId())
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_OWNER));

        Record record = reaction.getRecord();
        reactionRepository.delete(reaction);
        record.decreaseReactionCount();

        long reactionCount = reactionRepository.countByTargetTypeAndTargetId(request.getTargetType(), request.getTargetId());
        return ReactionDeleteResponse.builder()
            .targetType(request.getTargetType())
            .targetId(request.getTargetId())
            .reacted(false)
            .reactionCount(reactionCount)
            .build();
    }

    @Transactional(readOnly = true)
    public ReactionMeResponse getMyReaction(Long userId, ReactionMeQuery query) {
        validateTargetType(query.getTargetType());
        getRecord(query.getTargetId());
        boolean reacted = reactionRepository.existsByUserIdAndTargetTypeAndTargetId(userId, query.getTargetType(), query.getTargetId());
        return ReactionMeResponse.builder()
            .targetType(query.getTargetType())
            .targetId(query.getTargetId())
            .reacted(reacted)
            .build();
    }

    @Transactional(readOnly = true)
    public ReactionCountResponse getReactionCount(ReactionMeQuery query) {
        validateTargetType(query.getTargetType());
        getRecord(query.getTargetId());
        long count = reactionRepository.countByTargetTypeAndTargetId(query.getTargetType(), query.getTargetId());
        return ReactionCountResponse.builder()
            .targetType(query.getTargetType())
            .targetId(query.getTargetId())
            .reactionCount(count)
            .build();
    }

    private void validateTargetType(String targetType) {
        if (!TARGET_RECORD.equals(targetType)) {
            throw new ApiException(ErrorCode.TARGET_NOT_FOUND);
        }
    }

    private Record getRecord(Long recordId) {
        return recordRepository.findById(recordId)
            .orElseThrow(() -> new ApiException(ErrorCode.TARGET_NOT_FOUND));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
    }

    private void validatePublic(Record record) {
        if (!VISIBILITY_PUBLIC.equals(record.getVisibility())) {
            throw new ApiException(ErrorCode.TARGET_NOT_PUBLIC);
        }
    }

    private String formatDateTime(java.time.LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault())
            .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
