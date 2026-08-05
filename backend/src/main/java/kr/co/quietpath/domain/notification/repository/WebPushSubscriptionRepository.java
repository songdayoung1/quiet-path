package kr.co.quietpath.domain.notification.repository;

import kr.co.quietpath.domain.notification.entity.WebPushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WebPushSubscriptionRepository extends JpaRepository<WebPushSubscription, Long> {

    Optional<WebPushSubscription> findByEndpointHash(String endpointHash);

    List<WebPushSubscription> findAllByUserId(Long userId);

    long deleteByUserIdAndEndpoint(Long userId, String endpoint);

    long deleteAllByUserId(Long userId);
}
