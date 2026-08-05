package kr.co.quietpath.api.auth.service;

import java.util.List;

public record WithdrawalImageCleanupRequestedEvent(List<String> storageKeys) {

    public WithdrawalImageCleanupRequestedEvent {
        storageKeys = List.copyOf(storageKeys);
    }
}
