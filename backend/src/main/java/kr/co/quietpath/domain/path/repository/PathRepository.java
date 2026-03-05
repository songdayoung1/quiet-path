package kr.co.quietpath.domain.path.repository;

import kr.co.quietpath.domain.path.entity.Path;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PathRepository extends JpaRepository<Path, Long> {

    List<Path> findByUserIdOrderByAnchorAtDesc(Long userId);

    List<Path> findByUserIdAndStatusOrderByAnchorAtDesc(Long userId, String status);
    
    Optional<Path> findByUserIdAndStatus(Long userId, String status);

    Optional<Path> findByIdAndUserId(Long id, Long userId);

    List<Path> findByIdIn(List<Long> ids);

    @Query("""
        select p from Path p
        where p.userId = :userId
          and p.status = :status
          and p.closedAt is not null
          and (
            :cursorTime is null
            or (p.closedAt < :cursorTime)
            or (p.closedAt = :cursorTime and p.id < :cursorId)
          )
        order by p.closedAt desc, p.id desc
        """)
    List<Path> findFinishedPathsWithCursor(
        @Param("userId") Long userId,
        @Param("status") String status,
        @Param("cursorTime") LocalDateTime cursorTime,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );
}
