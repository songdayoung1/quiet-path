package kr.co.quietpath.domain.user.repository;

import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.entity.ProviderType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByProviderAndProviderUserId(ProviderType provider, String providerUserId);
    Optional<User> findByNickname(String nickname);
    boolean existsByNickname(String nickname);
    List<User> findByIdIn(List<Long> ids);
}
