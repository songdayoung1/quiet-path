package kr.co.quietpath.domain.reaction.repository;

import kr.co.quietpath.domain.reaction.entity.Reaction;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReactionRepository extends JpaRepository<Reaction, Long> {

    interface WeeklyTop3Projection {
        Long getRecordId();
        Long getReactionCount();
        LocalDateTime getReactedAt();
    }

    interface RecordReactionCountProjection {
        Long getRecordId();
        Long getReactionCount();
    }

    Optional<Reaction> findByUserIdAndRecordId(Long userId, Long recordId);
    
    Optional<Reaction> findByUser_IdAndRecord_Id(Long userId, Long recordId);

    List<Reaction> findByRecordIdOrderByCreatedAtDesc(Long recordId);
    
    boolean existsByUserIdAndRecordId(Long userId, Long recordId);

    boolean existsByUser_IdAndRecord_Id(Long userId, Long recordId);

    void deleteByUserIdAndRecordId(Long userId, Long recordId);
    
    void deleteByUser_IdAndRecord_Id(Long userId, Long recordId);

    long countByRecordId(Long recordId);

    long countByRecord_Id(Long recordId);

    @Query("""
        select r.record.id as recordId,
               count(r.id) as reactionCount,
               max(r.createdAt) as reactedAt
        from Reaction r
        where r.createdAt >= :from
          and r.createdAt <= :to
          and r.record.isHidden = false
          and r.record.visibility = 'PUBLIC'
          and r.record.sharedAt is not null
        group by r.record.id
        """)
    List<WeeklyTop3Projection> findWeeklyTop3Candidates(
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );

    @Query("""
        select distinct r.record.path.id
        from Reaction r
        where r.user.id = :userId
          and r.record.path.id in :pathIds
        """)
    List<Long> findReactedPathIds(
        @Param("userId") Long userId,
        @Param("pathIds") List<Long> pathIds
    );

    @Query("""
        select r.record.id as recordId,
               count(r.id) as reactionCount
        from Reaction r
        where r.record.id in :recordIds
        group by r.record.id
        """)
    List<RecordReactionCountProjection> countByRecordIds(
        @Param("recordIds") List<Long> recordIds
    );

    @Query("""
        select distinct r.record.id
        from Reaction r
        where r.user.id = :userId
          and r.record.id in :recordIds
        """)
    List<Long> findReactedRecordIds(
        @Param("userId") Long userId,
        @Param("recordIds") List<Long> recordIds
    );

    @Query("select r from Reaction r join fetch r.record where r.user.id = :userId")
    List<Reaction> findAllWithRecordByUserId(@Param("userId") Long userId);

    default boolean existsByUserIdAndTargetTypeAndTargetId(Long userId, String targetType, Long targetId) {
        if (!"RECORD".equals(targetType)) {
            return false;
        }
        return existsByUser_IdAndRecord_Id(userId, targetId);
    }

    default Optional<Reaction> findByUserIdAndTargetTypeAndTargetId(Long userId, String targetType, Long targetId) {
        if (!"RECORD".equals(targetType)) {
            return Optional.empty();
        }
        return findByUser_IdAndRecord_Id(userId, targetId);
    }

    default long countByTargetTypeAndTargetId(String targetType, Long targetId) {
        if (!"RECORD".equals(targetType)) {
            return 0L;
        }
        return countByRecord_Id(targetId);
    }
}
