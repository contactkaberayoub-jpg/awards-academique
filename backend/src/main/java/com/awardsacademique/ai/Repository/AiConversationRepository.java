package com.awardsacademique.ai.Repository;

import com.awardsacademique.ai.entity.AiConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiConversationRepository extends JpaRepository<AiConversation, UUID> {
    List<AiConversation> findByUserIdOrderByUpdatedAtDesc(UUID userId);
}
