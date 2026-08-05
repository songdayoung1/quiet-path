package kr.co.quietpath.domain.record.repository;

import kr.co.quietpath.domain.record.entity.RecordImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecordImageRepository extends JpaRepository<RecordImage, Long> {

    @Modifying(flushAutomatically = true)
    @Query("delete from RecordImage i where i.id in :imageIds")
    int deleteAllByIds(@Param("imageIds") List<Long> imageIds);
}
