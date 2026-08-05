package kr.co.quietpath.domain.record.repository;

import kr.co.quietpath.domain.record.entity.Record;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RecordRepository extends JpaRepository<Record, Long> {
    
    Optional<Record> findByUserIdAndRecordDate(Long userId, LocalDate recordDate);

    Optional<Record> findByUser_IdAndRecordDate(Long userId, LocalDate recordDate);

    Optional<Record> findByPath_IdAndRecordDate(Long pathId, LocalDate recordDate);

    Optional<Record> findByPath_IdAndRecordDateAndIsHiddenFalse(Long pathId, LocalDate recordDate);

    List<Record> findByPathIdOrderByRecordDateDesc(Long pathId);

    List<Record> findByPath_IdOrderByRecordDateDesc(Long pathId);

    List<Record> findAllByPathIdOrderByRecordDateAsc(Long pathId);

    List<Record> findAllByPath_IdOrderByRecordDateAsc(Long pathId);

    List<Record> findAllByPath_IdAndIsHiddenFalseOrderByRecordDateAsc(Long pathId);

    List<Record> findByUserIdOrderByRecordDateDesc(Long userId);

    List<Record> findByUser_IdOrderByRecordDateDesc(Long userId);

    List<Record> findByUser_IdAndIsHiddenFalseOrderByPinnedAtDescRecordDateDescIdDesc(Long userId);

    Optional<Record> findTopByUser_IdAndIsHiddenFalseOrderByRecordDateAscIdAsc(Long userId);

    List<Record> findByUser_IdAndIsHiddenFalseAndRecordDateBetweenOrderByPinnedAtDescRecordDateDescIdDesc(
        Long userId,
        LocalDate from,
        LocalDate to
    );

    Page<Record> findAllByVisibilityAndCategoryCode(
        String visibility,
        String categoryCode,
        Pageable pageable
    );

    boolean existsByUserIdAndRecordDate(Long userId, LocalDate recordDate);

    boolean existsByUser_IdAndRecordDate(Long userId, LocalDate recordDate);

    boolean existsByPath_IdAndRecordDate(Long pathId, LocalDate recordDate);

    boolean existsByPath_IdAndRecordDateAndIsHiddenFalse(Long pathId, LocalDate recordDate);

    Optional<Record> findByIdAndIsHiddenFalse(Long id);

    @Query("select r from Record r left join fetch r.image where r.user.id = :userId")
    List<Record> findAllWithImageByUserId(@Param("userId") Long userId);

    @Modifying(flushAutomatically = true)
    @Query("delete from Record r where r.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);

    @Query("""
        select r from Record r
        join fetch r.path p
        join fetch r.user u
        where r.visibility = :visibility
          and r.isHidden = false
          and r.sharedAt is not null
          and (:categoryCode is null or r.categoryCode = :categoryCode)
          and (
            :cursorSharedAt is null
            or (r.sharedAt < :cursorSharedAt)
            or (r.sharedAt = :cursorSharedAt and r.id < :cursorId)
          )
        order by r.sharedAt desc, r.id desc
        """)
    List<Record> findPublicFeedRecords(
        @Param("visibility") String visibility,
        @Param("categoryCode") String categoryCode,
        @Param("cursorSharedAt") LocalDateTime cursorSharedAt,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );
}
