package kr.co.quietpath.api.record.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.record.dto.request.RecordCreateRequest;
import kr.co.quietpath.api.record.dto.request.RecordUpdateRequest;
import kr.co.quietpath.api.record.dto.request.RecordVisibilityRequest;
import kr.co.quietpath.api.record.dto.response.RecordCreateResponse;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.record.entity.Record;
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecordServiceTest {

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PathRepository pathRepository;

    @Mock
    private ReactionRepository reactionRepository;

    @Mock
    private CommentRepository commentRepository;

    @InjectMocks
    private RecordService recordService;

    @Test
    void createRecord_alreadyExists_returns409() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        Path activePath = buildPath(1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(pathRepository.findByUserIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.of(activePath));
        when(recordRepository.existsByPath_IdAndRecordDate(1L, LocalDate.now()))
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
        when(recordRepository.existsByPath_IdAndRecordDate(1L, LocalDate.now()))
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
    void getRecords_returnsDirectionAndVisibilityMetadata() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        setId(user, 1L);
        Record record = buildRecord(user, LocalDate.now());
        record.share();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(recordRepository.findByUser_IdOrderByRecordDateDescIdDesc(1L)).thenReturn(List.of(record));

        var response = recordService.getRecords(1L);

        assertEquals(1, response.getItems().size());
        assertEquals("job", response.getItems().get(0).getCategoryCode());
        assertEquals("질문", response.getItems().get(0).getDirectionName());
        assertEquals("설명", response.getItems().get(0).getDirectionText());
        assertEquals("PUBLIC", response.getItems().get(0).getVisibility());
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

        when(recordRepository.findById(10L)).thenReturn(Optional.of(record));

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

        when(recordRepository.findById(10L)).thenReturn(Optional.of(record));

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
        when(recordRepository.findById(10L)).thenReturn(Optional.of(record));

        RecordUpdateRequest request = new RecordUpdateRequest();
        request.setContent("공개 상태로 내용만 수정");

        var response = recordService.updateRecord(1L, 10L, request);

        assertEquals("PUBLIC", response.getVisibility());
        assertEquals("PUBLIC", record.getVisibility());
    }

    @Test
    void updateVisibility_publicSetsSharedAt() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Record record = buildRecord(owner, LocalDate.now().minusDays(3));
        when(recordRepository.findById(10L)).thenReturn(Optional.of(record));

        RecordVisibilityRequest request = new RecordVisibilityRequest();
        request.setVisibility("PUBLIC");

        var response = recordService.updateVisibility(1L, 10L, request);

        assertEquals("PUBLIC", response.getVisibility());
        assertEquals("PUBLIC", record.getVisibility());
        assertEquals(true, record.getSharedAt() != null);
        assertEquals(true, response.getSharedAt() != null);
    }

    @Test
    void updateVisibility_privateClearsSharedAtEvenAfterRecordDate() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Record record = buildRecord(owner, LocalDate.now().minusDays(3));
        record.share();
        when(recordRepository.findById(10L)).thenReturn(Optional.of(record));

        RecordVisibilityRequest request = new RecordVisibilityRequest();
        request.setVisibility("PRIVATE");

        var response = recordService.updateVisibility(1L, 10L, request);

        assertEquals("PRIVATE", response.getVisibility());
        assertEquals("PRIVATE", record.getVisibility());
        assertEquals(null, record.getSharedAt());
        assertEquals(null, response.getSharedAt());
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
