package kr.co.quietpath.domain.summary.repository;

import kr.co.quietpath.domain.summary.entity.PathSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PathSummaryRepository extends JpaRepository<PathSummary, Long> {

    Optional<PathSummary> findTopByPathIdOrderByVersionNoDesc(Long pathId);
}
