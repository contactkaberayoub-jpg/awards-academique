package com.awardsacademique.orders;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.cart.repository.CartRepository;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.courses.entity.CurrencyEnum;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.dto.response.EnrollmentResponse;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.enrollments.mapper.EnrollmentMapper;
import com.awardsacademique.enrollments.service.impl.EnrollmentServiceImpl;
import com.awardsacademique.enrollments.validation.EnrollmentValidator;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * End-to-end test: a student creates a free order, which should immediately result in
 * a PAID order AND an ACTIVE enrollment granted to the order owner — using the real
 * {@link OrderValidator}, real {@link EnrollmentServiceImpl}, and real {@link EnrollmentValidator}
 * wired through {@link OrderServiceImpl}. Repositories and mappers are mocked.
 */
@ExtendWith(MockitoExtension.class)
class FreeOrderSelfEnrollmentEndToEndTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderMapper orderMapper;
    @Mock private CourseRepository courseRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private EnrollmentMapper enrollmentMapper;
    @Mock private UserRepository userRepository;
    @Mock private CartRepository cartRepository;
    @Mock private MockPaymentService mockPaymentService;

    private OrderServiceImpl orderService;
    private EnrollmentValidator enrollmentValidator;

    @BeforeEach
    void setUp() {
        OrderValidator orderValidator = new OrderValidator(courseRepository, orderRepository, authorizationService);
        enrollmentValidator = new EnrollmentValidator(courseRepository, enrollmentRepository);
        EnrollmentServiceImpl enrollmentService = new EnrollmentServiceImpl(
                enrollmentRepository, enrollmentMapper, courseRepository,
                userRepository, authorizationService, enrollmentValidator);
        orderService = new OrderServiceImpl(
                orderRepository, orderMapper, orderValidator, authorizationService, enrollmentService, cartRepository, mockPaymentService);
    }

    private User student() {
        return User.builder().id(UUID.randomUUID()).build();
    }

    private Course freeCourse(UUID id) {
        return Course.builder()
                .id(id)
                .status(CourseStatusEnum.published)
                .published(true)
                .isActive(true)
                .price(BigDecimal.ZERO)
                .currency(CurrencyEnum.MAD)
                .enrollmentsCount(5)
                .build();
    }

    // A. Student creates a free order → order becomes PAID + enrollment ACTIVE + count incremented
    @Test
    void create_freeOrder_autoGrantsActiveEnrollment() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course course = freeCourse(courseId);

        when(authorizationService.requireCurrentUser()).thenReturn(student);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId)).thenReturn(Optional.of(course));
        when(orderRepository.findByUserIdOrderByCreatedAtDesc(student.getId())).thenReturn(List.of());
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderResponse orderResp = OrderResponse.builder()
                .id(UUID.randomUUID())
                .status(OrderStatusEnum.paid)
                .totalAmount(BigDecimal.ZERO)
                .userId(student.getId())
                .currency(CurrencyEnum.MAD)
                .build();
        when(orderMapper.toResponse(any(Order.class))).thenReturn(orderResp);

        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), courseId)).thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));
        EnrollmentResponse enrollmentResp = EnrollmentResponse.builder()
                .status(EnrollmentStatusEnum.active)
                .build();
        when(enrollmentMapper.toResponse(any(Enrollment.class))).thenReturn(enrollmentResp);
        when(courseRepository.save(any(Course.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderResponse result = orderService.create(CreateOrderRequest.builder().courseId(courseId).build());

        assertEquals(OrderStatusEnum.paid, result.getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getTotalAmount()));

        ArgumentCaptor<Enrollment> captor = ArgumentCaptor.forClass(Enrollment.class);
        verify(enrollmentRepository).save(captor.capture());
        assertEquals(EnrollmentStatusEnum.active, captor.getValue().getStatus());
        assertEquals(student.getId(), captor.getValue().getUser().getId());
        assertEquals(courseId, captor.getValue().getCourse().getId());
        assertEquals(6, course.getEnrollmentsCount());
    }
}
