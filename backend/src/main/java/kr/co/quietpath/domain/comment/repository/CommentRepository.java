package kr.co.quietpath.domain.comment.repository;

import kr.co.quietpath.domain.comment.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    Page<Comment> findByRecordIdOrderByCreatedAtAsc(Long recordId, Pageable pageable);

    long countByRecordId(Long recordId);
}
