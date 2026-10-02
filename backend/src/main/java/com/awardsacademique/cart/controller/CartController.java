package com.awardsacademique.cart.controller;

import com.awardsacademique.cart.dto.AddCartItemRequest;
import com.awardsacademique.cart.dto.CartResponse;
import com.awardsacademique.cart.dto.CheckoutResponse;
import com.awardsacademique.cart.service.interfaces.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @PostMapping("/items")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<CartResponse> addItem(@Valid @RequestBody AddCartItemRequest request) {
        return ResponseEntity.ok(cartService.addItem(request));
    }

    @PostMapping("/checkout")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<CheckoutResponse> checkout() {
        return ResponseEntity.ok(cartService.checkout());
    }

    @GetMapping
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<CartResponse> getMyCart() {
        return ResponseEntity.ok(cartService.getMyCart());
    }

    @DeleteMapping("/items/{courseId}")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<CartResponse> removeItem(@PathVariable UUID courseId) {
        return ResponseEntity.ok(cartService.removeItem(courseId));
    }

    @DeleteMapping
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<CartResponse> clearCart() {
        return ResponseEntity.ok(cartService.clearCart());
    }
}
