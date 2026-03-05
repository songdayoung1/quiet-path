package kr.co.quietpath.domain.user.entity;

import jakarta.persistence.*;
import kr.co.quietpath.domain.title.entity.Title;
import kr.co.quietpath.domain.path.entity.Path;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "users", uniqueConstraints = {
    @UniqueConstraint(name = "uk_provider_user", columnNames = {"provider", "provider_user_id"}),
    @UniqueConstraint(name = "uk_nickname", columnNames = {"nickname"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProviderType provider;

    @Column(nullable = false, length = 128)
    private String providerUserId;

    @Column(length = 255)
    private String email;

    @Column(nullable = false, length = 30, unique = true)
    private String nickname;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_title_id")
    private Title currentTitle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_path_id")
    private Path currentPath;

    @Column(nullable = false)
    private Integer level;

    @Column(nullable = false)
    private Integer stepsTaken;

    @Column(nullable = false)
    private Boolean dataSyncEnabled;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column
    private LocalDateTime lastLoginAt;

    @Builder(access = AccessLevel.PRIVATE)
    private User(
        ProviderType provider,
        String providerUserId,
        String email,
        String nickname
    ) {
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.email = email;
        this.nickname = nickname;
        this.level = 1;
        this.stepsTaken = 0;
        this.dataSyncEnabled = true;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public static User createGoogle(
        String providerUserId,
        String email,
        String nickname
    ) {
        Objects.requireNonNull(providerUserId, "providerUserId는 필수입니다.");
        Objects.requireNonNull(nickname, "nickname은 필수입니다.");

        return User.builder()
            .provider(ProviderType.GOOGLE)
            .providerUserId(providerUserId)
            .email(email)
            .nickname(nickname)
            .build();
    }

    private void touch() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateNickname(String nickname) {
        this.nickname = nickname;
        touch();
    }

    public void updateEmail(String email) {
        this.email = email;
        touch();
    }

    public void equipTitle(Title title) {
        this.currentTitle = title;
        touch();
    }

    public void unequipTitle() {
        this.currentTitle = null;
        touch();
    }

    public void setActivePath(Path path) {
        this.currentPath = path;
        touch();
    }

    public void clearActivePath() {
        this.currentPath = null;
        touch();
    }

    public void increaseSteps(int steps) {
        this.stepsTaken += steps;
        touch();
    }

    public void levelUp() {
        this.level++;
        touch();
    }

    public void toggleDataSync() {
        this.dataSyncEnabled = !this.dataSyncEnabled;
        touch();
    }

    public void updateLastLogin() {
        this.lastLoginAt = LocalDateTime.now();
        touch();
    }
}
