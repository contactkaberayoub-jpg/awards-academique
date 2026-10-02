package com.awardsacademique.orders.validation;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import com.awardsacademique.orders.Repository.OrderRepository;
import com.awardsacademique.orders.entity.Order;
import com.awardsacademique.orders.entity.OrderStatusEnum;
import com.awardsacademique.orders.exception.OrderNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.UUID;

/**
 * Encapsulates business validation rules for order operations.
 */
@Component
@RequiredArgsConstructor
public class OrderValidator {

    private static final EnumSet<OrderStatusEnum> TERMINAL_STATUSES =
            EnumSet.of(OrderStatusEnum.cancelled, OrderStatusEnum.refunded);

    private final CourseRepository courseRepository;
    private final OrderRepository orderRepository;
    private final AuthorizationService authorizationService;

    public Course resolveCourse(UUID courseId) {
        return courseRepository.findByIdAndDeletedAtIsNull(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));
    }

    public Order resolveOrder(UUID id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new OrderNotFoundException(id));
    }

    public void validatePurchaseable(Course course) {
        if (course.getStatus() != CourseStatusEnum.published || !course.isPublished()) {
            throw new IllegalArgumentException("You can only purchase published courses");
        }
        if (!course.isActive()) {
            throw new IllegalArgumentException("This course is no longer accepting orders");
        }
    }

    public void validateGetByCourseAccess(Course course, User currentUser) {
        if (!authorizationService.isAdministrator(currentUser)
                && !authorizationService.ownsCourse(course, currentUser)) {
            throw new AccessDeniedException("You can only view orders for your own courses");
        }
    }

    public void ensureNotAlreadyOrdered(UUID userId, UUID courseId) {
        boolean alreadyHasOrder = orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .anyMatch(o -> o.getCourse() != null
                        && o.getCourse().getId().equals(courseId)
                        && o.getStatus() != OrderStatusEnum.cancelled
                        && o.getStatus() != OrderStatusEnum.refunded);
        if (alreadyHasOrder) {
            throw new IllegalStateException("You already have an active order for this course");
        }
    }

    public void validateStatusTransition(OrderStatusEnum current, OrderStatusEnum next) {
        if (current == null || next == null) {
            throw new IllegalArgumentException("Order status is required");
        }
        if (current == next) {
            return;
        }
        if (TERMINAL_STATUSES.contains(current)) {
            throw new IllegalStateException(
                    "Cannot transition from terminal status " + current);
        }
        switch (current) {
            case pending:
                if (next != OrderStatusEnum.paid && next != OrderStatusEnum.cancelled) {
                    throw new IllegalStateException(
                            "Pending orders can only transition to paid or cancelled");
                }
                break;
            case paid:
                if (next != OrderStatusEnum.refunded) {
                    throw new IllegalStateException(
                            "Paid orders can only transition to refunded");
                }
                break;
            default:
                throw new IllegalStateException(
                        "Unexpected order status transition: " + current + " -> " + next);
        }
    }

    /**
     * Validates that the authenticated user may mark {@code order} as paid.
     *
     * <p>Checks (Sprint 3 mock payment):
     * <ul>
     *   <li>ownership — the order must belong to {@code currentUser}</li>
     *   <li>status — only PENDING orders may be paid (PAID/CANCELLED/REFUNDED reject;
     *       paid-again is therefore blocked here)</li>
     *   <li>course validity — the attached course must still be published and active</li>
     * </ul>
     */
    public void validatePayable(Order order, User currentUser) {
        if (order == null || order.getUser() == null || order.getUser().getId() == null) {
            throw new IllegalArgumentException("Order must reference an owner");
        }
        if (!order.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You can only pay your own orders");
        }
        // Course must still be valid for purchase (published + active); price/amount are never
        // accepted from the client.
        validatePurchaseable(order.getCourse());
        if (order.getStatus() != OrderStatusEnum.pending) {
            throw new IllegalStateException("Only pending orders can be paid");
        }
    }
}
