package com.awardsacademique.payments.service.impl;

import com.awardsacademique.payments.service.interfaces.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    @Override
    public List<?> findAll() {
        throw new UnsupportedOperationException("Payment module not yet implemented");
    }

    @Override
    public Object getById(UUID id) {
        throw new UnsupportedOperationException("Payment module not yet implemented");
    }

    @Override
    public Object initiate(UUID orderId) {
        throw new UnsupportedOperationException("Payment module not yet implemented");
    }

    @Override
    public Object handleWebhook(String payload) {
        throw new UnsupportedOperationException("Payment module not yet implemented");
    }
}
