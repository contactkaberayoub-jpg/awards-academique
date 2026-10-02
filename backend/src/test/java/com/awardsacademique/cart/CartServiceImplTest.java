package com.awardsacademique.cart;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.cart.dto.AddCartItemRequest;
import com.awardsacademique.cart.dto.CartResponse;
import com.awardsacademique.cart.dto.CheckoutResponse;
import com.awardsacademique.cart.entity.Cart;
import com.awardsacademique.cart.entity.CartItem;
import com.awardsacademique.cart.repository.CartRepository;
import com.awardsacademique.cart.service.impl.CartServiceImpl;
import com.awardsacademique.cart.validation.CartValidator;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.courses.entity.CurrencyEnum;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CartServiceImplTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartValidator cartValidator;

    @Mock
    private AuthorizationService authorizationService;

    private CartServiceImpl cartService;

    @BeforeEach
    void setUp() {
        cartService = new CartServiceImpl(cartRepository, cartValidator, authorizationService);
    }

    private User student(UUID id) {
        return User.builder().id(id).email("student@test.com").build();
    }

    private Course publishedActiveCourse(UUID id, BigDecimal price) {
        return Course.builder()
                .id(id)
                .title("Test Course")
                .status(CourseStatusEnum.published)
                .published(true)
                .isActive(true)
                .price(price)
                .currency(CurrencyEnum.MAD)
                .build();
    }

    // A & B. Student can add a course, item contains real Course price from DB
    @Test
    void addItem_success_withRealCoursePrice() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User user = student(studentId);
        Course course = publishedActiveCourse(courseId, new BigDecimal("199.99"));

        when(authorizationService.requireCurrentUser()).thenReturn(user);
        when(cartValidator.resolveCourse(courseId)).thenReturn(course);
        doNothing().when(cartValidator).validateAddable(course);

        when(cartRepository.findByUserId(studentId)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));

        CartResponse response = cartService.addItem(AddCartItemRequest.builder().courseId(courseId).build());

        assertNotNull(response);
        assertEquals(1, response.getItems().size());
        assertEquals(courseId, response.getItems().get(0).getCourseId());
        assertEquals(0, new BigDecimal("199.99").compareTo(response.getItems().get(0).getPrice()));
        assertEquals(0, new BigDecimal("199.99").compareTo(response.getTotalAmount()));
    }

    // C. Duplicate course cannot be added twice
    @Test
    void addItem_duplicateCourse_throwsIllegalState() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User user = student(studentId);
        Course course = publishedActiveCourse(courseId, new BigDecimal("99.00"));

        Cart existingCart = Cart.builder()
                .id(UUID.randomUUID())
                .user(user)
                .items(new ArrayList<>())
                .build();
        existingCart.getItems().add(CartItem.builder().id(UUID.randomUUID()).cart(existingCart).course(course).build());

        when(authorizationService.requireCurrentUser()).thenReturn(user);
        when(cartValidator.resolveCourse(courseId)).thenReturn(course);
        doNothing().when(cartValidator).validateAddable(course);
        when(cartRepository.findByUserId(studentId)).thenReturn(Optional.of(existingCart));

        assertThrows(IllegalStateException.class, () ->
                cartService.addItem(AddCartItemRequest.builder().courseId(courseId).build())
        );
        verify(cartRepository, never()).save(any(Cart.class));
    }

    // D. Student can retrieve their cart
    @Test
    void getMyCart_success() {
        UUID studentId = UUID.randomUUID();
        User user = student(studentId);
        Cart cart = Cart.builder().id(UUID.randomUUID()).user(user).items(new ArrayList<>()).build();

        when(authorizationService.requireCurrentUser()).thenReturn(user);
        when(cartRepository.findByUserId(studentId)).thenReturn(Optional.of(cart));

        CartResponse response = cartService.getMyCart();
        assertNotNull(response);
        assertEquals(cart.getId(), response.getId());
        assertEquals(studentId, response.getUserId());
    }

    // E. Student A cannot access Student B's cart (isolated per authenticated user)
    @Test
    void cartsAreIsolatedPerUser() {
        UUID studentAId = UUID.randomUUID();
        UUID studentBId = UUID.randomUUID();
        User studentA = student(studentAId);
        User studentB = student(studentBId);

        Cart cartA = Cart.builder().id(UUID.randomUUID()).user(studentA).items(new ArrayList<>()).build();
        Cart cartB = Cart.builder().id(UUID.randomUUID()).user(studentB).items(new ArrayList<>()).build();

        // When student A calls getMyCart, repository queried with studentAId
        when(authorizationService.requireCurrentUser()).thenReturn(studentA);
        when(cartRepository.findByUserId(studentAId)).thenReturn(Optional.of(cartA));

        CartResponse responseA = cartService.getMyCart();
        assertEquals(studentAId, responseA.getUserId());
        verify(cartRepository, times(1)).findByUserId(studentAId);
        verify(cartRepository, never()).findByUserId(studentBId);
    }

    // F. Student can remove an item
    @Test
    void removeItem_success() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User user = student(studentId);
        Course course = publishedActiveCourse(courseId, new BigDecimal("50.00"));

        Cart cart = Cart.builder().id(UUID.randomUUID()).user(user).items(new ArrayList<>()).build();
        cart.getItems().add(CartItem.builder().id(UUID.randomUUID()).cart(cart).course(course).build());

        when(authorizationService.requireCurrentUser()).thenReturn(user);
        when(cartRepository.findByUserId(studentId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));

        CartResponse response = cartService.removeItem(courseId);
        assertNotNull(response);
        assertTrue(response.getItems().isEmpty());
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getTotalAmount()));
    }

    // G. Student can clear their cart
    @Test
    void clearCart_success() {
        UUID studentId = UUID.randomUUID();
        User user = student(studentId);
        Course course1 = publishedActiveCourse(UUID.randomUUID(), new BigDecimal("10.00"));
        Course course2 = publishedActiveCourse(UUID.randomUUID(), new BigDecimal("20.00"));

        Cart cart = Cart.builder().id(UUID.randomUUID()).user(user).items(new ArrayList<>()).build();
        cart.getItems().add(CartItem.builder().id(UUID.randomUUID()).cart(cart).course(course1).build());
        cart.getItems().add(CartItem.builder().id(UUID.randomUUID()).cart(cart).course(course2).build());

        when(authorizationService.requireCurrentUser()).thenReturn(user);
        when(cartRepository.findByUserId(studentId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));

        CartResponse response = cartService.clearCart();
        assertNotNull(response);
        assertTrue(response.getItems().isEmpty());
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getTotalAmount()));
    }

    // H. Non-existing course is rejected
    @Test
    void addItem_nonExistingCourse_rejected() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User user = student(studentId);

        when(authorizationService.requireCurrentUser()).thenReturn(user);
        when(cartValidator.resolveCourse(courseId)).thenThrow(new CourseNotFoundException(courseId));

        assertThrows(CourseNotFoundException.class, () ->
                cartService.addItem(AddCartItemRequest.builder().courseId(courseId).build())
        );
    }

    // I & J. Unpublished / inactive course is rejected
    @Test
    void addItem_unpublishedCourse_rejected() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User user = student(studentId);
        Course course = publishedActiveCourse(courseId, new BigDecimal("100.00"));

        when(authorizationService.requireCurrentUser()).thenReturn(user);
        when(cartValidator.resolveCourse(courseId)).thenReturn(course);
        doThrow(new IllegalArgumentException("You can only add published courses to your cart"))
                .when(cartValidator).validateAddable(course);

        assertThrows(IllegalArgumentException.class, () ->
                cartService.addItem(AddCartItemRequest.builder().courseId(courseId).build())
        );
    }

    // Sprint 8.3.1 Checkout Preparation Tests
    @Test
    void checkout_success_withDbPrices() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User user = student(studentId);
        Course course = publishedActiveCourse(courseId, new BigDecimal("149.99"));

        Cart cart = Cart.builder().id(UUID.randomUUID()).user(user).items(new ArrayList<>()).build();
        cart.getItems().add(CartItem.builder().id(UUID.randomUUID()).cart(cart).course(course).build());

        when(authorizationService.requireCurrentUser()).thenReturn(user);
        doNothing().when(authorizationService).requireAnyRole(user, "student");
        when(cartRepository.findByUserId(studentId)).thenReturn(Optional.of(cart));
        when(cartValidator.resolveCourse(courseId)).thenReturn(course);
        doNothing().when(cartValidator).validateAddable(course);

        CheckoutResponse response = cartService.checkout();

        assertNotNull(response);
        assertEquals(studentId, response.getUserId());
        assertEquals(1, response.getItemCount());
        assertEquals(0, new BigDecimal("149.99").compareTo(response.getTotalAmount()));
        assertEquals(courseId, response.getItems().get(0).getCourseId());
        assertEquals(0, new BigDecimal("149.99").compareTo(response.getItems().get(0).getPrice()));
    }

    @Test
    void checkout_emptyCart_rejected() {
        UUID studentId = UUID.randomUUID();
        User user = student(studentId);

        Cart cart = Cart.builder().id(UUID.randomUUID()).user(user).items(new ArrayList<>()).build();

        when(authorizationService.requireCurrentUser()).thenReturn(user);
        doNothing().when(authorizationService).requireAnyRole(user, "student");
        when(cartRepository.findByUserId(studentId)).thenReturn(Optional.of(cart));

        assertThrows(IllegalArgumentException.class, () -> cartService.checkout());
    }

    @Test
    void checkout_inactiveCourse_rejected() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        User user = student(studentId);
        Course course = publishedActiveCourse(courseId, new BigDecimal("99.00"));

        Cart cart = Cart.builder().id(UUID.randomUUID()).user(user).items(new ArrayList<>()).build();
        cart.getItems().add(CartItem.builder().id(UUID.randomUUID()).cart(cart).course(course).build());

        when(authorizationService.requireCurrentUser()).thenReturn(user);
        doNothing().when(authorizationService).requireAnyRole(user, "student");
        when(cartRepository.findByUserId(studentId)).thenReturn(Optional.of(cart));
        when(cartValidator.resolveCourse(courseId)).thenReturn(course);
        doThrow(new IllegalArgumentException("This course is no longer active"))
                .when(cartValidator).validateAddable(course);

        assertThrows(IllegalArgumentException.class, () -> cartService.checkout());
    }

    @Test
    void checkout_nonStudent_rejected() {
        UUID instructorId = UUID.randomUUID();
        User instructor = User.builder().id(instructorId).email("instructor@test.com").build();

        when(authorizationService.requireCurrentUser()).thenReturn(instructor);
        doThrow(new AccessDeniedException("You do not have permission to perform this action"))
                .when(authorizationService).requireAnyRole(instructor, "student");

        assertThrows(AccessDeniedException.class, () -> cartService.checkout());
    }
}
