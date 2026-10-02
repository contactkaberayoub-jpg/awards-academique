package com.awardsacademique.orders;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.cart.repository.CartRepository;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.courses.entity.CurrencyEnum;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.enrollments.service.interfaces.EnrollmentService;
import com.awardsacademique.orders.Repository.OrderRepository;
import com.awardsacademique.orders.dto.request.CreateOrderRequest;
import com.awardsacademique.orders.dto.response.OrderResponse;
import com.awardsacademique.orders.entity.Order;
import com.awardsacademique.orders.entity.OrderStatusEnum;
import com.awardsacademique.orders.mapper.OrderMapper;
import com.awardsacademique.orders.service.impl.OrderServiceImpl;
import com.awardsacademique.orders.validation.OrderValidator;
import com.awardsacademique.payments.service.interfaces.MockPaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Service-level tests for the Sprint 2 paid-course order-creation flow.
 *
 * <p>Reuses the existing order architecture: the real {@link OrderValidator} is exercised
 * through {@link OrderServiceImpl}, so the published/active/duplicate rules and the
 * server-side amount calculation are validated end to end. The repository, mapper,
 * authorization and enrollment services are mocked.
 */
@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private AuthorizationService authorizationService;

    @Mock
    private EnrollmentService enrollmentService;

    @Mock
    private CartRepository cartRepository;

    @Mock
    private MockPaymentService mockPaymentService;

    private OrderServiceImpl service;
    private OrderValidator validator;

    @BeforeEach
    void setUp() {
        validator = new OrderValidator(courseRepository, orderRepository, authorizationService);
        service = new OrderServiceImpl(
                orderRepository, orderMapper, validator, authorizationService, enrollmentService, cartRepository, mockPaymentService);
    }

    private User student() {
        return User.builder().id(UUID.randomUUID()).build();
    }

    private Course course(UUID id, boolean published, boolean active, String price) {
        return Course.builder()
                .id(id)
                .status(CourseStatusEnum.published)
                .published(published)
                .isActive(active)
                .price(new BigDecimal(price))
                .currency(CurrencyEnum.MAD)
                .build();
    }

    private CreateOrderRequest request(UUID courseId) {
        return CreateOrderRequest.builder().courseId(courseId).build();
    }

    private void stubCurrentUser(User student) {
        when(authorizationService.requireCurrentUser()).thenReturn(student);
    }

    private void stubNoExistingOrders(User student) {
        when(orderRepository.findByUserIdOrderByCreatedAtDesc(student.getId()))
                .thenReturn(List.of());
    }

    private void stubMapper(OrderResponse response) {
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toResponse(any(Order.class))).thenReturn(response);
    }

    // A. Published + active + paid course -> PENDING order, amount = DB price, correct student, no enrollment.
    @Test
    void create_paidCourse_createsPendingOrderWithDbPriceAndNoEnrollment() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course paidCourse = course(courseId, true, true, "49.99");
        stubCurrentUser(student);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId)).thenReturn(Optional.of(paidCourse));
        stubNoExistingOrders(student);

        OrderResponse response = OrderResponse.builder()
                .id(UUID.randomUUID())
                .status(OrderStatusEnum.pending)
                .totalAmount(new BigDecimal("49.99"))
                .userId(student.getId())
                .currency(CurrencyEnum.MAD)
                .build();
        stubMapper(response);

        OrderResponse result = service.create(request(courseId));

        assertEquals(OrderStatusEnum.pending, result.getStatus());
        assertEquals(0, new BigDecimal("49.99").compareTo(result.getTotalAmount()));
        assertEquals(student.getId(), result.getUserId());

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(captor.capture());
        Order created = captor.getValue();
        assertEquals(OrderStatusEnum.pending, created.getStatus());
        assertEquals(0, new BigDecimal("49.99").compareTo(created.getTotalAmount()));
        assertEquals(student.getId(), created.getUser().getId());

        // E. A PENDING order must not grant access / create an enrollment.
        verify(enrollmentService, never()).enrollFromPaidOrder(any(User.class), any(Course.class));
        // F. The amount came from the database price, not a client-supplied value
        //    (the request has no amount field to begin with).
        assertEquals(0, paidCourse.getPrice().compareTo(created.getTotalAmount()));
    }

    // B. Free course -> does NOT create a paid checkout (PENDING) order; existing free behavior
    //    (a completed PAID order that auto-grants enrollment) is preserved.
    @Test
    void create_freeCourse_preservesExistingFreeBehavior() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course freeCourse = course(courseId, true, true, "0");
        stubCurrentUser(student);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId)).thenReturn(Optional.of(freeCourse));
        stubNoExistingOrders(student);

        OrderResponse response = OrderResponse.builder()
                .id(UUID.randomUUID())
                .status(OrderStatusEnum.paid)
                .totalAmount(BigDecimal.ZERO)
                .userId(student.getId())
                .currency(CurrencyEnum.MAD)
                .build();
        stubMapper(response);

        OrderResponse result = service.create(request(courseId));

        // Free flow completes immediately as a PAID order (never a pending checkout order).
        assertEquals(OrderStatusEnum.paid, result.getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getTotalAmount()));
        // Existing free behavior: enrollment is auto-granted to the order owner (admin-free path).
        verify(enrollmentService).enrollFromPaidOrder(any(User.class), any(Course.class));
    }

    // C. Unpublished course -> rejected, no order created.
    @Test
    void create_unpublishedCourse_rejected() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course unpublished = course(courseId, false, true, "49.99");
        stubCurrentUser(student);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId)).thenReturn(Optional.of(unpublished));

        assertThrows(IllegalArgumentException.class, () -> service.create(request(courseId)));
        verify(orderRepository, never()).save(any(Order.class));
    }

    // D. Inactive course -> rejected, no order created.
    @Test
    void create_inactiveCourse_rejected() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course inactive = course(courseId, true, false, "49.99");
        stubCurrentUser(student);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId)).thenReturn(Optional.of(inactive));

        assertThrows(IllegalArgumentException.class, () -> service.create(request(courseId)));
        verify(orderRepository, never()).save(any(Order.class));
    }

    // G. Duplicate active order (e.g. an existing PENDING order) is blocked; no second order created.
    @Test
    void create_duplicatePendingOrder_rejected() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course paidCourse = course(courseId, true, true, "49.99");
        stubCurrentUser(student);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId)).thenReturn(Optional.of(paidCourse));
        // The student already has a PENDING order for this course.
        Order existing = Order.builder()
                .id(UUID.randomUUID())
                .course(paidCourse)
                .status(OrderStatusEnum.pending)
                .build();
        when(orderRepository.findByUserIdOrderByCreatedAtDesc(student.getId()))
                .thenReturn(List.of(existing));

        assertThrows(IllegalStateException.class, () -> service.create(request(courseId)));
        verify(orderRepository, never()).save(any(Order.class));
    }
}
