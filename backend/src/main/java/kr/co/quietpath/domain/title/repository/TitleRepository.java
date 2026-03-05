package kr.co.quietpath.domain.title.repository;

import kr.co.quietpath.domain.title.entity.Title;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TitleRepository extends JpaRepository<Title, Long> {

    Optional<Title> findByCode(String code);
    
}
