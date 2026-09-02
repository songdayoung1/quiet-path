package kr.co.quietpath.domain.path.repository;

import kr.co.quietpath.domain.path.entity.PathCoverImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PathCoverImageRepository extends JpaRepository<PathCoverImage, Long> {

    Optional<PathCoverImage> findByPath_Id(Long pathId);

    List<PathCoverImage> findAllByPath_IdIn(Collection<Long> pathIds);
}
