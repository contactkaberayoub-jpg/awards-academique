package com.awardsacademique.instructorapplication.service.interfaces;

import com.awardsacademique.authentification.dto.request.UpdateInstructorApplicationRequest;
import com.awardsacademique.authentification.dto.response.InstructorApplicationResponse;
import com.awardsacademique.authentification.entity.InstructorStatusEnum;

import java.util.List;
import java.util.UUID;

public interface InstructorApplicationService {

    InstructorApplicationResponse getMine();

    InstructorApplicationResponse updateMine(UpdateInstructorApplicationRequest request);

    InstructorApplicationResponse resubmit();

    List<InstructorApplicationResponse> listAll(InstructorStatusEnum status);

    InstructorApplicationResponse approve(UUID userId);

    InstructorApplicationResponse reject(UUID userId, String reason);
}