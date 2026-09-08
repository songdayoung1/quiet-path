package kr.co.quietpath.domain.path.repository;

import jakarta.persistence.LockModeType;
import kr.co.quietpath.domain.path.entity.Path;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PathRepository extends JpaRepository<Path, Long> {

    boolean existsByUserId(Long userId);

    List<Path> findByUserIdOrderByReviewAtDesc(Long userId);

    List<Path> findByUserIdAndStatusOrderByReviewAtDesc(Long userId, String status);
    
    Optional<Path> findByUserIdAndStatus(Long userId, String status);

    Optional<Path> findByIdAndUserId(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Path p where p.id = :id")
    Optional<Path> findByIdForUpdate(@Param("id") Long id);

    List<Path> findByUserIdInAndStatus(List<Long> userIds, String status);

    List<Path> findByIdIn(List<Long> ids);

    @Modifying(flushAutomatically = true)
    @Query("update Path p set p.coverRecord = null where p.userId = :userId")
    int clearCoverRecordsByUserId(@Param("userId") Long userId);

    @Modifying(flushAutomatically = true)
    @Query("delete from Path p where p.userId = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);

    @Query("""
        select p from Path p
        where p.userId = :userId
          and p.status = :status
          and p.completedAt is not null
          and (
            :cursorTime is null
            or (p.completedAt < :cursorTime)
            or (p.completedAt = :cursorTime and p.id < :cursorId)
          )
        order by p.completedAt desc, p.id desc
        """)
    List<Path> findFinishedPathsWithCursor(
        @Param("userId") Long userId,
        @Param("status") String status,
        @Param("cursorTime") LocalDateTime cursorTime,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );
}
