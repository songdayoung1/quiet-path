package kr.co.quietpath.domain.auth.repository;

import kr.co.quietpath.domain.auth.entity.RefreshTokenSession;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;

public interface RefreshTokenSessionRepository extends CrudRepository<RefreshTokenSession, String> {
    Optional<RefreshTokenSession> findByTokenHash(String tokenHash);
    Optional<RefreshTokenSession> findByUserIdAndSessionId(Long userId, String sessionId);
    List<RefreshTokenSession> findAllByUserId(Long userId);
}
