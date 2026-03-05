package kr.co.quietpath.domain.reaction.entity;

import jakarta.persistence.*;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.user.entity.User;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "reactions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_record", columnNames = {"user_id", "record_id"})
    },
    indexes = {
        @Index(name = "idx_record_created", columnList = "record_id, created_at")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Reaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "record_id", nullable = false)
    private Record record;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Builder
    public Reaction(Record record, User user) {
        this.record = record;
        this.user = user;
        this.createdAt = LocalDateTime.now();
    }
}
