package com.awardsacademique.payments.paypal;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.cart.repository.CartRepository;
import com.awardsacademique.enrollments.service.interfaces.EnrollmentService;
import com.awardsacademique.orders.entity.Order;
import com.awardsacademique.orders.entity.OrderStatusEnum;
import com.awardsacademique.orders.Repository.OrderRepository;
import com.awardsacademique.orders.validation.OrderValidator;
import com.awardsacademique.payments.paypal.dto.PayPalCaptureResponse;
import com.awardsacademique.payments.paypal.dto.PayPalOrderResponse;
import com.awardsacademique.payments.paypal.exception.PayPalApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class PayPalOrderService {

    private final PayPalProperties properties;
    private final PayPalAuthService authService;
    private final OrderValidator orderValidator;
    private final EnrollmentService enrollmentService;
    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final PayPalAmountConverter amountConverter;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public PayPalOrderService(PayPalProperties properties,
                              PayPalAuthService authService,
                              OrderValidator orderValidator,
                              EnrollmentService enrollmentService,
                              CartRepository cartRepository,
                              OrderRepository orderRepository) {
        this.properties = properties;
        this.authService = authService;
        this.orderValidator = orderValidator;
        this.enrollmentService = enrollmentService;
        this.cartRepository = cartRepository;
        this.orderRepository = orderRepository;
        this.amountConverter = new PayPalAmountConverter(properties.getMadToUsdRate());
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public PayPalOrderService(PayPalProperties properties,
                              PayPalAuthService authService,
                              OrderValidator orderValidator,
                              EnrollmentService enrollmentService,
                              CartRepository cartRepository,
                              OrderRepository orderRepository,
                              HttpClient httpClient,
                              ObjectMapper objectMapper) {
        this.properties = properties;
        this.authService = authService;
        this.orderValidator = orderValidator;
        this.enrollmentService = enrollmentService;
        this.cartRepository = cartRepository;
        this.orderRepository = orderRepository;
        this.amountConverter = new PayPalAmountConverter(properties.getMadToUsdRate());
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PayPalOrderResponse createPayPalOrder(UUID internalOrderId, User currentUser) {
        Order order = orderValidator.resolveOrder(internalOrderId);
        orderValidator.validatePayable(order, currentUser);

        if (order.getStatus() == OrderStatusEnum.paid) {
            throw new IllegalStateException("Order is already paid");
        }

        // The amount PayPal actually charges is derived server-side from the stored
        // order and the configured FX rate. Nothing about the amount or currency is
        // taken from the client.
        BigDecimal amount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        PayPalAmountConverter.ConvertedAmount converted =
                amountConverter.toPayPalAmount(amount,
                        order.getCurrency() != null ? order.getCurrency().name() : "MAD");
        String currencyCode = converted.payPalCurrency();
        amount = converted.amount();

        try {
            String token = authService.getAccessToken();
            String url = properties.getBaseUrl().replaceAll("/+$", "") + "/v2/checkout/orders";

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("intent", "CAPTURE");

            Map<String, Object> amountObj = new LinkedHashMap<>();
            amountObj.put("currency_code", currencyCode);
            amountObj.put("value", amount.toPlainString());

            Map<String, Object> purchaseUnit = new LinkedHashMap<>();
            purchaseUnit.put("reference_id", order.getId().toString());
            purchaseUnit.put("custom_id", order.getId().toString());
            purchaseUnit.put("amount", amountObj);

            body.put("purchase_units", List.of(purchaseUnit));

            String jsonBody = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .header("PayPal-Request-Id", UUID.randomUUID().toString())
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("PayPal create order failed with status {} - body: {}", response.statusCode(), response.body());
                String fallback = "Failed to create PayPal order: HTTP " + response.statusCode();
                throw new PayPalApiException(buildPayPalErrorMessage(response.statusCode(), response.body(), fallback));
            }

            JsonNode root = objectMapper.readTree(response.body());
            String paypalOrderId = root.path("id").asText(null);
            String status = root.path("status").asText("CREATED");

            if (paypalOrderId == null || paypalOrderId.isBlank()) {
                throw new PayPalApiException("PayPal response missing order ID");
            }

            return new PayPalOrderResponse(paypalOrderId, status, order.getId(), amount, currencyCode);

        } catch (PayPalApiException | IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("PayPal create order request failed: {}", ex.getMessage(), ex);
            throw new PayPalApiException("PayPal create order request failed: " + ex.getMessage(), ex);
        }
    }

    @Transactional
    public PayPalCaptureResponse capturePayPalOrder(String paypalOrderId, UUID internalOrderId, User currentUser) {
        Order order = orderValidator.resolveOrder(internalOrderId);

        // 1. Idempotency check: if order is already paid and belongs to currentUser, return success without duplicate processing
        if (order.getStatus() == OrderStatusEnum.paid) {
            if (!order.getUser().getId().equals(currentUser.getId())) {
                throw new org.springframework.security.access.AccessDeniedException("You can only access your own orders");
            }
            log.info("Order {} is already paid (idempotent capture request)", order.getId());
            PayPalAmountConverter.ConvertedAmount converted = amountConverter.toPayPalAmount(
                    order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO,
                    order.getCurrency() != null ? order.getCurrency().name() : "MAD");
            return new PayPalCaptureResponse(paypalOrderId, "COMPLETED", order.getId(),
                    "ALREADY_CAPTURED", converted.amount(), converted.payPalCurrency());
        }

        // 2. Validate order is payable by currentUser
        orderValidator.validatePayable(order, currentUser);

        try {
            // 3. Optional: Verify PayPal order details via GET /v2/checkout/orders/{paypalOrderId} to ensure custom_id matches internalOrderId
            String token = authService.getAccessToken();
            String getOrderUrl = properties.getBaseUrl().replaceAll("/+$", "") + "/v2/checkout/orders/" + paypalOrderId;

            HttpRequest getRequest = HttpRequest.newBuilder()
                    .uri(URI.create(getOrderUrl))
                    .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> getResponse = httpClient.send(getRequest, HttpResponse.BodyHandlers.ofString());
            if (getResponse.statusCode() >= 200 && getResponse.statusCode() < 300) {
                JsonNode orderRoot = objectMapper.readTree(getResponse.body());
                JsonNode purchaseUnits = orderRoot.path("purchase_units");
                if (purchaseUnits.isArray() && !purchaseUnits.isEmpty()) {
                    String customId = purchaseUnits.get(0).path("custom_id").asText("");
                    if (!customId.isBlank() && !customId.equals(order.getId().toString())) {
                        log.error("PayPal order custom_id {} does not match internal order id {}", customId, order.getId());
                        throw new IllegalArgumentException("PayPal order does not correspond to this internal order");
                    }
                }
            }

            // 4. Execute Capture
            String captureUrl = properties.getBaseUrl().replaceAll("/+$", "") + "/v2/checkout/orders/" + paypalOrderId + "/capture";

            HttpRequest captureRequest = HttpRequest.newBuilder()
                    .uri(URI.create(captureUrl))
                    .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .header("PayPal-Request-Id", UUID.randomUUID().toString())
                    .POST(HttpRequest.BodyPublishers.ofString(""))
                    .build();

            HttpResponse<String> response = httpClient.send(captureRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("PayPal capture failed with status {} - body: {}", response.statusCode(), response.body());
                String fallback = "Failed to capture PayPal order: HTTP " + response.statusCode();
                throw new PayPalApiException(buildPayPalErrorMessage(response.statusCode(), response.body(), fallback));
            }

            JsonNode root = objectMapper.readTree(response.body());
            String status = root.path("status").asText("");

            if (!"COMPLETED".equalsIgnoreCase(status)) {
                throw new PayPalApiException("PayPal order capture status is not COMPLETED: " + status);
            }

            // 5. Verify capture amount and currency
            JsonNode purchaseUnitsNode = root.path("purchase_units");
            if (purchaseUnitsNode.isArray() && !purchaseUnitsNode.isEmpty()) {
                JsonNode payments = purchaseUnitsNode.get(0).path("payments");
                JsonNode captures = payments.path("captures");
                if (captures.isArray() && !captures.isEmpty()) {
                    JsonNode capture = captures.get(0);
                    String captureId = capture.path("id").asText(null);
                    JsonNode amountNode = capture.path("amount");
                    String capturedValueStr = amountNode.path("value").asText("0");
                    String capturedCurrency = amountNode.path("currency_code").asText("USD");

                    BigDecimal capturedAmount = new BigDecimal(capturedValueStr);
                    // Expected value recomputed with the same deterministic conversion used at
                    // create-order time (MAD is converted; EUR/USD pass through).
                    PayPalAmountConverter.ConvertedAmount expected = amountConverter.toPayPalAmount(
                            order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO,
                            order.getCurrency() != null ? order.getCurrency().name() : "MAD");
                    BigDecimal expectedAmount = expected.amount();
                    String expectedCurrency = expected.payPalCurrency();

                    // Verify amount match
                    if (capturedAmount.compareTo(expectedAmount) != 0) {
                        log.error("Amount mismatch! Expected {}, got {}", expectedAmount, capturedAmount);
                        throw new IllegalArgumentException("Captured amount does not match order total amount");
                    }

                    // Verify currency match
                    if (!capturedCurrency.equalsIgnoreCase(expectedCurrency)) {
                        log.error("Currency mismatch! Expected {}, got {}", expectedCurrency, capturedCurrency);
                        throw new IllegalArgumentException("Captured currency does not match order currency");
                    }

                    // 6. Grant enrollment through existing pipeline
                    enrollmentService.enrollFromPaidOrder(currentUser, order.getCourse());

                    // 7. Mark order paid and persist via OrderRepository
                    order.setStatus(OrderStatusEnum.paid);
                    orderRepository.save(order);

                    // 8. Remove purchased course from cart
                    cartRepository.findByUserId(currentUser.getId()).ifPresent(cart -> {
                        boolean removed = cart.getItems().removeIf(item -> item.getCourse().getId().equals(order.getCourse().getId()));
                        if (removed) {
                            cart.setUpdatedAt(LocalDateTime.now());
                            cartRepository.save(cart);
                        }
                    });

                    return new PayPalCaptureResponse(paypalOrderId, status, order.getId(), captureId, capturedAmount, capturedCurrency);
                }
            }

            throw new PayPalApiException("PayPal capture response missing payment capture details");

        } catch (PayPalApiException | IllegalArgumentException | IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("PayPal capture request failed: {}", ex.getMessage(), ex);
            throw new PayPalApiException("PayPal capture request failed: " + ex.getMessage(), ex);
        }
    }

    /**
     * Enriches a generic "Failed to ...: HTTP xyz" message with the actionable
     * reason PayPal actually returned (e.g. {@code details[].issue} /
     * {@code details[].description}), so the frontend and support logs show the
     * real cause (TRANSACTION_LIMIT_EXCEEDED, CURRENCY_NOT_SUPPORTED, ...) instead
     * of an opaque status code. Known issues are translated to a friendly French
     * message; the raw PayPal issue code is always kept in parentheses for tracing.
     * The raw PayPal body is never logged (already handled by callers), and the
     * payload may be unparseable, in which case the fallback is returned unchanged.
     */
    private String buildPayPalErrorMessage(int statusCode, String responseBody, String fallback) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode details = root.path("details");
            if (details.isArray() && !details.isEmpty()) {
                String issue = details.get(0).path("issue").asText("");
                String description = details.get(0).path("description").asText("");
                String friendly = friendlyPayPalIssue(issue);
                if (friendly != null) {
                    return fallback + ": " + friendly + " (" + issue + ")";
                }
                if (!description.isBlank()) {
                    return fallback + ": " + description + (issue.isBlank() ? "" : " (" + issue + ")");
                }
                if (!issue.isBlank()) {
                    return fallback + ": " + issue;
                }
            }
            String message = root.path("message").asText("");
            if (!message.isBlank()) {
                return fallback + ": " + message;
            }
        } catch (Exception ignored) {
            // Unparseable response body: keep the generic fallback message.
        }
        return fallback;
    }

    private String friendlyPayPalIssue(String issue) {
        return switch (issue) {
            case "TRANSACTION_LIMIT_EXCEEDED" ->
                    "le montant de la commande dépasse la limite de transaction autorisée par le compte PayPal destinataire";
            case "CANNOT_BE_ZERO_OR_NEGATIVE" -> "le montant de la commande doit être strictement positif";
            case "CURRENCY_NOT_SUPPORTED" -> "la devise de la commande n'est pas prise en charge par PayPal";
            case "INSTRUMENT_DECLINED" -> "le moyen de paiement PayPal a été refusé";
            default -> null;
        };
    }
}
