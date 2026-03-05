package kr.co.quietpath.domain.title.repository;

import kr.co.quietpath.domain.title.entity.UserTitle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserTitleRepository extends JpaRepository<UserTitle, Long> {

    List<UserTitle> findByUserIdOrderByAcquiredAtDesc(Long userId);

    boolean existsByUserIdAndTitleId(Long userId, Long titleId);
    
}
