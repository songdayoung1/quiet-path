package kr.co.quietpath.domain.comment.repository;

import kr.co.quietpath.domain.comment.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    interface RecordCommentCountProjection {
        Long getRecordId();
        Long getCommentCount();
    }

    Page<Comment> findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(Long recordId, Pageable pageable);

    long countByRecordId(Long recordId);

    @Query("""
        select c.recordId as recordId,
               count(c.id) as commentCount
        from Comment c
        where c.recordId in :recordIds
          and c.deleted = false
        group by c.recordId
        """)
    List<RecordCommentCountProjection> countByRecordIds(
        @Param("recordIds") List<Long> recordIds
    );
}
