[OPEN]

# Debug Session: courses-post-401

## Symptom
- `POST /api/courses` returns `401 Unauthorized`
- `GET /api/auth/me` succeeds with the same Bearer token

## Scope
- Investigate security chain, JWT filter, method security, endpoint annotations, and exception handling
- Do not modify business logic before evidence collection

## Initial Hypotheses
- H1: `POST /api/courses` is evaluated by a different security path than `GET /api/auth/me`, causing anonymous access at authorization time.
- H2: Method security on `CourseController.create()` is failing because authentication is not present when `@PreAuthorize("isAuthenticated()")` is evaluated.
- H3: `JwtAuthenticationFilter` populates the `SecurityContext`, but it is cleared or replaced before controller/method-security execution.
- H4: The request reaches `AuthenticationEntryPoint` from `ExceptionTranslationFilter` because Spring sees an `AuthenticationCredentialsNotFoundException` or anonymous authentication for this endpoint.
- H5: Authorities/role mapping is malformed, and another security layer outside the visible controller annotation is effectively rejecting the call.

## Files To Audit
- `backend/src/main/java/com/awardsacademique/authentification/security/SecurityConfig.java`
- `backend/src/main/java/com/awardsacademique/authentification/security/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/awardsacademique/authentification/security/JwtService.java`
- `backend/src/main/java/com/awardsacademique/courses/controller/CourseController.java`
- `backend/src/main/java/com/awardsacademique/courses/service/interfaces/CourseService.java`
- `backend/src/main/java/com/awardsacademique/courses/service/impl/CourseServiceImpl.java`
- `backend/src/main/java/com/awardsacademique/authentification/controller/AuthController.java`
- `backend/src/main/java/com/awardsacademique/authentification/entity/User.java`
- `backend/src/main/java/com/awardsacademique/authentification/entity/Role.java`
- `backend/src/main/java/com/awardsacademique/authentification/entity/RoleName.java`
- `backend/src/main/java/com/awardsacademique/authentification/security/CustomUserDetailsService.java`
- `backend/src/main/resources/application.yml`

## Status
- Read-only audit in progress

## Evidence Collected
- Static audit:
  - `POST /api/courses` in `CourseController` uses `@PreAuthorize("isAuthenticated()")`
  - No `ROLE_ADMIN` or `ROLE_INSTRUCTOR` requirement exists on the course POST endpoint
  - Only one `SecurityFilterChain` exists
  - Only one custom `OncePerRequestFilter` exists: `JwtAuthenticationFilter`
  - CSRF is disabled
- Runtime reproduction on existing app at `:8080`:
  - `POST /api/auth/login` returns JWT
  - `GET /api/auth/me` succeeds with same token
  - `POST /api/courses` returns `401`
- Runtime reproduction on fresh app instance from current source at `:8081`:
  - `POST /api/auth/login` returns JWT
  - `JwtAuthenticationFilter` logs show Bearer header present, subject resolved, token valid, authentication populated with `[ROLE_student]`
  - `CourseController.create()` logs show authentication is still present at controller entry
  - Request reaches `CourseServiceImpl.create()`
  - Failure is `IllegalArgumentException: Category not found`, not `401`

## Conclusion
- The current source code does not reproduce the `401` on `POST /api/courses`
- Port `8080` is running a different/stale Java process than the current source-backed instance on `8081`
- The observed `401` belongs to the stale `:8080` process, not the current code path inspected in this session
