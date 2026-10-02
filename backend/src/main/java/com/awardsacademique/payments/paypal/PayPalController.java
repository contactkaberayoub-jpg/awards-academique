package com.awardsacademique.payments.paypal;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.payments.paypal.dto.PayPalCaptureRequest;
import com.awardsacademique.payments.paypal.dto.PayPalCaptureResponse;
import com.awardsacademique.payments.paypal.dto.PayPalCreateOrderRequest;
import com.awardsacademique.payments.paypal.dto.PayPalOrderResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments/paypal")
@RequiredArgsConstructor
public class PayPalController {

    private final PayPalOrderService payPalOrderService;
    private final AuthorizationService authorizationService;

    @PostMapping("/create-order")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<PayPalOrderResponse> createOrder(@Valid @RequestBody PayPalCreateOrderRequest request) {
        User currentUser = authorizationService.requireCurrentUser();
        PayPalOrderResponse response = payPalOrderService.createPayPalOrder(request.getOrderId(), currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/capture/{paypalOrderId}")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<PayPalCaptureResponse> captureOrder(
            @PathVariable String paypalOrderId,
            @Valid @RequestBody PayPalCaptureRequest request) {
        User currentUser = authorizationService.requireCurrentUser();
        PayPalCaptureResponse response = payPalOrderService.capturePayPalOrder(paypalOrderId, request.getInternalOrderId(), currentUser);
        return ResponseEntity.ok(response);
    }
}
