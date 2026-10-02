package com.awardsacademique.ai.service.interfaces;

import com.awardsacademique.ai.dto.request.TutorChatRequest;
import com.awardsacademique.ai.dto.response.TutorChatResponse;

public interface AiTutorService {

    TutorChatResponse chat(TutorChatRequest request);
}