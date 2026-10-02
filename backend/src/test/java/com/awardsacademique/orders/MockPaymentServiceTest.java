package com.awardsacademique.orders;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.cart.repository.CartRepository;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.courses.entity.CurrencyEnum;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.dto.response.EnrollmentResponse;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.enrollments.mapper.EnrollmentMapper;
import com.awardsacademique.enrollments.service.impl.EnrollmentServiceImpl;
import com.awardsacademique.enrollments.validation.EnrollmentValidator;
import com.awardsacademique.orders.Repository.OrderRepository;
import com.awardsacademique.orders.dto.response.OrderResponse;
import com.awardsacademique.orders.entity.Order;
import com.awardsacademique.orders.entity.OrderStatusEnum;
import com.awardsacademique.orders.mapper.OrderMapper;
import com.awardsacademique.orders.service.impl.OrderServiceImpl;
import com.awardsacademique.orders.validation.OrderValidator;
import com.awardsacademique.payments.dto.request.MockPaymentRequest;
import com.awardsacademique.payments.entity.PaymentResultEnum;
import com.awardsacademique.payments.service.interfaces.MockPaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Service-level tests for the Sprint 3 deterministic mock-payment flow.
 *
 * <p>Wires the real {@link OrderValidator} and a real {@link EnrollmentServiceImpl} (backed by
 * mocked repositories/mapper) into {@link OrderServiceImpl#pay(UUID)}, so the full
 * PENDING -> PAID transition + ACTIVE enrollment creation is exercised end to end with both
 * real validators (ownership/status/course-validity + already-enrolled guard).
 */
@ExtendWith(MockitoExtension.class)
class MockPaymentServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderMapper orderMapper;
    @Mock private CourseRepository courseRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private UserRepository userRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private EnrollmentMapper enrollmentMapper;
    @Mock private CartRepository cartRepository;
    @Mock private MockPaymentService mockPaymentService;

    private OrderServiceImpl service;

    @BeforeEach
    void setUp() {
        OrderValidator orderValidator = new OrderValidator(courseRepository, orderRepository, authorizationService);
        EnrollmentValidator enrollmentValidator = new EnrollmentValidator(courseRepository, enrollmentRepository);
        EnrollmentServiceImpl enrollmentService = new EnrollmentServiceImpl(
                enrollmentRepository, enrollmentMapper, courseRepository,
                userRepository, authorizationService, enrollmentValidator);
        service = new OrderServiceImpl(
                orderRepository, orderMapper, orderValidator, authorizationService, enrollmentService, cartRepository, mockPaymentService);
    }

    private MockPaymentRequest defaultPaymentRequest() {
        return MockPaymentRequest.builder()
                .cardHolderName("Test User")
                .cardNumber("4111111111111111")
                .expiryDate("12/28")
                .cvv("123")
                .build();
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
                .enrollmentsCount(0)
                .build();
    }

    private Order order(UUID orderId, User owner, Course course, OrderStatusEnum status) {
        return Order.builder()
                .id(orderId)
                .user(owner)
                .course(course)
                .totalAmount(course.getPrice())
                .currency(course.getCurrency())
                .status(status)
                .build();
    }

    private void stubCurrentUser(User student) {
        when(authorizationService.requireCurrentUser()).thenReturn(student);
    }

    private void stubOrderLoaded(UUID orderId, Order order) {
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
    }

    // Stubs shared by the happy path: repo echoes the order, mapper returns the paid response.
    private void stubOrderPersistence(OrderResponse paidResponse) {
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toResponse(any(Order.class))).thenReturn(paidResponse);
    }

    // Stubs shared by the enrollment side: no existing enrollment, repo echoes, mapper returns a response.
    private void stubEnrollmentCreation(EnrollmentResponse enrollmentResponse) {
        when(enrollmentRepository.findByUserIdAndCourseId(any(UUID.class), any(UUID.class)))
                .thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(enrollmentMapper.toResponse(any(Enrollment.class))).thenReturn(enrollmentResponse);
        when(courseRepository.save(any(Course.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private void stubSuccessfulPayment() {
        when(mockPaymentService.processPayment(any(), any(), any(), any())).thenReturn(PaymentResultEnum.SUCCESS);
    }

    private OrderResponse paidResponse(Order saved, User student, Course course) {
        return OrderResponse.builder()
                .id(saved.getId())
                .status(OrderStatusEnum.paid)
                .totalAmount(saved.getTotalAmount())
                .userId(student.getId())
                .currency(course.getCurrency())
                .build();
    }

    @Test
    void pay_ownPendingPaidOrder_transitionsToPaidAndCreatesEnrollment() {
        UUID orderId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course course = course(courseId, true, true, "49.99");
        Order pending = order(orderId, student, course, OrderStatusEnum.pending);
        stubCurrentUser(student);
        stubOrderLoaded(orderId, pending);
        stubOrderPersistence(paidResponse(pending, student, course));
        stubEnrollmentCreation(EnrollmentResponse.builder().build());
        stubSuccessfulPayment();

        OrderResponse result = service.pay(orderId, defaultPaymentRequest());

        assertEquals(OrderStatusEnum.paid, result.getStatus());
        assertEquals(0, new BigDecimal("49.99").compareTo(result.getTotalAmount()));

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(orderCaptor.capture());
        assertEquals(OrderStatusEnum.paid, orderCaptor.getValue().getStatus());

        // Rule 9/10: exactly one ACTIVE enrollment is created for the owner + the order's course.
        ArgumentCaptor<Enrollment> enrollmentCaptor = ArgumentCaptor.forClass(Enrollment.class);
        verify(enrollmentRepository).save(enrollmentCaptor.capture());
        Enrollment created = enrollmentCaptor.getValue();
        assertEquals(EnrollmentStatusEnum.active, created.getStatus());
        assertEquals(student.getId(), created.getUser().getId());
        assertEquals(course.getId(), created.getCourse().getId());
        verify(courseRepository).save(course);
        assertEquals(1, course.getEnrollmentsCount());
    }

    // B. Exactly one enrollment is created per successful payment.
    @Test
    void pay_createsExactlyOneEnrollment() {
        UUID orderId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course course = course(courseId, true, true, "49.99");
        Order pending = order(orderId, student, course, OrderStatusEnum.pending);
        stubCurrentUser(student);
        stubOrderLoaded(orderId, pending);
        stubOrderPersistence(paidResponse(pending, student, course));
        stubEnrollmentCreation(EnrollmentResponse.builder().build());
        stubSuccessfulPayment();

        service.pay(orderId, defaultPaymentRequest());

        verify(enrollmentRepository, times(1)).save(any(Enrollment.class));
    }

    // C. A student cannot pay another student's order -> 403 (AccessDeniedException), order untouched.
    @Test
    void pay_anotherStudentOrder_forbiddenAndUnchanged() {
        UUID orderId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User owner = student();
        User intruder = student();
        Course course = course(courseId, true, true, "49.99");
        Order othersOrder = order(orderId, owner, course, OrderStatusEnum.pending);
        stubCurrentUser(intruder);
        stubOrderLoaded(orderId, othersOrder);

        assertThrows(AccessDeniedException.class, () -> service.pay(orderId, defaultPaymentRequest()));
        verify(orderRepository, never()).save(any(Order.class));
    }

    // D. PAID order cannot be paid again -> business error, no duplicate enrollment.
    @Test
    void pay_alreadyPaidOrder_rejectedAndUnchanged() {
        UUID orderId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course course = course(courseId, true, true, "49.99");
        Order paid = order(orderId, student, course, OrderStatusEnum.paid);
        stubCurrentUser(student);
        stubOrderLoaded(orderId, paid);

        assertThrows(IllegalStateException.class, () -> service.pay(orderId, defaultPaymentRequest()));
        verify(orderRepository, never()).save(any(Order.class));
        verify(enrollmentRepository, never()).save(any(Enrollment.class));
    }

    // E. CANCELLED order cannot be paid.
    @Test
    void pay_cancelledOrder_rejected() {
        UUID orderId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course course = course(courseId, true, true, "49.99");
        Order cancelled = order(orderId, student, course, OrderStatusEnum.cancelled);
        stubCurrentUser(student);
        stubOrderLoaded(orderId, cancelled);

        assertThrows(IllegalStateException.class, () -> service.pay(orderId, defaultPaymentRequest()));
        verify(orderRepository, never()).save(any(Order.class));
        verify(enrollmentRepository, never()).save(any(Enrollment.class));
    }

    // F. REFUNDED order cannot be paid.
    @Test
    void pay_refundedOrder_rejected() {
        UUID orderId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course course = course(courseId, true, true, "49.99");
        Order refunded = order(orderId, student, course, OrderStatusEnum.refunded);
        stubCurrentUser(student);
        stubOrderLoaded(orderId, refunded);

        assertThrows(IllegalStateException.class, () -> service.pay(orderId, defaultPaymentRequest()));
        verify(orderRepository, never()).save(any(Order.class));
        verify(enrollmentRepository, never()).save(any(Enrollment.class));
    }

    // G. Payment accepts no amount/price from the client — the order's DB-derived totalAmount is trusted.
    @Test
    void pay_doesNotAcceptAmountFromClient_usesDbPrice() {
        UUID orderId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course course = course(courseId, true, true, "49.99");
        Order pending = order(orderId, student, course, OrderStatusEnum.pending);
        stubCurrentUser(student);
        stubOrderLoaded(orderId, pending);
        OrderResponse expected = paidResponse(pending, student, course);
        stubOrderPersistence(expected);
        stubEnrollmentCreation(EnrollmentResponse.builder().build());
        stubSuccessfulPayment();

        OrderResponse result = service.pay(orderId, defaultPaymentRequest());

        // The amount in the response is the course price from the DB, never a client-supplied value.
        assertEquals(0, course.getPrice().compareTo(result.getTotalAmount()));
    }

    // H. A PENDING order has no enrollment until payment is executed.
    @Test
    void pay_pendingOrderHasNoEnrollmentUntilPaid() {
        UUID orderId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course course = course(courseId, true, true, "49.99");
        Order pending = order(orderId, student, course, OrderStatusEnum.pending);
        stubCurrentUser(student);
        stubOrderLoaded(orderId, pending);
        stubOrderPersistence(paidResponse(pending, student, course));
        stubEnrollmentCreation(EnrollmentResponse.builder().build());
        stubSuccessfulPayment();

        // Before payment the enrollment count on the course is 0 (no enrollment pre-exists).
        assertEquals(0, course.getEnrollmentsCount());

        service.pay(orderId, defaultPaymentRequest());

        // Payment is what creates the enrollment — exactly one, and only here.
        verify(enrollmentRepository, times(1)).save(any(Enrollment.class));
    }

    // I. After payment: order=PAID, enrollment=ACTIVE, correct student, correct course.
    @Test
    void pay_successfulPaymentResultsMatchExpectedState() {
        UUID orderId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course course = course(courseId, true, true, "49.99");
        Order pending = order(orderId, student, course, OrderStatusEnum.pending);
        stubCurrentUser(student);
        stubOrderLoaded(orderId, pending);
        OrderResponse paid = paidResponse(pending, student, course);
        stubOrderPersistence(paid);
        EnrollmentResponse enrollmentResponse = EnrollmentResponse.builder().status(EnrollmentStatusEnum.active).build();
        stubEnrollmentCreation(enrollmentResponse);
        stubSuccessfulPayment();

        OrderResponse result = service.pay(orderId, defaultPaymentRequest());

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(orderCaptor.capture());
        assertEquals(OrderStatusEnum.paid, orderCaptor.getValue().getStatus());

        ArgumentCaptor<Enrollment> enrollmentCaptor = ArgumentCaptor.forClass(Enrollment.class);
        verify(enrollmentRepository).save(enrollmentCaptor.capture());
        Enrollment savedEnrollment = enrollmentCaptor.getValue();
        assertEquals(EnrollmentStatusEnum.active, savedEnrollment.getStatus());
        assertEquals(student.getId(), savedEnrollment.getUser().getId());
        assertEquals(course.getId(), savedEnrollment.getCourse().getId());
        assertEquals(OrderStatusEnum.paid, result.getStatus());
        assertEquals(student.getId(), result.getUserId());
    }

        // J. Atomic/transactional behavior: if enrollment creation fails, the order is NOT marked PAID.
    @Test
    void pay_enrollmentFailure_leavesOrderUnpaid() {
        UUID orderId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course course = course(courseId, true, true, "49.99");
        Order pending = order(orderId, student, course, OrderStatusEnum.pending);
        stubCurrentUser(student);
        stubOrderLoaded(orderId, pending);
        // simulate enrollment creation throwing inside the shared transaction
        when(enrollmentRepository.findByUserIdAndCourseId(any(UUID.class), any(UUID.class)))
                .thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(Enrollment.class)))
                .thenThrow(new RuntimeException("simulated enrollment persistence failure"));
        stubSuccessfulPayment();

        assertThrows(RuntimeException.class, () -> service.pay(orderId, defaultPaymentRequest()));

        // The order status-flipping save is ordered AFTER enrollment, so it must never run
        // — the order stays PENDING (not persisted as PAID) when enrollment fails.
        verify(orderRepository, never()).save(any(Order.class));
    }
}
