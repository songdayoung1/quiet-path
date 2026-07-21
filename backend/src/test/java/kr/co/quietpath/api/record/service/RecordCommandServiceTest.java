package kr.co.quietpath.api.record.service;

import kr.co.quietpath.api.record.dto.request.RecordCreateRequest;
import kr.co.quietpath.api.record.dto.request.RecordImageAction;
import kr.co.quietpath.api.record.dto.request.RecordUpdateRequest;
import kr.co.quietpath.api.record.dto.response.RecordCreateResponse;
import kr.co.quietpath.api.record.dto.response.RecordUpdateResponse;
import kr.co.quietpath.domain.record.image.StoredRecordImage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecordCommandServiceTest {

    @Mock
    private RecordService recordService;

    @Mock
    private RecordImageService recordImageService;

    @InjectMocks
    private RecordCommandService commandService;

    @Test
    void createRecord_storesImageBeforeDatabaseCommand() {
        RecordCreateRequest request = new RecordCreateRequest();
        MockMultipartFile file = imageFile();
        StoredRecordImage stored = storedImage();
        RecordCreateResponse expected = RecordCreateResponse.builder().id(10L).build();
        when(recordImageService.store(file)).thenReturn(stored);
        when(recordService.createRecord(1L, request, stored)).thenReturn(expected);

        RecordCreateResponse response = commandService.createRecord(1L, request, file);

        assertEquals(10L, response.getId());
        verify(recordImageService, never()).delete(stored.storageKey());
    }

    @Test
    void createRecord_deletesNewFileWhenDatabaseCommandFails() {
        RecordCreateRequest request = new RecordCreateRequest();
        MockMultipartFile file = imageFile();
        StoredRecordImage stored = storedImage();
        when(recordImageService.store(file)).thenReturn(stored);
        when(recordService.createRecord(1L, request, stored)).thenThrow(new IllegalStateException("failed"));

        assertThrows(IllegalStateException.class, () -> commandService.createRecord(1L, request, file));

        verify(recordImageService).delete(stored.storageKey());
    }

    @Test
    void updateRecord_replacesImageAndDeletesPreviousFile() {
        RecordUpdateRequest request = new RecordUpdateRequest();
        request.setImageAction(RecordImageAction.REPLACE);
        MockMultipartFile file = imageFile();
        StoredRecordImage stored = storedImage();
        RecordUpdateResponse expected = RecordUpdateResponse.builder().id(10L).build();
        when(recordImageService.store(file)).thenReturn(stored);
        when(recordService.updateRecord(1L, 10L, request, RecordImageAction.REPLACE, stored))
            .thenReturn(new RecordUpdateExecution(expected, "records/old.webp"));

        RecordUpdateResponse response = commandService.updateRecord(1L, 10L, request, file);

        assertEquals(10L, response.getId());
        InOrder inOrder = inOrder(recordService, recordImageService);
        inOrder.verify(recordService).updateRecord(1L, 10L, request, RecordImageAction.REPLACE, stored);
        inOrder.verify(recordImageService).delete("records/old.webp");
    }

    @Test
    void updateRecord_deletesOnlyNewFileWhenDatabaseCommandFails() {
        RecordUpdateRequest request = new RecordUpdateRequest();
        request.setImageAction(RecordImageAction.REPLACE);
        MockMultipartFile file = imageFile();
        StoredRecordImage stored = storedImage();
        when(recordImageService.store(file)).thenReturn(stored);
        when(recordService.updateRecord(1L, 10L, request, RecordImageAction.REPLACE, stored))
            .thenThrow(new IllegalStateException("failed"));

        assertThrows(IllegalStateException.class, () -> commandService.updateRecord(1L, 10L, request, file));

        verify(recordImageService).delete(stored.storageKey());
        verify(recordImageService, never()).delete("records/old.webp");
    }

    @Test
    void updateRecord_keepsImageWithoutFileOperations() {
        RecordUpdateRequest request = new RecordUpdateRequest();
        request.setImageAction(RecordImageAction.KEEP);
        RecordUpdateResponse expected = RecordUpdateResponse.builder().id(10L).build();
        when(recordService.updateRecord(1L, 10L, request, RecordImageAction.KEEP, null))
            .thenReturn(new RecordUpdateExecution(expected, null));

        RecordUpdateResponse response = commandService.updateRecord(1L, 10L, request, null);

        assertEquals(10L, response.getId());
        verify(recordImageService, never()).store(any());
        verify(recordImageService, never()).delete(anyString());
    }

    @Test
    void updateRecord_removesImageAndDeletesPreviousFileAfterDatabaseCommand() {
        RecordUpdateRequest request = new RecordUpdateRequest();
        request.setImageAction(RecordImageAction.REMOVE);
        RecordUpdateResponse expected = RecordUpdateResponse.builder().id(10L).build();
        when(recordService.updateRecord(1L, 10L, request, RecordImageAction.REMOVE, null))
            .thenReturn(new RecordUpdateExecution(expected, "records/old.webp"));

        RecordUpdateResponse response = commandService.updateRecord(1L, 10L, request, null);

        assertEquals(10L, response.getId());
        verify(recordImageService, never()).store(any());
        verify(recordImageService).delete("records/old.webp");
    }

    private MockMultipartFile imageFile() {
        return new MockMultipartFile("image", "record.png", "image/png", new byte[]{1});
    }

    private StoredRecordImage storedImage() {
        return new StoredRecordImage("records/new.webp", "/uploads/records/new.webp");
    }
}
