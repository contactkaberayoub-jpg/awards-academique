package com.awardsacademique.payments.service.interfaces;

import java.util.List;
import java.util.UUID;

public interface PaymentService {

    List<?> findAll();

    Object getById(UUID id);

    Object initiate(UUID orderId);

    Object handleWebhook(String payload);
}
