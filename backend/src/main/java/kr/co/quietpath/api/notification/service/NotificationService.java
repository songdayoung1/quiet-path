package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.notification.dto.request.NotificationListQuery;
import kr.co.quietpath.api.notification.dto.response.ActorSummary;
import kr.co.quietpath.api.notification.dto.response.NotificationItem;
import kr.co.quietpath.api.notification.dto.response.NotificationListResponse;
import kr.co.quietpath.api.notification.dto.response.NotificationReadAllResponse;
import kr.co.quietpath.api.notification.dto.response.NotificationReadResponse;
import kr.co.quietpath.domain.notification.entity.Notification;
import kr.co.quietpath.domain.notification.repository.NotificationRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public NotificationListResponse getNotifications(Long userId, NotificationListQuery query) {
        int page = normalizePage(query.getPage());
        int size = normalizeSize(query.getSize());
        boolean unreadOnly = Boolean.TRUE.equals(query.getUnreadOnly());

        Page<Notification> notificationPage = unreadOnly
            ? notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(
                userId,
                PageRequest.of(page, size)
            )
            : notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(
                userId,
                PageRequest.of(page, size)
            );

        List<Notification> notifications = notificationPage.getContent();
        Set<Long> actorIds = notifications.stream()
            .map(Notification::getActorUserId)
            .collect(Collectors.toSet());

        Map<Long, User> userMap = actorIds.isEmpty()
            ? Map.of()
            : userRepository.findByIdIn(List.copyOf(actorIds)).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        List<NotificationItem> items = notifications.stream()
            .map(notification -> {
                User actorUser = userMap.get(notification.getActorUserId());
                ActorSummary actor = ActorSummary.builder()
                    .userId(notification.getActorUserId())
                    .nickname(actorUser != null ? actorUser.getNickname() : null)
                    .profileImageUrl(null)
                    .build();

                return NotificationItem.builder()
                    .notificationId(notification.getId())
                    .type(notification.getType())
                    .actor(actor)
                    .targetType(notification.getTargetType())
                    .targetId(notification.getTargetId())
                    .message(notification.getMessage())
                    .read(notification.isRead())
                    .createdAt(formatDateTime(notification.getCreatedAt()))
                    .readAt(notification.getReadAt() != null ? formatDateTime(notification.getReadAt()) : null)
                    .build();
            })
            .toList();

        return NotificationListResponse.builder()
            .items(items)
            .page(notificationPage.getNumber())
            .size(notificationPage.getSize())
            .totalElements(notificationPage.getTotalElements())
            .totalPages(notificationPage.getTotalPages())
            .build();
    }

    @Transactional
    public NotificationReadResponse readNotification(Long userId, Long notificationId) {
        Notification notification = getNotification(notificationId);
        validateOwner(userId, notification);

        if (!notification.isRead()) {
            notification.markRead(LocalDateTime.now());
        }

        return NotificationReadResponse.builder()
            .notificationId(notification.getId())
            .read(notification.isRead())
            .readAt(notification.getReadAt() != null ? formatDateTime(notification.getReadAt()) : null)
            .build();
    }

    @Transactional
    public NotificationReadAllResponse readAll(Long userId) {
        int updatedCount = notificationRepository.markAllAsRead(userId, LocalDateTime.now());
        return NotificationReadAllResponse.builder()
            .updatedCount(updatedCount)
            .build();
    }

    private Notification getNotification(Long notificationId) {
        return notificationRepository.findById(notificationId)
            .orElseThrow(() -> new ApiException(ErrorCode.NOTIFICATION_NOT_FOUND));
    }

    private void validateOwner(Long userId, Notification notification) {
        if (!notification.getRecipientUserId().equals(userId)) {
            throw new ApiException(ErrorCode.NOT_OWNER);
        }
    }

    private int normalizePage(Integer page) {
        if (page == null || page < 0) {
            return 0;
        }
        return page;
    }

    private int normalizeSize(Integer size) {
        if (size == null || size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault())
            .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
