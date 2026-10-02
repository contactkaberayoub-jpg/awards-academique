package com.awardsacademique.cart.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.cart.dto.AddCartItemRequest;
import com.awardsacademique.cart.dto.CartItemResponse;
import com.awardsacademique.cart.dto.CartResponse;
import com.awardsacademique.cart.dto.CheckoutItemResponse;
import com.awardsacademique.cart.dto.CheckoutResponse;
import com.awardsacademique.cart.entity.Cart;
import com.awardsacademique.cart.entity.CartItem;
import com.awardsacademique.cart.repository.CartRepository;
import com.awardsacademique.cart.service.interfaces.CartService;
import com.awardsacademique.cart.validation.CartValidator;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.entity.Course;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartValidator cartValidator;
    private final AuthorizationService authorizationService;

    @Override
    @Transactional
    public CartResponse addItem(AddCartItemRequest request) {
        User student = authorizationService.requireCurrentUser();
        Course course = cartValidator.resolveCourse(request.getCourseId());
        cartValidator.validateAddable(course);

        Cart cart = cartRepository.findByUserId(student.getId())
                .orElseGet(() -> {
                    Cart newCart = Cart.builder()
                            .user(student)
                            .items(new ArrayList<>())
                            .build();
                    return cartRepository.save(newCart);
                });

        boolean alreadyExists = cart.getItems().stream()
                .anyMatch(item -> item.getCourse().getId().equals(course.getId()));
        if (alreadyExists) {
            throw new IllegalStateException("Course is already in your cart");
        }

        CartItem item = CartItem.builder()
                .cart(cart)
                .course(course)
                .build();

        cart.getItems().add(item);
        cart.setUpdatedAt(LocalDateTime.now());
        Cart saved = cartRepository.save(cart);

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CartResponse getMyCart() {
        User student = authorizationService.requireCurrentUser();
        Cart cart = cartRepository.findByUserId(student.getId())
                .orElseGet(() -> Cart.builder()
                        .user(student)
                        .items(new ArrayList<>())
                        .build());
        return toResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse removeItem(UUID courseId) {
        User student = authorizationService.requireCurrentUser();
        Cart cart = cartRepository.findByUserId(student.getId())
                .orElseThrow(() -> new IllegalArgumentException("Cart not found"));

        boolean removed = cart.getItems().removeIf(item -> item.getCourse().getId().equals(courseId));
        if (!removed) {
            throw new IllegalArgumentException("Course not found in cart");
        }

        cart.setUpdatedAt(LocalDateTime.now());
        Cart saved = cartRepository.save(cart);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public CartResponse clearCart() {
        User student = authorizationService.requireCurrentUser();
        Cart cart = cartRepository.findByUserId(student.getId())
                .orElseGet(() -> Cart.builder()
                        .user(student)
                        .items(new ArrayList<>())
                        .build());

        cart.getItems().clear();
        cart.setUpdatedAt(LocalDateTime.now());
        Cart saved = cartRepository.save(cart);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CheckoutResponse checkout() {
        User student = authorizationService.requireCurrentUser();
        authorizationService.requireAnyRole(student, "student");

        Cart cart = cartRepository.findByUserId(student.getId())
                .orElseThrow(() -> new IllegalArgumentException("Cart not found"));

        if (cart.getItems().isEmpty()) {
            throw new IllegalArgumentException("Your cart is empty");
        }

        List<CheckoutItemResponse> itemResponses = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (CartItem item : cart.getItems()) {
            Course course = cartValidator.resolveCourse(item.getCourse().getId());
            cartValidator.validateAddable(course);

            BigDecimal price = course.getPrice() != null ? course.getPrice() : BigDecimal.ZERO;
            boolean isFree = price.signum() == 0;

            itemResponses.add(CheckoutItemResponse.builder()
                    .courseId(course.getId())
                    .courseTitle(course.getTitle())
                    .courseThumbnailUrl(course.getThumbnailUrl())
                    .price(price)
                    .currency(course.getCurrency())
                    .free(isFree)
                    .build());

            total = total.add(price);
        }

        return CheckoutResponse.builder()
                .cartId(cart.getId())
                .userId(student.getId())
                .items(itemResponses)
                .totalAmount(total)
                .currency(itemResponses.get(0).getCurrency())
                .itemCount(itemResponses.size())
                .preparedAt(LocalDateTime.now())
                .build();
    }

    private CartResponse toResponse(Cart cart) {
        List<CartItemResponse> itemResponses = cart.getItems().stream()
                .map(item -> {
                    Course c = item.getCourse();
                    return CartItemResponse.builder()
                            .id(item.getId())
                            .courseId(c.getId())
                            .courseTitle(c.getTitle())
                            .courseThumbnailUrl(c.getThumbnailUrl())
                            .price(c.getPrice() != null ? c.getPrice() : BigDecimal.ZERO)
                            .currency(c.getCurrency() != null ? c.getCurrency().name() : "MAD")
                            .createdAt(item.getCreatedAt())
                            .build();
                })
                .collect(Collectors.toList());

        BigDecimal total = itemResponses.stream()
                .map(CartItemResponse::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String currency = itemResponses.isEmpty() ? "MAD" : itemResponses.get(0).getCurrency();

        return CartResponse.builder()
                .id(cart.getId())
                .userId(cart.getUser() != null ? cart.getUser().getId() : null)
                .items(itemResponses)
                .totalAmount(total)
                .currency(currency)
                .updatedAt(cart.getUpdatedAt() != null ? cart.getUpdatedAt() : LocalDateTime.now())
                .build();
    }
}
