package com.awardsacademique.authentification.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * In-memory token blacklist used to honor explicit /logout before the natural JWT expiry.
 * The key is the JWT id claim ("jti"); the value is the expiration date so the background
 * cleaner can drop entries that are already expired.
 *
 * Note: this implementation is single-instance only. For a clustered deployment replace the
 * map with Redis (SETNX + TTL) or a shared RDBMS blacklist table.
 */
@Slf4j
@Service
public class TokenBlacklistService {

    private final ConcurrentMap<String, Date> blacklisted = new ConcurrentHashMap<>();

    public void blacklist(String jti, Date expiresAt) {
        if (jti == null || expiresAt == null) {
            return;
        }
        blacklisted.put(jti, expiresAt);
    }

    public boolean isBlacklisted(String jti) {
        if (jti == null) {
            return false;
        }
        Date expiry = blacklisted.get(jti);
        if (expiry == null) {
            return false;
        }
        if (expiry.before(new Date())) {
            blacklisted.remove(jti);
            return false;
        }
        return true;
    }

    @Scheduled(fixedRate = 300_000)
    public void cleanupExpired() {
        Date now = new Date();
        int before = blacklisted.size();
        blacklisted.entrySet().removeIf(entry -> entry.getValue().before(now));
        int removed = before - blacklisted.size();
        if (removed > 0) {
            log.debug("TokenBlacklist cleaned {} expired entries (remaining {})", removed, blacklisted.size());
        }
    }
}
