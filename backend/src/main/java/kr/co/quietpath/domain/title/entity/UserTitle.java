package kr.co.quietpath.domain.title.entity;

import jakarta.persistence.*;
import kr.co.quietpath.domain.user.entity.User;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_titles", 
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_title", columnNames = {"user_id", "title_id"})
    },
    indexes = {
        @Index(name = "idx_user_acquired", columnList = "user_id, acquired_at")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserTitle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "title_id", nullable = false)
    private Title title;

    @Column(nullable = false)
    private LocalDateTime acquiredAt;

    @Builder
    public UserTitle(User user, Title title) {
        this.user = user;
        this.title = title;
        this.acquiredAt = LocalDateTime.now();
    }
}
