package kr.co.quietpath.api.record.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.record.dto.request.RecordCreateRequest;
import kr.co.quietpath.api.record.dto.request.RecordUpdateRequest;
import kr.co.quietpath.domain.path.entity.Path;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecordServiceTest {

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RecordService recordService;

    @Test
    void createRecord_alreadyExists_returns409() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        Path activePath = buildPath(1L);
        user.setActivePath(activePath);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(recordRepository.existsByUser_IdAndRecordDate(1L, LocalDate.now()))
            .thenReturn(true);

        RecordCreateRequest request = new RecordCreateRequest();
        request.setContent("오늘은 집중이 잘 됐다");
        request.setVisibility("PRIVATE");

        ApiException ex = assertThrows(ApiException.class, () -> recordService.createRecord(1L, request));
        assertEquals(ErrorCode.RECORD_ALREADY_EXISTS, ex.getErrorCode());
    }

    @Test
    void updateRecord_notOwner_returns403() {
        User owner = User.createGoogle("provider", "owner@example.com", "owner");
        setId(owner, 1L);
        Path activePath = buildPath(1L);
        Record record = Record.builder()
            .user(owner)
            .path(activePath)
            .categoryCode("DEFAULT")
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
        request.setVisibility("PRIVATE");

        ApiException ex = assertThrows(ApiException.class, () -> recordService.updateRecord(2L, 10L, request));
        assertEquals(ErrorCode.NOT_OWNER, ex.getErrorCode());
    }

    private Path buildPath(Long id) {
        Path path = Path.builder()
            .userId(1L)
            .categoryCode("DEFAULT")
            .keyQuestion("질문")
            .name("질문")
            .description("설명")
            .anchorAt(LocalDateTime.now().plusDays(7))
            .build();
        setId(path, id);
        return path;
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
