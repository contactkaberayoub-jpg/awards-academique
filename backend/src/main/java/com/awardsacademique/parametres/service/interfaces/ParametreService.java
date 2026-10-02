package com.awardsacademique.parametres.service.interfaces;

import com.awardsacademique.parametres.dto.response.ParametreResponse;

import java.math.BigDecimal;
import java.util.List;

/**
 * Central source for application parameters. Revenue percentages are read from
 * the {@code parametres} table (never hard-coded in the application) and
 * validated before they are used for any money calculation.
 */
public interface ParametreService {

    /** Validated platform/instructor revenue split. */
    record RevenueSplit(BigDecimal platformPercentage, BigDecimal instructorPercentage) {
    }

    BigDecimal getPlatformPercentage();

    BigDecimal getInstructorPercentage();

    /**
     * The validated revenue split. Fails safely (clearly-worded backend error)
     * when the configuration is missing, non-numeric, negative, or does not
     * total exactly 100.
     */
    RevenueSplit getRevenueSplit();

    /** Raw stored value of a parameter, or {@code null} when the key does not exist. */
    String getValue(String key);

    List<ParametreResponse> getAll();

    ParametreResponse getByKey(String key);

    /**
     * Updates the value (and optionally the description) of an existing
     * parameter. When a revenue percentage key is updated, the full split is
     * re-validated: both percentages must be &gt;= 0 and sum to exactly 100.
     * <p>
     * Prefer {@link #updateRevenueSplit(BigDecimal, BigDecimal)} for the revenue
     * split: the pair is persisted atomically, whereas this single-key
     * convenience method is inherently two-step.
     */
    ParametreResponse updateValue(String key, String value, String description);

    /**
     * Atomically persists both halves of the revenue split in a single database
     * statement. Validates that the pair is non-negative and totals exactly
     * 100 before writing, and fails with a 404 when either parameter row does
     * not exist. Returns the persisted parameters (platform first, by id).
     */
    List<ParametreResponse> updateRevenueSplit(BigDecimal platformPercentage, BigDecimal instructorPercentage);
}