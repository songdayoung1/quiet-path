package kr.co.quietpath.domain.title.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "titles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Title {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50, unique = true)
    private String code;

    @Column(nullable = false, length = 50)
    private String displayName;

    @Column(length = 255)
    private String description;

    @Column(nullable = false)
    private Boolean isActive;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Builder
    public Title(
        String code,
        String displayName,
        String description
    ) {
        this.code = code;
        this.displayName = displayName;
        this.description = description;
        this.isActive = true;
        this.createdAt = LocalDateTime.now();
    }

    public void activate() {
        this.isActive = true;
    }

    public void deactivate() {
        this.isActive = false;
    }
}
