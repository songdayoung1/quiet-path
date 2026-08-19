package kr.co.quietpath.api.record.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.comment.service.CommentPageCacheService;
import kr.co.quietpath.api.feed.service.WeeklyTop3CacheService;
import kr.co.quietpath.api.record.dto.request.RecordCreateRequest;
import kr.co.quietpath.api.record.dto.request.RecordUpdateRequest;
import kr.co.quietpath.api.record.dto.request.RecordVisibilityRequest;
import kr.co.quietpath.api.record.dto.response.RecordCreateResponse;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.entity.RecordImage;
import kr.co.quietpath.domain.record.image.RecordImageUrlResolver;
import kr.co.quietpath.domain.record.repository.RecordImageRepository;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecordServiceTest {

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private RecordImageRepository recordImageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PathRepository pathRepository;

    @Mock
    private ReactionRepository reactionRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private WeeklyTop3CacheService weeklyTop3CacheService;

    @Mock
    private CommentPageCacheService commentPageCacheService;

    @Mock
    private RecordImageUrlResolver recordImageUrlResolver;

    @InjectMocks
    private RecordService recordService;

    @Test
    void createRecord_alreadyExists_returns409() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        Path activePath = buildPath(1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(pathRepository.findByUserIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.of(activePath));
        when(recordRepository.existsByPath_IdAndRecordDateAndIsHiddenFalse(1L, LocalDate.now()))
            .thenReturn(true);

        RecordCreateRequest request = new RecordCreateRequest();
        request.setContent("오늘은 집중이 잘 됐다");
        request.setVisibility("PRIVATE");

        ApiException ex = assertThrows(ApiException.class, () -> recordService.createRecord(1L, request));
        assertEquals(ErrorCode.RECORD_ALREADY_EXISTS, ex.getErrorCode());
    }

    @Test
    void createRecord_storesMoodCodeInRecordAndResponse() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        setId(user, 1L);
        Path activePath = buildPath(1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(pathRepository.findByUserIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.of(activePath));
        when(recordRepository.existsByPath_IdAndRecordDateAndIsHiddenFalse(1L, LocalDate.now()))
            .thenReturn(false);
        when(recordRepository.save(any(Record.class))).thenAnswer(invocation -> {
            Record savedRecord = invocation.getArgument(0);
            setId(savedRecord, 100L);
            return savedRecord;
        });

        RecordCreateRequest request = new RecordCreateRequest();
        request.setContent("오늘은 꽤 단단했다");
        request.setMoodCode("버팀");
        request.setVisibility("PRIVATE");

        RecordCreateResponse response = recordService.createRecord(1L, request);

        assertEquals(100L, response.getId());
        assertEquals("버팀", response.getMoodCode());
        assertEquals("job", response.getCategoryCode());
    }

    @Test
    void createRecord_expiredActivePath_returnsPathReviewRequired() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        setId(user, 1L);
        Path expiredPath = buildExpiredPath(1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(pathRepository.findByUserIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.of(expiredPath));

        RecordCreateRequest request = new RecordCreateRequest();
        request.setContent("오늘은 멈춰서 돌아봤다");
        request.setVisibility("PRIVATE");

        ApiException ex = assertThrows(ApiException.class, () -> recordService.createRecord(1L, request));
        assertEquals(ErrorCode.PATH_REVIEW_REQUIRED, ex.getErrorCode());
    }

    @Test
    void getRecords_returnsDirectionAndVisibilityMetadata() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        setId(user, 1L);
        Record record = buildRecord(user, LocalDate.now());
        record.share();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(recordRepository.findByUser_IdAndIsHiddenFalseOrderByPinnedAtDescRecordDateDescIdDesc(1L))
            .thenReturn(List.of(record));

        var response = recordService.getRecords(1L);

        assertEquals(1, response.getItems().size());
        assertEquals("job", response.getItems().get(0).getCategoryCode());
        assertEquals("질문", response.getItems().get(0).getDirectionName());
        assertEquals("설명", response.getItems().get(0).getDirectionText());
        assertEquals("PUBLIC", response.getItems().get(0).getVisibility());
    }

    @Test
    void getRecords_returnsResolvedImageUrl() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        setId(user, 1L);
        Record record = buildRecord(user, LocalDate.now());
        record.attachImage(RecordImage.builder()
            .storageKey("records/2026/08/19/image.webp")
            .imageUrl("https://bucket.s3.amazonaws.com/records/2026/08/19/image.webp")
            .build());

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(recordRepository.findByUser_IdAndIsHiddenFalseOrderByPinnedAtDescRecordDateDescIdDesc(1L))
            .thenReturn(List.of(record));
        when(recordImageUrlResolver.resolve(
            "records/2026/08/19/image.webp",
            "https://bucket.s3.amazonaws.com/records/2026/08/19/image.webp"
        )).thenReturn("https://signed.example.com/records/2026/08/19/image.webp?signature=test");

        var response = recordService.getRecords(1L);

        assertEquals(
            "https://signed.example.com/records/2026/08/19/image.webp?signature=test",
            response.getItems().get(0).getImageUrl()
        );
    }

    @Test
    void getMonthlyRecords_returnsMonthlyKpisAndPinnedFlag() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        setId(user, 1L);
        Record first = buildRecord(user, LocalDate.of(2026, 6, 24));
        first.pinMemory();
        Record second = buildRecord(user, LocalDate.of(2026, 6, 10));
        second.updateContent("기록", null, null, "반짝");
        second.attachImage(RecordImage.builder()
            .imageUrl("https://image.test/sample.png")
            .positionX(new BigDecimal("50.00"))
            .positionY(new BigDecimal("50.00"))
            .scale(new BigDecimal("1.00"))
            .build());

        when(recordImageUrlResolver.resolve(null, "https://image.test/sample.png"))
            .thenReturn("https://image.test/sample.png");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(recordRepository.findByUser_IdAndIsHiddenFalseAndRecordDateBetweenOrderByPinnedAtDescRecordDateDescIdDesc(
            1L,
            LocalDate.of(2026, 6, 1),
            LocalDate.of(2026, 6, 30)
        )).thenReturn(List.of(first, second));
        when(recordRepository.findTopByUser_IdAndIsHiddenFalseOrderByRecordDateAscIdAsc(1L))
            .thenReturn(Optional.of(second));

        var response = recordService.getMonthlyRecords(1L, 2026, 6);

        assertEquals(2026, response.getYear());
        assertEquals(6, response.getMonth());
        assertEquals(2026, response.getFirstRecordYear());
        assertEquals(6, response.getFirstRecordMonth());
        assertEquals(2, response.getRecordsCount());
        assertEquals(1, response.getPhotoCount());
        assertEquals(50, response.getPhotoCoverage());
        assertEquals(true, response.getItems().get(0).getIsPinned());
        assertEquals(false, response.getItems().get(1).getIsPinned());
    }

    @Test
    void updatePin_togglesPinnedState() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Record record = buildRecord(owner, LocalDate.now().minusDays(5));

        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        var pinnedResponse = recordService.updatePin(1L, 10L, true);
        assertEquals(true, pinnedResponse.getIsPinned());
        assertEquals(true, record.getPinnedAt() != null);

        var unpinnedResponse = recordService.updatePin(1L, 10L, false);
        assertEquals(false, unpinnedResponse.getIsPinned());
        assertEquals(true, record.getPinnedAt() == null);
    }

    @Test
    void updateRecord_notOwner_returns403() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Path activePath = buildPath(1L);
        Record record = Record.builder()
            .user(owner)
            .path(activePath)
            .categoryCode(activePath.getCategoryCode())
            .recordDate(LocalDate.now())
            .sceneText("기존 내용")
            .oneWordText(null)
            .tomorrowText(null)
            .moodCode(null)
            .build();
        setId(record, 10L);

        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        RecordUpdateRequest request = new RecordUpdateRequest();
        request.setContent("수정 내용");

        ApiException ex = assertThrows(ApiException.class, () -> recordService.updateRecord(2L, 10L, request));
        assertEquals(ErrorCode.NOT_OWNER, ex.getErrorCode());
    }

    @Test
    void updateRecord_updatesMoodCodeWithoutCreatingNewRecord() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Path activePath = buildPath(1L);
        Record record = Record.builder()
            .user(owner)
            .path(activePath)
            .categoryCode(activePath.getCategoryCode())
            .recordDate(LocalDate.now())
            .sceneText("기존 내용")
            .oneWordText(null)
            .tomorrowText(null)
            .moodCode("잔잔")
            .build();
        setId(record, 10L);

        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        RecordUpdateRequest request = new RecordUpdateRequest();
        request.setContent("수정 내용");
        request.setMoodCode("반짝");

        var response = recordService.updateRecord(1L, 10L, request);

        assertEquals(10L, response.getId());
        assertEquals("반짝", response.getMoodCode());
        assertEquals("반짝", record.getMoodCode());
    }

    @Test
    void updateRecord_doesNotChangeVisibility() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Record record = buildRecord(owner, LocalDate.now());
        record.share();
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        RecordUpdateRequest request = new RecordUpdateRequest();
        request.setContent("공개 상태로 내용만 수정");

        var response = recordService.updateRecord(1L, 10L, request);

        assertEquals("PUBLIC", response.getVisibility());
        assertEquals("PUBLIC", record.getVisibility());
    }

    @Test
    void updateRecord_publicRecord_evictsWeeklyTop3Cache() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Record record = buildRecord(owner, LocalDate.now());
        record.share();
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        RecordUpdateRequest request = new RecordUpdateRequest();
        request.setContent("공개 글 수정");

        recordService.updateRecord(1L, 10L, request);

        verify(weeklyTop3CacheService).evict();
    }

    @Test
    void updateVisibility_publicSetsSharedAt() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Record record = buildRecord(owner, LocalDate.now().minusDays(3));
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        RecordVisibilityRequest request = new RecordVisibilityRequest();
        request.setVisibility("PUBLIC");

        var response = recordService.updateVisibility(1L, 10L, request);

        assertEquals("PUBLIC", response.getVisibility());
        assertEquals("PUBLIC", record.getVisibility());
        assertEquals(true, record.getSharedAt() != null);
        assertEquals(true, response.getSharedAt() != null);
        verify(weeklyTop3CacheService).evict();
        verify(commentPageCacheService).evictRecord(10L);
    }

    @Test
    void updateVisibility_privateClearsSharedAtEvenAfterRecordDate() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Record record = buildRecord(owner, LocalDate.now().minusDays(3));
        record.share();
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        RecordVisibilityRequest request = new RecordVisibilityRequest();
        request.setVisibility("PRIVATE");

        var response = recordService.updateVisibility(1L, 10L, request);

        assertEquals("PRIVATE", response.getVisibility());
        assertEquals("PRIVATE", record.getVisibility());
        assertEquals(null, record.getSharedAt());
        assertEquals(null, response.getSharedAt());
        verify(weeklyTop3CacheService).evict();
        verify(commentPageCacheService).evictRecord(10L);
    }

    @Test
    void shareRecord_evictsCommunityCaches() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Record record = buildRecord(owner, LocalDate.now());
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        var response = recordService.shareRecord(1L, 10L);

        assertEquals("PUBLIC", response.getVisibility());
        verify(weeklyTop3CacheService).evict();
        verify(commentPageCacheService).evictRecord(10L);
    }

    @Test
    void deleteRecord_publicRecord_softDeletesAndEvictsCommunityCaches() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Record record = buildRecord(owner, LocalDate.now().minusDays(2));
        record.share();
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        recordService.deleteRecord(1L, 10L);

        assertEquals(true, record.getIsHidden());
        verify(weeklyTop3CacheService).evict();
        verify(commentPageCacheService).evictRecord(10L);
    }

    private Path buildPath(Long id) {
        Path path = Path.builder()
            .userId(1L)
            .categoryCode("job")
            .directionName("질문")
            .directionText("설명")
            .reviewAt(LocalDateTime.now().plusDays(7))
            .build();
        setId(path, id);
        return path;
    }

    private Path buildExpiredPath(Long id) {
        Path path = Path.builder()
            .userId(1L)
            .categoryCode("job")
            .directionName("질문")
            .directionText("설명")
            .reviewAt(LocalDateTime.now().minusDays(1))
            .build();
        setId(path, id);
        return path;
    }

    private Record buildRecord(User owner, LocalDate recordDate) {
        Path activePath = buildPath(1L);
        Record record = Record.builder()
            .user(owner)
            .path(activePath)
            .categoryCode(activePath.getCategoryCode())
            .recordDate(recordDate)
            .sceneText("기존 내용")
            .oneWordText(null)
            .tomorrowText(null)
            .moodCode(null)
            .build();
        setId(record, 10L);
        return record;
    }

    private void setId(Object target, Long id) {
        try {
            Field field = target.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(target, id);
        } catch (Exception e) {
            throw new IllegalStateException("테스트 데이터 id 설정 실패", e);
        }
    }
}
