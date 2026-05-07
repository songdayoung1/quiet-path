package kr.co.quietpath.domain.auth.repository;

import kr.co.quietpath.domain.auth.entity.RefreshTokenSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenSessionRepository extends JpaRepository<RefreshTokenSession, Long> {
    Optional<RefreshTokenSession> findByTokenHash(String tokenHash);
    Optional<RefreshTokenSession> findByUserIdAndSessionId(Long userId, String sessionId);
}
