package com.awardsacademique.payouts.Repository;

import com.awardsacademique.payouts.entity.InstructorPayoutAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface InstructorPayoutAccountRepository extends JpaRepository<InstructorPayoutAccount, UUID> {

    Optional<InstructorPayoutAccount> findByInstructorId(UUID instructorId);

    boolean existsByInstructorId(UUID instructorId);
}