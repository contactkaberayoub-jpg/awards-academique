package com.awardsacademique.payments.paypal;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.cart.entity.Cart;
import com.awardsacademique.cart.entity.CartItem;
import com.awardsacademique.cart.repository.CartRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CurrencyEnum;
import com.awardsacademique.enrollments.service.interfaces.EnrollmentService;
import com.awardsacademique.orders.Repository.OrderRepository;
import com.awardsacademique.orders.entity.Order;
import com.awardsacademique.orders.entity.OrderStatusEnum;
import com.awardsacademique.orders.exception.OrderNotFoundException;
import com.awardsacademique.orders.validation.OrderValidator;
import com.awardsacademique.payments.paypal.dto.PayPalCaptureResponse;
import com.awardsacademique.payments.paypal.dto.PayPalOrderResponse;
import com.awardsacademique.payments.paypal.exception.PayPalApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Service-level tests for the PayPal sandbox integration.
 *
 * <p>The order/enrollment/cart architecture is preserved: {@link OrderValidator},
 * {@link EnrollmentService}, {@link OrderRepository} and {@link CartRepository} are exercised
 * via mocks, while the PayPal HTTP layer ({@link HttpClient}) is stubbed so no real network calls
 * are made and no real credentials are ever sent.
 *
 * <p>Note on strict stubbing: HTTP responses are pre-built <em>before</em> registering the
 * {@code when(httpClient.send(...)).thenReturn(...)} stub. Building an {@link HttpResponse} mock
 * inside the {@code thenReturn(...)} argument performs nested stubbing on a second mock while the
 * {@code httpClient} stub is still incomplete, which Mockito rejects with
 * {@code UnfinishedStubbingException}. This class therefore keeps each test's stubs independent and
 * fully exercised so strictness (the MockitoExtension default) is preserved.
 */
@ExtendWith(MockitoExtension.class)
class PayPalOrderServiceTest {

    @Mock
    private OrderValidator orderValidator;

    @Mock
    private EnrollmentService enrollmentService;

    @Mock
    private CartRepository cartRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PayPalAuthService authService;

    @Mock
    private HttpClient httpClient;

    private ObjectMapper objectMapper = new ObjectMapper();

    private PayPalOrderService service;

    @BeforeEach
    void setUp() {
        PayPalProperties properties = new PayPalProperties();
        properties.setMadToUsdRate(new BigDecimal("0.1")); // 1 MAD = $0.10
        service = new PayPalOrderService(
                properties, authService, orderValidator, enrollmentService,
                cartRepository, orderRepository, httpClient, objectMapper);
    }

    private User student() {
        return User.builder().id(UUID.randomUUID()).build();
    }

    private Course course(String price, CurrencyEnum currency) {
        return Course.builder()
                .id(UUID.randomUUID())
                .price(new BigDecimal(price))
                .currency(currency)
                .build();
    }

    private Order pendingOrder(UUID id, User owner, Course course) {
        return Order.builder()
                .id(id)
                .user(owner)
                .course(course)
                .status(OrderStatusEnum.pending)
                .totalAmount(course.getPrice())
                .currency(course.getCurrency())
                .build();
    }

    @SuppressWarnings("unchecked")
    private HttpResponse<String> response(String body, int status) {
        HttpResponse<String> r = mock(HttpResponse.class);
        when(r.statusCode()).thenReturn(status);
        when(r.body()).thenReturn(body);
        return r;
    }

    private void stubPayable(Order order, User owner) {
        when(orderValidator.resolveOrder(order.getId())).thenReturn(order);
        doNothing().when(orderValidator).validatePayable(order, owner);
    }

    // =============================== A. CREATE ORDER ===============================

    @Test
    void createOrder_madOrder_isConvertedToUsdServerSide() throws Exception {
        User owner = student();
        Course c = course("49.99", CurrencyEnum.MAD);
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, c);

        // Pre-build the response BEFORE the httpClient stub to avoid nested stubbing.
        HttpResponse<String> ok = response("{\"id\":\"PAY-123\",\"status\":\"CREATED\"}", 200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(ok);

        PayPalOrderResponse result = service.createPayPalOrder(orderId, owner);

        assertEquals("PAY-123", result.getPaypalOrderId());
        // A 49.99 MAD order is re-denominated at 0.1 -> 4.999 rounds to 5.00 USD.
        assertEquals("USD", result.getCurrency());
        assertEquals(0, new BigDecimal("5.00").compareTo(result.getAmount()));
        assertEquals(orderId, result.getInternalOrderId());
    }

    @Test
    void createOrder_mad250_convertsToExact25Usd() throws Exception {
        User owner = student();
        Course c = course("250.00", CurrencyEnum.MAD);
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, c);

        HttpResponse<String> ok = response("{\"id\":\"PAY-250\",\"status\":\"CREATED\"}", 200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(ok);

        PayPalOrderResponse result = service.createPayPalOrder(orderId, owner);

        assertEquals("PAY-250", result.getPaypalOrderId());
        assertEquals("USD", result.getCurrency());
        assertEquals(0, new BigDecimal("25.00").compareTo(result.getAmount()));
    }

    @Test
    void createOrder_madOrder_withoutConfiguredRate_failsLoudlyBeforeNetwork() throws Exception {
        PayPalProperties noRate = new PayPalProperties();
        noRate.setMadToUsdRate(null);
        service = new PayPalOrderService(
                noRate, authService, orderValidator, enrollmentService,
                cartRepository, orderRepository, httpClient, objectMapper);

        User owner = student();
        Order order = pendingOrder(UUID.randomUUID(), owner, course("50.00", CurrencyEnum.MAD));
        stubPayable(order, owner);

        PayPalApiException ex = assertThrows(PayPalApiException.class,
                () -> service.createPayPalOrder(order.getId(), owner));
        assertTrue(ex.getMessage().contains("PAYPAL_MAD_TO_USD_RATE"));
        verify(httpClient, never()).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void createOrder_nonPositiveAmount_neverReachesPayPal() throws Exception {
        User owner = student();
        Course free = course("0", CurrencyEnum.MAD);
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, free);

        stubPayable(order, owner);

        PayPalApiException ex = assertThrows(PayPalApiException.class,
                () -> service.createPayPalOrder(orderId, owner));
        assertTrue(ex.getMessage().contains("positif"));
        verify(httpClient, never()).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void createOrder_euroCourse_passesAmountAndEURThrough() throws Exception {
        User owner = student();
        Course c = course("79.00", CurrencyEnum.EUR);
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, c);

        HttpResponse<String> ok = response("{\"id\":\"PAY-EUR\",\"status\":\"CREATED\"}", 200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(ok);

        PayPalOrderResponse result = service.createPayPalOrder(orderId, owner);

        assertEquals("PAY-EUR", result.getPaypalOrderId());
        assertEquals("EUR", result.getCurrency());
        assertEquals(0, new BigDecimal("79.00").compareTo(result.getAmount()));
    }

    @Test
    void createOrder_orderNotFound_throws() {
        User owner = student();
        UUID missingId = UUID.randomUUID();
        when(orderValidator.resolveOrder(missingId))
                .thenThrow(new OrderNotFoundException(missingId));

        assertThrows(OrderNotFoundException.class,
                () -> service.createPayPalOrder(missingId, owner));
    }

    @Test
    void createOrder_notOwned_validatePayableRejects() {
        User owner = student();
        User attacker = student();
        Course c = course("10", CurrencyEnum.MAD);
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, c);

        when(orderValidator.resolveOrder(orderId)).thenReturn(order);
        doThrow(new AccessDeniedException("denied")).when(orderValidator).validatePayable(order, attacker);

        assertThrows(AccessDeniedException.class,
                () -> service.createPayPalOrder(orderId, attacker));
    }

    @Test
    void createOrder_invalidState_validatePayableRejects() {
        User owner = student();
        Course c = course("10", CurrencyEnum.MAD);
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, c);

        when(orderValidator.resolveOrder(orderId)).thenReturn(order);
        doThrow(new IllegalStateException("Only pending orders can be paid"))
                .when(orderValidator).validatePayable(order, owner);

        assertThrows(IllegalStateException.class,
                () -> service.createPayPalOrder(orderId, owner));
    }

    @Test
    void createOrder_paypalApiError_throwsPayPalApiException() throws Exception {
        User owner = student();
        Order order = pendingOrder(UUID.randomUUID(), owner, course("10", CurrencyEnum.MAD));

        HttpResponse<String> bad = response("{\"error\":\"unauthorized_client\"}", 401);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(bad);

        assertThrows(PayPalApiException.class,
                () -> service.createPayPalOrder(order.getId(), owner));
    }

    @Test
    void createOrder_transactionLimitExceeded_messageCarriesActionablePayPalIssue() throws Exception {
        User owner = student();
        Order order = pendingOrder(UUID.randomUUID(), owner, course("10", CurrencyEnum.MAD));

        HttpResponse<String> bad = response(
                "{\"name\":\"UNPROCESSABLE_ENTITY\","
                        + "\"details\":[{\"issue\":\"TRANSACTION_LIMIT_EXCEEDED\","
                        + "\"description\":\"Total payment amount exceeded transaction limit.\"}],"
                        + "\"message\":\"The requested action could not be performed.\"}",
                422);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(bad);

        PayPalApiException ex = assertThrows(PayPalApiException.class,
                () -> service.createPayPalOrder(order.getId(), owner));

        // The surface message must expose PayPal's real, actionable reason (limit exceeded)
        // rather than an opaque "HTTP 422", so the frontend can render a useful French message.
        assertTrue(ex.getMessage().contains("HTTP 422"), ex.getMessage());
        assertTrue(ex.getMessage().contains("TRANSACTION_LIMIT_EXCEEDED"), ex.getMessage());
    }

    @Test
    void createOrder_missingOrderIdInResponse_throws() throws Exception {
        User owner = student();
        Order order = pendingOrder(UUID.randomUUID(), owner, course("10", CurrencyEnum.MAD));

        HttpResponse<String> noId = response("{\"status\":\"CREATED\"}", 200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(noId);

        assertThrows(PayPalApiException.class,
                () -> service.createPayPalOrder(order.getId(), owner));
    }

    // =============================== B. CAPTURE ===============================

    @Test
    void capture_completed_correlationMatches_enrollsOnceAndPersists() throws Exception {
        User owner = student();
        Course c = course("25.00", CurrencyEnum.MAD);
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, c);

        Cart cart = new Cart();
        cart.setItems(new ArrayList<>());
        CartItem item = new CartItem();
        item.setCourse(c);
        cart.getItems().add(item);

        HttpResponse<String> getOrder =
                response("{\"purchase_units\":[{\"custom_id\":\"" + orderId + "\"}]}", 200);
        HttpResponse<String> capture = response(
                "{\"status\":\"COMPLETED\",\"purchase_units\":[{\"payments\":{\"captures\":[{\"id\":\"CAP-1\",\"amount\":{\"value\":\"2.50\",\"currency_code\":\"USD\"}}]}}]}",
                200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(getOrder, capture);
        when(cartRepository.findByUserId(owner.getId())).thenReturn(Optional.of(cart));

        PayPalCaptureResponse result = service.capturePayPalOrder("PAY-1", orderId, owner);

        assertEquals("COMPLETED", result.getStatus());
        assertEquals("CAP-1", result.getCaptureId());
        // 25.00 MAD * 0.1 = 2.50 USD (the converted amount is what capture must match).
        assertEquals(0, new BigDecimal("2.50").compareTo(result.getCapturedAmount()));
        assertEquals("USD", result.getCurrency());

        verify(enrollmentService).enrollFromPaidOrder(owner, c);
        verify(enrollmentService, times(1)).enrollFromPaidOrder(any(User.class), any(Course.class));
        // Persistence: order marked PAID and saved (not a no-op).
        assertEquals(OrderStatusEnum.paid, order.getStatus());
        verify(orderRepository).save(order);
        // Cart cleanup ran.
        assertTrue(cart.getItems().isEmpty());
    }

    @Test
    void capture_correlationMismatch_rejectedBeforeEnrollment() throws Exception {
        User owner = student();
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, course("10", CurrencyEnum.MAD));

        HttpResponse<String> mismatched =
                response("{\"purchase_units\":[{\"custom_id\":\"SOME_OTHER_ORDER\"}]}", 200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mismatched);

        assertThrows(IllegalArgumentException.class,
                () -> service.capturePayPalOrder("PAY-1", orderId, owner));
        verify(enrollmentService, never()).enrollFromPaidOrder(any(User.class), any(Course.class));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void capture_amountMismatch_rejected() throws Exception {
        User owner = student();
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, course("25.00", CurrencyEnum.MAD));

        HttpResponse<String> getOrder =
                response("{\"purchase_units\":[{\"custom_id\":\"" + orderId + "\"}]}", 200);
        HttpResponse<String> capture = response(
                "{\"status\":\"COMPLETED\",\"purchase_units\":[{\"payments\":{\"captures\":[{\"id\":\"CAP-1\",\"amount\":{\"value\":\"10.00\",\"currency_code\":\"USD\"}}]}}]}",
                200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(getOrder, capture);

        assertThrows(IllegalArgumentException.class,
                () -> service.capturePayPalOrder("PAY-1", orderId, owner));
        verify(enrollmentService, never()).enrollFromPaidOrder(any(User.class), any(Course.class));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void capture_convertedAmountMismatch_rejected() throws Exception {
        // 250.00 MAD must be captured as exactly 25.00 USD; 24.99 USD is rejected.
        User owner = student();
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, course("250.00", CurrencyEnum.MAD));

        HttpResponse<String> getOrder =
                response("{\"purchase_units\":[{\"custom_id\":\"" + orderId + "\"}]}", 200);
        HttpResponse<String> capture = response(
                "{\"status\":\"COMPLETED\",\"purchase_units\":[{\"payments\":{\"captures\":[{\"id\":\"CAP-1\",\"amount\":{\"value\":\"24.99\",\"currency_code\":\"USD\"}}]}}]}",
                200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(getOrder, capture);

        assertThrows(IllegalArgumentException.class,
                () -> service.capturePayPalOrder("PAY-1", orderId, owner));
        verify(enrollmentService, never()).enrollFromPaidOrder(any(User.class), any(Course.class));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void capture_currencyMismatch_rejected() throws Exception {
        User owner = student();
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, course("25.00", CurrencyEnum.MAD));

        HttpResponse<String> getOrder =
                response("{\"purchase_units\":[{\"custom_id\":\"" + orderId + "\"}]}", 200);
        HttpResponse<String> capture = response(
                "{\"status\":\"COMPLETED\",\"purchase_units\":[{\"payments\":{\"captures\":[{\"id\":\"CAP-1\",\"amount\":{\"value\":\"25.00\",\"currency_code\":\"EUR\"}}]}}]}",
                200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(getOrder, capture);

        assertThrows(IllegalArgumentException.class,
                () -> service.capturePayPalOrder("PAY-1", orderId, owner));
        verify(enrollmentService, never()).enrollFromPaidOrder(any(User.class), any(Course.class));
    }

    @Test
    void capture_paypalCaptureError_throws() throws Exception {
        User owner = student();
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, course("10", CurrencyEnum.MAD));

        HttpResponse<String> getOrder =
                response("{\"purchase_units\":[{\"custom_id\":\"" + orderId + "\"}]}", 200);
        HttpResponse<String> bad = response("{\"error\":\"PAYMENT_NOT_APPROVED\"}", 422);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(getOrder, bad);

        assertThrows(PayPalApiException.class,
                () -> service.capturePayPalOrder("PAY-1", orderId, owner));
        verify(enrollmentService, never()).enrollFromPaidOrder(any(User.class), any(Course.class));
    }

    @Test
    void capture_statusNotCompleted_throws() throws Exception {
        User owner = student();
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, course("10", CurrencyEnum.MAD));

        HttpResponse<String> pending =
                response("{\"status\":\"PENDING\",\"purchase_units\":[{\"custom_id\":\"" + orderId + "\"}]}", 200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(pending);

        assertThrows(PayPalApiException.class,
                () -> service.capturePayPalOrder("PAY-1", orderId, owner));
        verify(enrollmentService, never()).enrollFromPaidOrder(any(User.class), any(Course.class));
    }

    @Test
    void capture_orderNotFound_throws() {
        User owner = student();
        UUID missingId = UUID.randomUUID();
        when(orderValidator.resolveOrder(missingId))
                .thenThrow(new OrderNotFoundException(missingId));

        assertThrows(OrderNotFoundException.class,
                () -> service.capturePayPalOrder("PAY-1", missingId, owner));
    }

    @Test
    void capture_notOwned_validatePayableRejects() {
        User owner = student();
        User attacker = student();
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, course("10", CurrencyEnum.MAD));

        when(orderValidator.resolveOrder(orderId)).thenReturn(order);
        doThrow(new AccessDeniedException("denied")).when(orderValidator).validatePayable(order, attacker);

        assertThrows(AccessDeniedException.class,
                () -> service.capturePayPalOrder("PAY-1", orderId, attacker));
    }

    @Test
    void capture_enrollmentFailure_abortsBeforePersisting() throws Exception {
        User owner = student();
        Course c = course("15.00", CurrencyEnum.MAD);
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, c);

        HttpResponse<String> getOrder =
                response("{\"purchase_units\":[{\"custom_id\":\"" + orderId + "\"}]}", 200);
        HttpResponse<String> capture = response(
                "{\"status\":\"COMPLETED\",\"purchase_units\":[{\"payments\":{\"captures\":[{\"id\":\"CAP-1\",\"amount\":{\"value\":\"1.50\",\"currency_code\":\"USD\"}}]}}]}",
                200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(getOrder, capture);
        doThrow(new IllegalStateException("already enrolled"))
                .when(enrollmentService).enrollFromPaidOrder(owner, c);

        assertThrows(IllegalStateException.class,
                () -> service.capturePayPalOrder("PAY-1", orderId, owner));
        // Rollback: order not marked paid, not saved, no partial state.
        assertEquals(OrderStatusEnum.pending, order.getStatus());
        verify(orderRepository, never()).save(order);
    }

    // =============================== C. IDEMPOTENCY ===============================

    @Test
    void capture_secondCallOnPaidOwnedOrder_doesNotEnrollAgainOrResave() throws Exception {
        User owner = student();
        Course c = course("20", CurrencyEnum.MAD);
        Order order = Order.builder()
                .id(UUID.randomUUID())
                .user(owner)
                .course(c)
                .status(OrderStatusEnum.paid)
                .totalAmount(c.getPrice())
                .currency(c.getCurrency())
                .build();
        when(orderValidator.resolveOrder(order.getId())).thenReturn(order);

        // First call in real life would have paid; here the order is already paid -> idempotent.
        PayPalCaptureResponse first = service.capturePayPalOrder("PAY-1", order.getId(), owner);
        PayPalCaptureResponse second = service.capturePayPalOrder("PAY-1", order.getId(), owner);

        assertEquals("COMPLETED", first.getStatus());
        assertEquals("ALREADY_CAPTURED", first.getCaptureId());
        assertEquals("ALREADY_CAPTURED", second.getCaptureId());
        verify(enrollmentService, never()).enrollFromPaidOrder(any(User.class), any(Course.class));
        verify(orderRepository, never()).save(any(Order.class));
        verify(httpClient, never()).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void capture_paidOrderOfDifferentUser_stillRejected() {
        User owner = student();
        User other = student();
        Course c = course("20", CurrencyEnum.MAD);
        Order order = Order.builder()
                .id(UUID.randomUUID())
                .user(owner)
                .course(c)
                .status(OrderStatusEnum.paid)
                .totalAmount(c.getPrice())
                .currency(c.getCurrency())
                .build();
        when(orderValidator.resolveOrder(order.getId())).thenReturn(order);

        // Idempotency must NEVER bypass authorization: another user's paid order is still denied.
        assertThrows(AccessDeniedException.class,
                () -> service.capturePayPalOrder("PAY-1", order.getId(), other));
    }

    // =============================== F. SECURITY / SERVER-DERIVED VALUES ===============================

    @Test
    void capture_serverRejectsClientForcedCurrencyAndAmount() throws Exception {
        // The client cannot influence the accepted amount/currency: the PayPal capture body and the
        // internal order define the values; anything else (amount or currency) is rejected.
        User owner = student();
        UUID orderId = UUID.randomUUID();
        Order order = pendingOrder(orderId, owner, course("40.00", CurrencyEnum.MAD));

        // PayPal reports a large amount in USD that does NOT equal the server order amount.
        HttpResponse<String> getOrder =
                response("{\"purchase_units\":[{\"custom_id\":\"" + orderId + "\"}]}", 200);
        HttpResponse<String> capture = response(
                "{\"status\":\"COMPLETED\",\"purchase_units\":[{\"payments\":{\"captures\":[{\"id\":\"CAP-1\",\"amount\":{\"value\":\"9999.99\",\"currency_code\":\"USD\"}}]}}]}",
                200);

        stubPayable(order, owner);
        when(authService.getAccessToken()).thenReturn("token");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(getOrder, capture);

        assertThrows(IllegalArgumentException.class,
                () -> service.capturePayPalOrder("PAY-1", orderId, owner));
        verify(enrollmentService, never()).enrollFromPaidOrder(any(User.class), any(Course.class));
    }
}
