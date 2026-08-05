package kr.co.quietpath.domain.summary.repository;

import kr.co.quietpath.domain.summary.entity.PathSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PathSummaryRepository extends JpaRepository<PathSummary, Long> {

    Optional<PathSummary> findTopByPathIdOrderByVersionNoDesc(Long pathId);

    @Modifying(flushAutomatically = true)
    @Query("delete from PathSummary s where s.path.id in :pathIds")
    int deleteAllByPathIds(@Param("pathIds") List<Long> pathIds);
}
