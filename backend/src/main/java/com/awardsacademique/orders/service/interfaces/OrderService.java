package com.awardsacademique.orders.service.interfaces;

import com.awardsacademique.orders.dto.request.CreateOrderRequest;
import com.awardsacademique.orders.dto.request.UpdateOrderRequest;
import com.awardsacademique.orders.dto.response.OrderResponse;
import com.awardsacademique.payments.dto.request.MockPaymentRequest;

import java.util.List;
import java.util.UUID;

public interface OrderService {

    OrderResponse create(CreateOrderRequest request);

    OrderResponse pay(UUID orderId, MockPaymentRequest request);

    List<OrderResponse> getMine();

    List<OrderResponse> getByCourse(UUID courseId);

    List<OrderResponse> getAll();

    OrderResponse update(UUID id, UpdateOrderRequest request);

    void delete(UUID id);
}
