package com.awardsacademique.cart.service.interfaces;

import com.awardsacademique.cart.dto.AddCartItemRequest;
import com.awardsacademique.cart.dto.CartResponse;
import com.awardsacademique.cart.dto.CheckoutResponse;

import java.util.UUID;

public interface CartService {
    CartResponse addItem(AddCartItemRequest request);
    CartResponse getMyCart();
    CartResponse removeItem(UUID courseId);
    CartResponse clearCart();
    CheckoutResponse checkout();
}
