package com.awardsacademique.payouts.Repository;

import com.awardsacademique.payouts.entity.PayoutRequest;
import com.awardsacademique.payouts.entity.PayoutRequestStatusEnum;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayoutRequestRepository extends JpaRepository<PayoutRequest, UUID> {

    @EntityGraph(attributePaths = {"instructor", "reviewedBy"})
    List<PayoutRequest> findAllByOrderByRequestedAtDesc();

    @EntityGraph(attributePaths = {"instructor", "reviewedBy"})
    List<PayoutRequest> findByInstructorIdOrderByRequestedAtDesc(UUID instructorId);

    @EntityGraph(attributePaths = {"instructor", "reviewedBy"})
    List<PayoutRequest> findByStatusOrderByRequestedAtDesc(PayoutRequestStatusEnum status);

    @EntityGraph(attributePaths = {"instructor", "reviewedBy"})
    Optional<PayoutRequest> findById(UUID id);

    /** Pessimistic row lock so concurrent double-clicks on confirm/reject cannot
     *  both transition the same payout request (idempotent, no double-pay). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from PayoutRequest r where r.id = :id")
    Optional<PayoutRequest> findByIdForUpdate(@Param("id") UUID id);

    /** Locks every payout row of an instructor so concurrent payout requests
     *  on the same available balance are serialized and cannot double-spend. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from PayoutRequest r where r.instructor.id = :instructorId")
    List<PayoutRequest> lockAllByInstructor(@Param("instructorId") UUID instructorId);

    /**
     * Aggregations must bind the status as a parameter (never a JPQL enum
     * literal): Hibernate renders literals as {@code 'PAID'::PayoutRequestStatusEnum},
     * but the PostgreSQL type is named {@code payout_request_status_enum}.
     */
    @Query("select coalesce(sum(r.requestedAmount), 0) from PayoutRequest r " +
            "where r.instructor.id = :instructorId and r.currency = :currency " +
            "and r.status = :status")
    BigDecimal sumByInstructorAndCurrency(@Param("instructorId") UUID instructorId,
                                          @Param("currency") String currency,
                                          @Param("status") PayoutRequestStatusEnum status);
}