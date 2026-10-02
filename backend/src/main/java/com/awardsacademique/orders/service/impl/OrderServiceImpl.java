package com.awardsacademique.orders.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.enrollments.service.interfaces.EnrollmentService;
import com.awardsacademique.orders.Repository.OrderRepository;
import com.awardsacademique.orders.dto.request.CreateOrderRequest;
import com.awardsacademique.orders.dto.request.UpdateOrderRequest;
import com.awardsacademique.orders.dto.response.OrderResponse;
import com.awardsacademique.orders.entity.Order;
import com.awardsacademique.orders.entity.OrderStatusEnum;
import com.awardsacademique.orders.exception.OrderNotFoundException;
import com.awardsacademique.orders.mapper.OrderMapper;
import com.awardsacademique.orders.service.interfaces.OrderService;
import com.awardsacademique.orders.validation.OrderValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.awardsacademique.cart.repository.CartRepository;
import com.awardsacademique.payments.dto.request.MockPaymentRequest;
import com.awardsacademique.payments.entity.PaymentResultEnum;
import com.awardsacademique.payments.exception.PaymentFailedException;
import com.awardsacademique.payments.service.interfaces.MockPaymentService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final OrderValidator orderValidator;
    private final AuthorizationService authorizationService;
    private final EnrollmentService enrollmentService;
    private final CartRepository cartRepository;
    private final MockPaymentService mockPaymentService;

    @Override
    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        User student = authorizationService.requireCurrentUser();
        Course course = orderValidator.resolveCourse(request.getCourseId());

        orderValidator.validatePurchaseable(course);
        orderValidator.ensureNotAlreadyOrdered(student.getId(), course.getId());

        BigDecimal amount = course.getPrice() == null ? BigDecimal.ZERO : course.getPrice();
        OrderStatusEnum status = amount.signum() == 0 ? OrderStatusEnum.paid : OrderStatusEnum.pending;

        Order order = Order.builder()
                .user(student)
                .course(course)
                .totalAmount(amount)
                .currency(course.getCurrency())
                .status(status)
                .build();

        Order saved = orderRepository.save(order);

        // Free orders auto-grant enrollment immediately. Paid orders grant enrollment later, when
        // the admin transitions status from PENDING -> PAID via update().
        if (saved.getStatus() == OrderStatusEnum.paid) {
            grantEnrollment(saved);
        }
        return orderMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getMine() {
        User currentUser = authorizationService.requireCurrentUser();
        return orderRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                .map(orderMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getByCourse(UUID courseId) {
        Course course = orderValidator.resolveCourse(courseId);
        User currentUser = authorizationService.requireCurrentUser();
        orderValidator.validateGetByCourseAccess(course, currentUser);

        return orderRepository.findByCourseIdOrderByCreatedAtDesc(courseId).stream()
                .map(orderMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getAll() {
        authorizationService.requireAdministrator();
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(orderMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public OrderResponse update(UUID id, UpdateOrderRequest request) {
        authorizationService.requireAdministrator();
        Order order = orderValidator.resolveOrder(id);

        orderValidator.validateStatusTransition(order.getStatus(), request.getStatus());
        order.setStatus(request.getStatus());
        Order saved = orderRepository.save(order);

        // PENDING -> PAID transition means the student has paid and now owns the course: grant
        // enrollment so progress tracking works on the course pages.
        if (saved.getStatus() == OrderStatusEnum.paid) {
            grantEnrollment(saved);
        }
        return orderMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        authorizationService.requireAdministrator();
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new OrderNotFoundException(id));
        orderRepository.delete(order);
    }

    private void grantEnrollment(Order order) {
        try {
            // Grant the enrollment to the ORDER OWNER (the student who placed/bought the course).
            // Reuses the admin-free paid-order enrollment path so a student's own free order
            // (and the mock-payment paid path above) succeeds without administrator privileges.
            // The admin's PENDING -> PAID grant still works because the admin is authorized at the
            // order layer; here we only target the order's owner. The price paywall is bypassed
            // intentionally: order status/paidness already covers payment.
            enrollmentService.enrollFromPaidOrder(order.getUser(), order.getCourse());
        } catch (IllegalStateException alreadyEnrolled) {
            log.info("Enrollment already exists for user={} course={} — ignoring double grant",
                    order.getUser().getId(), order.getCourse().getId());
        }
    }

    // Sprint 3: deterministic mock payment. The student who owns the pending order pays it.
    // No amount/price is accepted from the client — the order amount is trusted because it was
    // computed server-side at creation time from Course.price. On success the order becomes PAID
    // and an ACTIVE enrollment is created for the owner + the course. Both writes share this
    // method's transaction, so a failure in either rolls back the other (no orphaned PAID order).
    @Override
    @Transactional
    public OrderResponse pay(UUID orderId, MockPaymentRequest request) {
        User student = authorizationService.requireCurrentUser();
        Order order = orderValidator.resolveOrder(orderId);
        orderValidator.validatePayable(order, student);

        BigDecimal amount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        PaymentResultEnum result = mockPaymentService.processPayment(
                request.getCardNumber(),
                request.getExpiryDate(),
                request.getCvv(),
                amount
        );

        if (result != PaymentResultEnum.SUCCESS) {
            String errorMessage = switch (result) {
                case INVALID_CARD -> "Les informations de la carte sont invalides.";
                case CARD_EXPIRED -> "La carte est expirée.";
                case INSUFFICIENT_FUNDS -> "Fonds insuffisants.";
                default -> "Le paiement a échoué. Veuillez réessayer.";
            };
            throw new PaymentFailedException(result, errorMessage);
        }

        // Grant the enrollment BEFORE flipping the order to PAID
        enrollmentService.enrollFromPaidOrder(student, order.getCourse());

        order.setStatus(OrderStatusEnum.paid);
        Order saved = orderRepository.save(order);

        // Remove purchased course from cart
        cartRepository.findByUserId(student.getId()).ifPresent(cart -> {
            boolean removed = cart.getItems().removeIf(item -> item.getCourse().getId().equals(order.getCourse().getId()));
            if (removed) {
                cart.setUpdatedAt(LocalDateTime.now());
                cartRepository.save(cart);
            }
        });

        return orderMapper.toResponse(saved);
    }
}

