# [OPEN] Debug Session: request-failed-500
**Created**: 2026-08-15
**Symptom**: User reports `Request failed with status code 500` when using the just-generated auth frontend (React+TS+Vite) against the authentification backend.
**Expected**: REST calls return matching HTTP codes (200/201/204 or 400/401/404/409). No 500 from the auth module for any expected input.
**Scope**: `backend/src/main/java/com/awardsacademique/authentification/**` + frontend's axios apiClient / authApi / AuthContext flows.
**Change log**:
- 2026-08-15 — Session created. Hypotheses listed. Awaiting reproduction detail + backend stack trace evidence.

## Hypotheses (Falsifiable)
| # | Hypothesis | Prediction / How to refute |
|---|---|---|
| H1 | **`JwtService` cannot resolve `${jwt.secret}`** because no `jwt.secret` / `jwt.expiration` env / yml value is present. Context boot or first request that touches JwtService throws `IllegalArgumentException: Could not resolve placeholder` → 500. | Confirmed if backend log contains `PlaceholderResolutionException` / `jwt.secret` / `Could not resolve placeholder`. Refuted if backend log shows successful JWT generation for at least one request. |
| H2 | **`DuplicateEmailException` / `UserNotFoundException` are NOT being mapped by `GlobalAuthExceptionHandler`** → fall through to `GlobalCourseExceptionHandler.handle(Exception)` → generic 500 JSON. Possible causes: `@RestControllerAdvice` basePackages mismatch, `@Order(HIGHEST_PRECEDENCE)` doesn't win because of Spring advisor ordering, or handler class isn't component-scanned (different `basePackages` than GlobalCourseExceptionHandler). | Confirmed if backend log shows the specific exception being thrown + stack, then `handleAll(Exception)` of GlobalCourseExceptionHandler fires. Refuted if `GlobalAuthExceptionHandler.handleDuplicateEmail(...)` / `handleUserNotFound(...)` appear in stack trace or TRACE log. |
| H3 | **`AuthValidator.resolveDefaultStudentRole()` fails** — `roles` DB table is empty / has no `student` row. `RoleInitializer` (file exists) didn't run; or runs but its insert uses different RoleName casing. Result: `IllegalStateException("Default role STUDENT is not configured")` thrown on first `/register`. | Confirmed if first `/register` call fails with message containing "Default role STUDENT is not configured". Refuted if roles populated: `SELECT name FROM roles` returns rows including `student`. |
| H4 | **`/api/auth/me` / `/refresh-token` chain NPE**: `user.getRole()` or `user.getRole().getName()` returns `null` because the `users.role_id` FK points at a row that no longer exists, or User entity fetch=LAZY for role + no `@Transactional(readOnly=true)` on service/filter path. `NullPointerException` → 500. | Confirmed if stack trace shows NPE line in `toUserDetails(User)` or `AuthServiceImpl.refreshToken`. Refuted if all role lookups return non-null Role with non-null RoleName enum. |
| H5 | **`/api/auth/logout` / `/refresh-token` missing required header or auth state**: Controller expects auth but backend security chain returns 500 instead of 401 (e.g. `SecurityContextRepository` mix of Delegating+http session + STATELESS causes a NPE in a corner case). Alternatively frontend axios sent an empty string as Bearer token (after wiping), causing JwtService `extractAllClaims` to `IllegalArgumentException: empty JWT` → no catch → 500 (we added catches to `extractExpiration`/`extractUsername` but `extractClaim` for `isTokenExpired` could still throw via `isTokenValid` call path? Actually isTokenValid catches all… but `parseSignedClaims(token)` when token empty string — yes `IllegalArgumentException` which we catch in isTokenValid. | Confirmed if error only happens on `/logout` or `/refresh-token`, and the exception message mentions "empty" or "JWT" string. Refuted if register/login endpoints also 500. |

## Evidence Log
| Source | File / Endpoint | Status | Notes |
|---|---|---|---|
| (pending user) | Which endpoint: register/login/me/profile/change-password? | — | — |
| (pending user) | When does it happen? First load, on submit, while navigating? | — | — |
| (pending backend logs) | `backend/target/logs/*` or console | — | Need exact stack trace + HTTP status 500 JSON body. |
| (pending DB check) | `SELECT name FROM roles;` | — | Confirm role student exists. |
| (pending env check) | `jwt.secret` + `jwt.expiration` present in env / application-local.yml? | — | Confirm no placeholder resolution error. |
