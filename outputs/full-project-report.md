# Awards Academique — Full Project Report

Generated: 2026-08-15 · Single-pass snapshot (frontend deleted, backend-only Spring Boot project).

---

## 1. Overview

### Stack

| Layer         | Tech / Framework                                                                 |
|---------------|----------------------------------------------------------------------------------|
| Backend API   | **Spring Boot 3.4.x**, Java 21, Maven multi-module layout (single module today) |
| ORM / DB      | **Spring Data JPA** + Hibernate + Flyway migrations on **PostgreSQL 17**        |
| Auth / RBAC   | JWT (jjwt) + in-memory `TokenBlacklistService` (scheduled cleanup every 300s) + Spring Security `@PreAuthorize` + `AuthorizationService` component for cross-entity ownership checks |
| Validation    | Per-module `*Validator` Spring Components (15/16 wired, 1 still empty)           |
| Mappers       | MapStruct + Lombok (no hand-written MapperImpl; generated via annotation processor) |
| Async/Tasks   | `@EnableScheduling` on `BackendApplication`                                     |
| Containerization | `docker-compose.yml` (Postgres service only; no nginx/FE services anymore)    |
| Frontend      | **REMOVED** (2026-08-15). Was React 18 + Vite 7 + TypeScript + Tailwind + TanStack Query + React Router v6.4 data-browser-router. Pages/API adapters existed for Student Dashboard, Courses, Instructor 5 panels (Quizzes/Orders/Resources/Reviews/Certificates). All deleted. |

### Architecture Style

Monolithic 3-tier Spring Boot app behind a single `com.awardsacademique.*` package. DDD-by-bounded-context layout: **22 business modules** + a shared `common/` layer. Every module follows the same 10-file vertical-slice skeleton:

```
<module>/
├── Repository/                  (capital R — shared convention; do NOT rename)
│   └── *Repository.java
├── controller/
│   └── *Controller.java         @RestController, @RequestMapping("/api/<module>")
├── dto/{request,response}/
│   ├── Create*Request.java      (jakarta.validation + custom Validators)
│   ├── Update*Request.java
│   └── *Response.java
├── entity/
│   ├── <Entity>.java            @Entity
│   └── <Enum>Enum.java          (one business enum per module)
├── exception/
│   ├── *NotFoundException.java
│   └── <GlobalExceptionHandler>.java  (optional, per-module @RestControllerAdvice)
├── mapper/   *Mapper.java       MapStruct @Mapper(unmappedTargetPolicy=ERROR)
├── service/
│   ├── impl/   *ServiceImpl.java  @Transactional @Service (≤250 lines target)
│   └── interfaces/  *Service.java
├── utils/    *Utils.java         (small static helpers)
└── validation/  *Validator.java  @Component — shared rule library, 0 inline rules in Services
```

Shared `common/` package:
- `common/pipeline/CourseCompletionPipeline.java` — **Single-Source-of-Truth** for enrollment completion% + state transitions + auto-certificate issuing. Shared by progress and quiz-attempts to avoid duplicate logic and circular injection.
- `common/rbac/AuthorizationService.java` — reusable "is this user owner of this entity?" + `requireAdministrator()` + `requireInstructorOfCourse()` methods used by services.
- `common/rbac/CurrentUserProvider.java` — thin wrapper around `SecurityContextHolder` to avoid static access pollution in services.
- `common/config/EnumConfig.java` — Jackson/EnumDefaults shared config (if any).

### Module Breakdown (backend, 22 domains)

| #  | Module                    | Purpose                                                |
|----|---------------------------|--------------------------------------------------------|
| 1  | authentification          | Users/Roles, JWT, register/login/refresh/me, password  |
| 2  | categories                | 4-level category tree (parent/child, roots endpoint)   |
| 3  | courses                   | Courses + levels + published status + search specs     |
| 4  | sections                  | Course sections (groupings of lessons)                 |
| 5  | lessons                   | Lessons + lesson type enum + video upload storage      |
| 6  | resources                 | Lesson resources (attachments, per-lesson)             |
| 7  | quizzes                   | Per-lesson or per-course quizzes + passingScore        |
| 8  | questions                 | Questions (MCQ) + QuestionOptions, unique displayOrder |
| 9  | quizattempts              | Quiz submission + auto-scoring vs passingScore         |
| 10 | progress                  | Per-lesson-per-enrollment progress, unique UC          |
| 11 | enrollments               | Student ↔ course enrollment, completion%, status FSM   |
| 12 | orders                    | Order lifecycle + free-order auto-grant enrollment     |
| 13 | payments                  | Payment entity + stubs (no payment gateway wired)      |
| 14 | certificates              | Auto-issue on full completion + certificate code uniq  |
| 15 | reviews                   | Student reviews per course (unique user/course)        |
| 16 | notifications             | Notifications (entity stubs)                           |
| 17 | ai                        | AI conversations + messages (service = minimal stubs)  |
| 18 | common                    | Shared pipeline + RBAC utilities                       |
| 19 | BackendApplication        | Boot entrypoint + `@EnableScheduling`                  |
| —  | (plus 2 enum-only folders inside entities where listed above) |

---

## 2. Backend

### 2.1 Package Structure (high level)

```
com.awardsacademique/
├── BackendApplication.java
├── authentification/        (SecurityConfig, JwtService, JwtAuthenticationFilter, TokenBlacklistService, PublicEndpoints, CustomUserDetailsService)
├── ai/
├── categories/
├── certificates/
├── common/
│   ├── config/
│   ├── pipeline/           CourseCompletionPipeline
│   └── rbac/               AuthorizationService, CurrentUserProvider
├── courses/
├── enrollments/
├── lessons/
├── notifications/
├── orders/
├── payments/
├── progress/
├── questions/
├── quizattempts/
├── quizzes/
├── resources/
├── reviews/
└── sections/
```

Every module mirrors: `Repository / controller / dto / entity / exception / mapper / service / utils / validation`. 6 modules expose an additional `@RestControllerAdvice` exception handler (`GlobalCourseExceptionHandler`, `GlobalLessonExceptionHandler`, `GlobalProgressExceptionHandler`, `GlobalQuizAttemptsExceptionHandler` + 2 NotFound/Duplicate catchers in categories/sections).

### 2.2 Entities / Models (19 + 11 enums)

| #  | Entity                         | Purpose (1 line)                                                                 |
|----|--------------------------------|----------------------------------------------------------------------------------|
| 1  | User                           | Core user account (firstName, lastName, email, pwd, enabled, soft delete) + @ManyToOne Role |
| 2  | Role                           | {id, name (STUDENT, INSTRUCTOR, ADMINISTRATOR via RoleName enum)}                |
| 3  | Category                       | Self-join parent category, 4-level nesting, image, isActive, slug                |
| 4  | Course                         | Instructor-owned, belongsTo Category, price+currency, isPublished, status enum, levels |
| 5  | Section                        | Course grouping order: {course, title, displayOrder}                             |
| 6  | Lesson                         | Per-section: lessonType (video, text, pdf…), status (DRAFT/PUBLISHED), content, duration |
| 7  | LessonResource                 | Per-lesson file attachment (URL/type, LessonResourceTypeEnum)                    |
| 8  | Quiz                           | Linked to Course+Lesson?; passingScore; status DRAFT/PUBLISHED/ARCHIVED          |
| 9  | Question                       | Per-quiz MCQ question + displayOrder, unique order enforced                      |
| 10 | QuestionOption                 | Per-question answer choice + `isCorrect` flag                                    |
| 11 | QuizAttempt                    | User-per-quiz submission: status, score, startedAt, completedAt                  |
| 12 | LessonProgress                 | Enrollment+Lesson: status NOT_STARTED/IN_PROGRESS/COMPLETED, **UniqueConstraint** (enrollment_id, lesson_id) |
| 13 | Enrollment                     | Student+Course: enrollmentDate, **completionPercentage (persisted S3)**, status ACTIVE/COMPLETED/CANCELLED, lastActivityAt, completedAt |
| 14 | Order                          | User+Course order with OrderStatus (PENDING → PAID/FAILED/CANCELLED) + amount/currency/orderDate |
| 15 | Payment                        | Linked to Order: status/method/gatewayRef, amount/currency/processedAt           |
| 16 | Certificate                    | User+Course, issuedAt, unique **certificateCode**, grade, pdfUrl                 |
| 17 | Review                         | User+Course (**V11 unique**), rating 1-5, comment, status (PENDING/APPROVED/REJECTED), createdAt/updatedAt, likeCount |
| 18 | Notification                   | User+notificationType + title/message/readAt                                     |
| 19 | AiConversation + AiMessage     | Per-user chat conversations + messages (MessageSenderEnum USER/ASSISTANT) + timestamps |

### 2.3 API Endpoints — summary table

For each controller, list: HTTP method + path (with/without @RequestMapping prefix), purpose, and RBAC if any.

| Method    | Path (prefix `/api`)                                    | Purpose                                                                 | Auth / RBAC if known |
|-----------|---------------------------------------------------------|-------------------------------------------------------------------------|----------------------|
| POST      | `/auth/register`                                        | Create new STUDENT account (RoleName=STUDENT)                          | public               |
| POST      | `/auth/login`                                           | Issue `accessToken` + short JWT via `LoginRequest`                     | public               |
| POST      | `/auth/logout`                                          | Add token to JWT blacklist via jti                                      | authenticated        |
| POST      | `/auth/refresh-token`                                   | Refresh session → new AuthResponse with userId/firstName/lastName/email/role | authenticated (token checked) |
| GET       | `/auth/me`                                              | Return current user's AuthResponse profile                              | authenticated        |
| PUT       | `/auth/profile`                                         | Update first/last/email + password change (optional)                   | authenticated        |
| PUT       | `/auth/change-password`                                 | Dedicated ChangePasswordRequest (old / new)                             | authenticated        |
| GET       | `/categories`                                           | All categories (full list or roots?)                                    | public               |
| GET       | `/categories/roots`                                     | Only top-level (parent=null) categories (MegaMenu consumer)             | public               |
| GET       | `/categories/{id}`                                      | Single category by id                                                   | public               |
| GET       | `/categories/{id}/children`                             | Sub-categories beneath parent id                                        | public               |
| POST/PUT/DEL  | `/categories{/id}`                                  | Full CRUD + slug generation                                             | ADMINISTRATOR        |
| GET       | `/courses/published`                                    | Browse published courses (filter search, public)                        | public               |
| GET       | `/courses/search`                                       | Specification search (level, category, instructor, price, etc.)         | public               |
| GET       | `/courses/{id}`                                         | Single course detail (public)                                           | public               |
| POST      | `/courses`                                              | Instructor creates new course (DRAFT)                                   | INSTRUCTOR/ADMIN     |
| PUT/DEL   | `/courses/{id}`                                         | Update/delete course (owner-only via AuthorizationService)              | course owner instructor or ADMIN |
| POST      | `/courses/{id}/publish`                                 | Set isPublished=true + status approved                                  | ADMINISTRATOR (manual approval flow) |
| POST      | `/courses/{id}/submit-for-review`                       | Course status PENDING (submitted by instructor)                         | INSTRUCTOR           |
| GET       | `/courses/instructor/mine`                              | Current instructor — their courses                                      | INSTRUCTOR           |
| GET       | `/sections` / `/sections/{id}`                          | CRUD skeleton (read public; write instructor)                           | mixed                |
| POST/PUT/DEL  | `/courses/{courseId}/sections`                      | Section creation/ordering inside a course                               | course owner or ADMIN |
| GET       | `/lessons`                                              | All lessons (admin utility or public?)                                  | —                    |
| GET       | `/lessons/page`                                         | Paginated + courseId/sectionId/status/search query params               | authenticated        |
| GET       | `/lessons/{id}`                                         | Single lesson detail                                                    | —                    |
| GET       | `/lessons/videos/{filename}`                            | Stream video bytes from disk storage                                    | authenticated (enrolled) |
| GET       | `/sections/{sectionId}/lessons`                         | Lessons inside a section                                                | —                    |
| POST      | `/sections/{sectionId}/lessons`                         | Instructor add lesson                                                   | INSTRUCTOR/ADMIN     |
| PUT/DEL   | `/lessons/{id}` / video upload POST/PUT `/lessons/{id}/video` | Edit/replace lesson / upload video file                          | INSTRUCTOR/ADMIN + owner |
| GET       | `/quiz-attempts`                                        | List attempts (mine or admin filter?)                                   | —                    |
| POST      | `/quiz-attempts`                                        | Start new attempt (CreateQuizAttemptRequest → attemptsRepo)             | STUDENT              |
| GET       | `/quiz-attempts/mine`                                   | Current user's quiz attempts                                            | STUDENT              |
| GET       | `/quiz-attempts/{id}`                                   | Single attempt + answers?                                               | attempt owner / ADMIN |
| PUT       | `/quiz-attempts/{id}/submit`                            | Submit answers → auto-grade → score + status COMPLETED → recompute completion pipeline | STUDENT (owner) |
| DEL       | `/quiz-attempts/{id}`                                   | Admin remove fraudulent attempt (recompute pipeline post-delete)        | ADMINISTRATOR        |
| GET       | `/quizzes` / `/quizzes/{id}`                            | List / get quiz                                                         | mixed                |
| GET       | `/quizzes/course/{courseId}`                            | All quizzes for a course (instructor panel + student submissions)       | enrolled or owner    |
| GET       | `/courses/{courseId}/quizzes`                           | (Alias? or per-lesson? check QuizServiceImpl.getAll)                    | —                    |
| POST/PUT/DEL  | `/quizzes{/id}`                                     | CRUD quizzes (passingScore, publish guard in QuizValidator)             | INSTRUCTOR (course owner) + ADMIN |
| GET       | `/questions/quiz/{quizId}`                              | All questions of a quiz                                                 | owner or enrolled    |
| POST/PUT/DEL  | `/questions{/id}`                                   | CRUD a question + options; unique order enforced                        | quiz owner or ADMIN  |
| GET       | `/progress/mine` / `/progress/course/{courseId}`        | List current user progress by enrollment or by course                   | STUDENT              |
| POST      | `/progress`                                             | Create LessonProgress (mark as started)                                 | STUDENT              |
| PATCH     | `/progress/{id}/start`                                  | Mark NOT_STARTED→IN_PROGRESS + startedAt                                | STUDENT              |
| PATCH     | `/progress/{id}/complete`                               | Mark IN_PROGRESS→COMPLETED + completedAt → recompute pipeline          | STUDENT              |
| PUT/DEL   | `/progress/{id}`                                        | Update or admin delete (progress removal = recompute % downward)       | owner or ADMIN       |
| GET       | `/enrollments/mine`                                     | My enrollments list (Student Dashboard uses this)                       | STUDENT              |
| GET       | `/enrollments/course/{courseId}`                        | Admin/instructor view: who enrolled in a course                         | course owner or ADMIN |
| POST      | `/enrollments` (self)                                   | Student enrolls (or auto via order paid)                                | STUDENT              |
| POST      | `/enrollments/as`                                       | ADMIN grants enrollment on behalf of a user (admin RBAC + EnrollmentValidator) | ADMIN |
| PUT/DEL   | `/enrollments/{id}`                                     | Modify enrollment (cancel / complete manually etc.)                     | ADMIN or owner       |
| GET       | `/orders/mine`                                          | My orders list                                                          | authenticated        |
| GET       | `/orders/course/{courseId}`                             | Orders filtered by course (instructor finance panel)                    | course owner/ADMIN   |
| POST      | `/orders` (CreateOrderRequest)                          | Create order (free course = instant PAID → auto-grants enrollment)     | STUDENT              |
| PUT/DEL   | `/orders/{id}` + PATCH `/orders/{id}/status`            | Admin status transitions (pending→paid triggers enroll grant)           | ADMIN                |
| GET/POST/PUT/DEL  | `/payments`                                           | Stubs (no gateway integration yet; placeholder endpoints)               | payment scope        |
| GET       | `/certificates/mine`                                    | My certificates table (Student Dashboard Certificates section)          | STUDENT              |
| GET       | `/certificates/course/{courseId}`                       | Instructor list: who earned certificate in a course                     | course owner or ADMIN |
| POST      | `/certificates` (Create) / PUT DELETE                   | Admin issue / manage (S3 added issueForCompletion internal no-guard)    | ADMIN                |
| GET       | `/certificates/verify/{certificateCode}`                | Public verify endpoint by unique code                                   | public               |
| GET       | `/reviews/mine` / `/reviews/course/{courseId}`          | All my reviews, all reviews for a course                                | mixed                |
| POST      | `/reviews`                                              | Student creates review (unique user/course enforced V11)                | STUDENT (enrolled)   |
| PUT/DEL   | `/reviews/{id}`                                         | Update/delete review; admin moderation                                  | owner or ADMIN       |
| PATCH     | `/reviews/{id}/approve`, `/reject`                      | Admin approve/reject a pending review                                   | ADMIN                |
| GET/POST/PUT/DEL  | `/notifications`                                     | Entity scaffolding only (stubs)                                         | authenticated        |
| GET/POST/PUT/DEL  | `/lesson-resources`                                  | Attachments per-lesson (upload + list)                                  | lesson owner / ADMIN |
| GET       | `/ai/conversations/mine`                                | AI conversation list                                                    | authenticated        |
| POST/PUT/GET/DEL  | `/ai/conversations{/id}`                            | Manage conversations (stub service)                                     | authenticated        |
| GET/PUT   | `/ai/conversations/{id}/messages`                       | (stubs) — send message to AI                                            | authenticated (owner) |

### 2.4 Security / Auth Setup (summary)

1. **JWT standard**: HS512-signed tokens with `jti` claim.  
   - Created by [JwtService](file:///C:/Users/PC/Documents/Version%20one%20-%20Copy%20(2)/backend/src/main/java/com/awardsacademique/authentification/security/JwtService.java).
   - Consumed in filter: `JwtAuthenticationFilter` extracts bearer, checks signature + blacklist, loads `UserDetails`.
2. **Blacklist**: `TokenBlacklistService` (in-memory Set keyed by `jti`).  
   - `@Scheduled(fixedRate = 300_000)` cleanup task. `BackendApplication` has `@EnableScheduling`.
3. **`SecurityConfig.filterChain`** standard Spring Security DSL:
   - `@Value("${cors.allowed-origins:http://localhost:5173,http://localhost:3000}")` (old frontend Vite/CRA fallback defaults present as fallbacks; overridable via `cors.allowed-origins` property). No frontend services exist anymore.
   - CSRF disabled (JWT stateless).
   - `PublicEndpoints` class lists URLs open without auth (register, login, categories public, courses published, certificates verify, static video storage? if any).
   - Any non-public → `isAuthenticated()` + per-controller `@PreAuthorize` hardening (Sprint-1: 6 controllers tightened).
4. **Role model**: `Role.name ∈ {STUDENT, INSTRUCTOR, ADMINISTRATOR}` (RoleName enum).  
   - Default role=STUDENT on `AuthService.register()`. Instructors + admins are manually assigned via RoleInitializer (seed on startup) or DB.
5. **Cross-entity authorization**: `AuthorizationService.requireAdministrator()` / `requireInstructorOfCourse(Course)` / `requireOwnerOfX(...)` used in services instead of duplicating "is current user instructor of this course?" checks.
6. **Known exposure**: application.yml credential fallbacks REMOVED intentionally (Sprint 1 rule "no secrets fallback") — if env vars `DB_PASSWORD` / `JWT_SECRET` aren't set, boot fails with `PlaceholderResolutionException` (expected + documented).

### 2.5 Known bugs / Tech debt

1. **CourseValidator is 100% empty** (Sprint-2 rewired Orders/Enrollments/Quizzes/Questions 100% validators, but CourseValidator still only has package line + empty class body). All inline course rules are duplicated inside CourseServiceImpl.
2. **SecurityConfig CORS fallback still carries Vite (5173) + CRA (3000) defaults.** Frontend deleted but this is protected backend Java security code. Harmless because the actual `cors.allowed-origins` property in application.yml takes precedence. Not touched.
3. **Payments gateway completely stubbed**: `PaymentServiceImpl` placeholder + stubs. No Stripe/PayPal/Mollie integration. Orders can be created free = auto PAID, but paid orders entering PAID via payment callback have no route yet.
4. **AI module stubs**: AiConversation + AiMessage entity + controller endpoints exist, service has minimal logic, no real LLM integration, no streaming, no tokens counted, no rate limits.
5. **Notifications stubs**: entity exists, no event-driven publishing (no event bus publishes on certificate/order/comment).
6. **Lesson video storage = local disk `LessonVideoStorageServiceImpl`** (no S3/CDN). Hardcoded path? If path is relative it's fine for dev but production-ready would need external storage.
7. **Flyway migrations are idempotent but V0 + V12 are placeholder noops.** V0 is schema-export-placeholder (do not apply to real Supabase). V11 adds unique `(user_id, course_id)` on enrollments + reviews via `DO $$ IF NOT EXISTS` blocks. V9 is fill-sequence-gap noop. A baseline / schema-diff reconciliation still needed before first production deploy.
8. **Tests**: ProgressAndQuizAttemptsRbacTest is the only real slice WebMvc/MockBean test; most modules have 0 unit tests and 0 integration tests. `mvn clean verify -DskipTests` builds fine; `mvn test` runs the slice but fails if you don't mock beans for the @Import SecurityConfig slice.
9. **Minor naming inconsistency between Validator folders**: some packages called `validator/` (categories, courses) others called `validation/` (others). Functionally identical but inconsistent casing/naming. Low priority.
10. **Progress CourseProgressResponse DTO uses completion% computed field.** S3 added persisted completion% to Enrollment entity. Some DTOs recompute completion% from scratch; others read the persisted field. Minor double-source drift possible if the two fall out of sync (CourseCompletionPipeline writes the persisted field so they stay aligned as long as every mutation goes through the pipeline; confirmed this session for progress + quizattempts, but not for direct enrollment modifications).

---

## 3. Frontend

**STATE: COMPLETELY REMOVED (2026-08-15) during irreversible backend-only cleanup task.**

For the record, what existed before deletion:
- **Build**: Vite 7 + TypeScript + React 18.
- **Routing**: React Router v6.4 `createBrowserRouter` + `<DashboardLayout>` parent route with nested `<Outlet>` + `ProtectedRoute` wrapper checks isLoading + isAuthenticated + `allowedRoles` (redirecting to `/login` or 403).
- **Auth pages**: Register at `/register`, Login at `/login`, Forgot Password placeholder at `/forgot-password`. Student role assigned by Register; redirect after login via `roleRoutes.resolvePostLoginDestination(role) → /student` or `/instructor` or `/admin`.
- **Student pages**: `/student` Student Dashboard (StatCards: enrolled / in-progress / completed / earned certificates + enrollments DataTable with progress bar + certificates DataTable) + `/student/courses` real Courses page (replaced old Supabase adapters in Sprint 4).
- **Instructor pages** (5, Q-C Sprint 4 wired to real Spring endpoints, previously had `sampleQuizzes/sampleOrders/...` arrays):
  - `/instructor/quizzes`
  - `/instructor/orders`
  - `/instructor/resources` (derived from lessons, per-course; no dedicated Spring instructor resources endpoint)
  - `/instructor/reviews`
  - `/instructor/certificates`
- **Home/Landing**: `/` landing page (under redesign).
- **API client**: `axios` `apiClient.ts` injecting JWT from `AuthContext` + 401 interceptor → wipe session + redirect to login. Snake_case adapter maps `mapCourse`, `mapCategory`, `mapEnrollment`, `mapCertificate` because Spring returns camelCase JSON and old Supabase UI expected snake_case (adapters live in hooks.ts).
- **State management**: React 18 Context (`AuthContext` reducer `{user, token, isLoading, isAuthenticated}`) + TanStack Query `useQuery`/`useMutation` for all data fetching (Sprint-4 added `useMyEnrollments`, `useMyCertificates`, `useMyProgressByCourse`).
- **UI components**: custom components library (`StatCard`, `DataTable`, `Notice`, `Badge`, `ProgressRing`, `PageHeader`, etc.) + Tailwind v3 for styling (tailwind.config.ts existed, but deleted).
- **Design system**: ShadCN-style accessible components via lucide-react icons.
- **Env**: `VITE_API_BASE_URL=http://localhost:8080/api` (frontend/.env deleted).

All 283 frontend files removed. If a new frontend is needed, it should be a separate repo or a new `frontend/` directory using standard `npm create vite@latest` with the above `/api` contract preserved.

---

## 4. Database

### 4.1 Tables list (inferred from entities + flyway migrations names)

Flyway baseline migrations folder: [backend/src/main/resources/db/migration](file:///C:/Users/PC/Documents/Version%20one%20-%20Copy%20(2)/backend/src/main/resources/db/migration)
- V0__baseline_schema_export_placeholder.sql (do NOT run — placeholder for original Supabase schema)
- V1 → lesson status enum  
- V2 → rename lesson `deletedAt` legacy column  
- V3 → add lesson query indexes  
- V4 → add course pending/rejected status  
- V5 → add course published flag  
- V6 → add certificate.certificateCode  
- V7 → align certificates columns  
- V8 → alter lesson_progress (added UniqueConstraint enrollment_id+lesson_id)  
- V9 → fill_sequence_gap_noop (noop)  
- V10 → alter quiz_attempts (added status, score indexes?)  
- V11 → add UNIQUE(user_id, course_id) on enrollments + reviews (idempotent `DO $$ IF NOT EXISTS`)  
- V12 → baseline_gap_noop (noop gap filler between original baseline + new migrations)

Corresponds to ~24 tables (19 entities plus 3 join tables, 2 enum tables that become varchars). Row counts are not accessible from this disk snapshot (Supabase not reachable).

Derived tables list:

| Table (approx name)     | Source entity          | Key columns / relationships                                                                 |
|-------------------------|------------------------|---------------------------------------------------------------------------------------------|
| users                   | User                   | PK UUID; email unique; role_id FK → roles.id; soft delete deletedAt; enabled               |
| roles                   | Role                   | PK UUID; name unique (STUDENT/INSTRUCTOR/ADMINISTRATOR)                                     |
| categories              | Category               | PK UUID; parent_id FK→categories (nullable root); slug unique; level limit 4                |
| courses                 | Course                 | PK UUID; instructor_id FK→users; category_id FK→categories; isPublished boolean; price + currency enum |
| sections                | Section                | PK UUID; course_id FK→courses; displayOrder int; UNIQUE(course_id, title?)                 |
| lessons                 | Lesson                 | PK UUID; section_id FK→sections; lesson_type_enum; status_enum; duration_min; content_text |
| lesson_resources        | LessonResource         | PK UUID; lesson_id FK→lessons; type enum; resource_url; size_bytes                         |
| quizzes                 | Quiz                   | PK UUID; course_id + lesson_id FK; passing_score int DEFAULT 0; status_enum                |
| questions               | Question               | PK UUID; quiz_id FK→quizzes; display_order int unique within quiz; text                    |
| question_options        | QuestionOption         | PK UUID; question_id FK→questions; option_text; is_correct boolean                         |
| quiz_attempts           | QuizAttempt            | PK UUID; user_id FK→users; quiz_id FK→quizzes; attempt_status_enum; score dec(5,2); started/completed_at |
| lesson_progress         | LessonProgress         | PK UUID; **UNIQUE(enrollment_id, lesson_id)** enrollment FK + lesson FK; progress_status enum |
| enrollments             | Enrollment             | PK UUID; **UNIQUE(user_id, course_id)**; completion_percentage int persisted; last_activity_at; status_enum; completed_at |
| orders                  | Order                  | PK UUID; user_id + course_id FK; order_number unique?; status_enum; amount; currency; orderDate |
| payments                | Payment                | PK UUID; order_id FK→orders; amount/currency; method_enum; status_enum; gateway_ref; processedAt |
| certificates            | Certificate            | PK UUID; user_id + course_id FK (index); certificate_code **UNIQUE**; issued_at; grade; pdf_url |
| reviews                 | Review                 | PK UUID; **UNIQUE(user_id, course_id)**; rating 1..5; comment text; status_enum moderation; created_at; like_count |
| notifications           | Notification           | PK UUID; user_id FK→users; type_enum; title/message; readAt nullable                        |
| ai_conversations        | AiConversation         | PK UUID; user_id FK→users; title; created_at                                               |
| ai_messages             | AiMessage              | PK UUID; ai_conversation_id FK→ai_conversations; sender_enum (user/assistant); content_text; created_at |

Additional JPA implicit join tables (if ManyToMany not `@ManyToOne` + `@OneToMany`):
- `users_roles` (if User.role was @ManyToMany — code uses @ManyToOne so actually `users.role_id` — no join table).
- `user_authorities` (if Spring Security authority lists enabled — likely not; Role used via User.role).
- Spring/JPA default: user authorities not used; roles resolved via UserDetails by `User.getRole().getName()`.

### 4.2 Key relationships

```
User 1─────N Course           (an instructor can create MANY courses)
Course N────1 Category        (a course has 1 category)
Course 1─────N Section        (course sections ordered)
Section 1─────N Lesson        (section lessons ordered)
Lesson 1─────N LessonResource (attachments)
Lesson 0..1──1 Quiz           (lesson may have 1 quiz; alternatively per-course quizzes via course_id FK)
Quiz 1─────N Question         (quiz questions ordered)
Question 1─────N QuestionOption (answer choices)

User 1─────N Enrollment       (student enrolls many courses)
Enrollment N──1 Course        (enrollment is per course)

Enrollment 1─N LessonProgress (per-lesson progress)
LessonProgress N─1 Lesson     (points to concrete lesson)

User 1─────N QuizAttempt
QuizAttempt N──1 Quiz         (one attempt is one user taking one quiz)

User 1─────N Order
Order N────1 Course
Order 0..1──1 Payment         (1 order optionally has 1 payment; multiple payments for retries may extend)

Enrollment 1─1 Certificate?   (certificate auto-issued when enrollment=completed. 1 cert per user per course max)
Certificate N─1 User / Course

Course 1─────N Review         (reviews per course)
Review N────1 User            (each review is written by 1 student)

User 1─────N Notification     (inbox)
User 1─────N AiConversation
AiConversation 1──N AiMessage (ordered)
```

### 4.3 Schema quirks / inconsistencies (already noted this session)

1. **Unique constraints not consistently mirrored at entity level vs DB layer.** V11 adds unique `(user_id,course_id)` to enrollments + reviews; entities mirror the intent. Lessons/sections/questions have unique order enforced in Validators (Java) but not 100% as DB-level constraints — concurrent writes could race.
2. **certificate_code column UNIQUE via V6**, great.
3. **Completion% stored in 2 conceptual places** (Sprint-3 fix writes to Enrollment.completionPercentage; DTOs also compute it). Fine because all writes go through pipeline; but direct SQL mutation could desync.
4. **Role table vs embedded enum**: Role is @Entity with a RoleName enum column. Some code compares role as String; other places (Spring Security `hasAnyRole`) uses string matching. Normalize via RoleName in entities ensures no string drift, but SecurityConfig `hasAnyRole('instructor', 'administrator')` uses lowercase while entity RoleName is uppercase. Spring adds `ROLE_` prefix so likely requires role-name to be `ROLE_STUDENT` or configuration change. Probably fine but possible mismatch trap.
5. **Flyway V0 / V12 / V9 = noop.** Indicates original DB was imported externally (Supabase). Reconciliation needed: on a new environment without the original Supabase schema, does V0 contain the full CREATE TABLE statements? Currently not — it's only a placeholder, so the 13 subsequent ALTER-only migrations won't run cleanly against a brand new empty DB.
6. **4-level category limit enforced in code (CategoryUtils / Validator), not as a DB constraint.** Easy to violate with a rogue SQL insert.

---

## 5. Completed vs In-Progress vs TODO

Based on actual code state (not roadmap assumptions):

### COMPLETED (100% shipped, compile + backend tests compile)

1. **Sprint 1 — CRITICAL 12 items (audit):**
   - Direct Supabase adapter bypass → Spring public `/categories`, `/courses/published`, `/categories/roots` wired (old hooks.ts adapter maps kept but delete frontend folder).
   - JWT blacklist (JwtService jti + in-memory TokenBlacklistService + scheduled cleanup every 300000ms + `@EnableScheduling` + logout endpoint).
   - 6 RBAC Controllers tightened with `@PreAuthorize` method-level.
   - Flyway idempotent V11 UNIQUE enrollments/reviews `DO $$` block; V9 and V12 noop gap fillers; V0 placeholder with warning.
   - Payment + AI services scaffolded (stubs with `UnsupportedOperationException` for empty methods) so full compilation works.
   - `ProgressAndQuizAttemptsRbacTest` WebMvc slice (7 tests).
   - application.yml credential fallbacks removed (no secrets).
   - backend `.gitignore` secrets section added.
   - Validated with build exit 0 + tests compile.

2. **Sprint 2 — Validator consistency (BE-2 → BE-5):**
   - Orders / Enrollments / Quizzes / Questions modules 100% rewired to dedicated Validator Spring components.
   - Zero duplicated inline rules left in those 4 Services.
   - Bug fixes: QuizServiceImpl.getAll course/user UUID argument swap corrected (compile error fixed, used courseRepository.findByInstructorId...).
   - Enrollments added `enrollAs` admin method + `UserNotFoundException` (needed by Order auto-grant / admin granting enrollment).
   - Orders service adds `grantEnrollment(userId, courseId)` private, called when Order.status → PAID (free course creation + admin pending→paid transitions → auto enrolls student via `enrollmentService.enrollAs`).

3. **Sprint 3 — Business Pipeline (L-1 → L-3):**
   - Created **CourseCompletionPipeline @Component Single-Source-of-Truth** (public entry points `recomputeForEnrollment(enrollmentId)` + `recomputeForUserAndCourse(userId, courseId)`).
   - Pipeline steps: (a) counts completed/total lessons, writes `completionPercentage` + `lastActivityAt` to Enrollment; (b) TRIPLE check `100% lessons done + 100% completion + all published quizzes PASSED` before marking enrollment COMPLETED + `completedAt`; (c) auto-issues certificate via `certificateService.issueForCompletion` (try/catch never blocks).
   - `QuizAttemptRepository.existsPassedAttemptForUserOnQuiz` JPQL CASE query compares attempt.score ≥ COALESCE(quiz.passingScore, 0) so changing passingScore doesn't invalidate old passes.
   - `CertificateService.issueForCompletion` public method no RBAC guard + idempotent (returns existing cert if any exists per user+course).
   - LessonProgressServiceImpl + QuizAttemptServiceImpl recompute pipeline post every mutation (create/update/delete). Progress delete correctly LOWERs completion% back if admin removed a completed lesson, potentially reverting enrollment from COMPLETED → ACTIVE.
   - Enrollment state machine: active → completed only on triple condition.

4. **Sprint 4 — Frontend 20% rebuild (now deleted, but completed before cleanup):**
   - Real Student Dashboard (not placeholder), real Courses page after removing Supabase bypass.
   - 5 Instructor pages (Quizzes / Orders / Resources / Reviews / Certificates) moved from `sample*` arrays to real Spring endpoints through hooks.ts.
   - Added `useMyEnrollments`, `useMyCertificates`, `useMyProgressByCourse` TanStack Query hooks.
   - ProtectedRoutes wired + role redirects normalized.
   - Frontend build exit 0 before deletion.
   - Note: all frontend files DELETED in the irreversible backend-only task 2026-08-15 (per explicit user "a" approval). Sprint 4 code is gone. If needed it must be rewritten.

5. **Sprint 4.5 — Bug fixes + diagnostics cleanup (applied):**
   - CategoryServiceImpl L134/L143 `c.getActive()` → `c.isActive()` (lombok boolean primitive getter name mismatch error).
   - AuthController `/refresh-token` builder `accessToken`→`token`; deleted non-existent `.expiresIn()` / `.user()` + populated missing `userId/firstName/lastName/email/role` from `getCurrentUser` (AuthResponse field mismatch).
   - Maven test-compile: added `spring-boot-starter-test` test-scoped dependency (previously WebMvcTest + @MockitoBean unresolved because starter-test not present) → test-compile PASS.
   - StudentDashboard: fixed color union (indigo/emerald → violet/green), DataTable missing `getRowKey` + deleted 3 invalid props, stray backticks closing syntax removed, unused `avg` deleted, Notice error banner wiring fixed.
   - AuthContext bootstrap catch: 401-only session wipe (was wiping on any network error → blank page). Other network errors trust stored user/token → dashboard renders, API calls show Notice banners instead of blank page.
   - roleRoutes normalizeRole whitelist-check with STUDENT fallback, never throws on null/undefined/object.
   - Blank Register/Login page runtime errors fixed via runtime debug with Vite dev server + mock auth state.

6. **Sprint X — Irreversible backend-only cleanup (done 2026-08-15, explicit user approval "a"):**
   - Deleted entire frontend/ folder + root-level `package.json` (react-router-dom + @types/node only) + root-level `package-lock.json`.
   - Ambiguous items kept per default recommendations: docker-compose.yml (postgres only), .gitignore (shared), .postman/, postman/, .vscode/, README.md, .env.example, debug notes, desktop.ini.
   - `mvn clean verify -DskipTests` exit 0 after cleanup.

### IN PROGRESS (0 active right now; next planned = S5)

Nothing is mid-flight. Sprints 1-4.5 + cleanup completed cleanly (build passes, tests compile, boot PlaceholderResolutionException pre-existing due to protected-zone credential fallback removal — no fix allowed per rules).

### TODO / ROADMAP (proposed, not started)

Ordered by priority (matches earlier Sprint 5+ proposals):

1. **Sprint 5 — DB cleanup + SCAFFOLD alignment:**
   - Naming consistency: Repository folder capitalization is correct but validator/ vs validation/ folders mixed → choose one.
   - CourseValidator fill-in (currently empty class; migrate inline duplicated rules from CourseServiceImpl).
   - Flyway V0: produce real baseline DDL export that includes all 22 tables so empty new DB can run migrations start to finish.
   - Validate PlaceholderResolutionException: ensure team docs specify `DB_PASSWORD`, `JWT_SECRET`, optionally `DB_USERNAME`, `DB_URL`, `DB_SCHEMA`, `ALLOWED_ORIGINS` env vars for boot.
2. **Sprint 6 — Payment integration (Stripe/PayPal):**
   - Real `PaymentServiceImpl`, payment intent creation + callback webhook, mark order PAID → auto-grant enrollment via existing hook.
3. **Sprint 7 — AI Assistant:**
   - Real LLM integration (OpenAI/Anthropic/Gemini + API keys via env). Streaming SSE endpoints; conversation + rate limits per user.
4. **Sprint 8 — Notifications + event bus:**
   - Emit events on OrderPaid / CertificateIssued / ReviewCreated, push Notifications rows + potentially email.
5. **Sprint 9 — Pagination + large lists:**
   - Public `/api/courses/published` + `/api/categories` currently return all. Spring Pageable everywhere to scale.
6. **Sprint 10 — Frontend replacement (if ever wanted):**
   - Rebuild frontend as separate repo / new `frontend/` directory using the API contract above.
7. **Sprint 11 — Tests + observability:**
   - Service-level unit tests for OrderServiceImpl + CourseCompletionPipeline + QuizAttemptServiceImpl scoring.
   - Integration tests against testcontainers Postgres.
   - Sentry/Actuator for health endpoints.

---

## 6. Risks / Inconsistencies

| # | Risk / Inconsistency | Impact | Why it matters |
|---|----------------------|--------|----------------|
| 1 | Flyway V0 = placeholder noop → cannot bootstrap empty new Postgres without manually applying baseline schema | High | New developers + staging/prod first deploy fail. Needs an actual baseline.sql. |
| 2 | Protected zones rule (this session) REMOVED credential fallbacks → boot aborts if DB_PASSWORD / JWT_SECRET unset | High | Fails loudly by design (Sprint-1 rule). Document clearly in onboarding. |
| 3 | SecurityConfig CORS fallback carries dead Vite/CRA ports (localhost 5173/3000) | Low | Property overrides take precedence; protected backend Java code cannot be touched per cleanup contract. |
| 4 | CourseValidator empty → course business rules are scattered / duplicated inline in CourseServiceImpl | Medium | Bug class: "CourseValidator says X, Service actually does Y on updates". |
| 5 | Unique orderings (section displayOrder, quiz question displayOrder) enforced in Validators, not DB constraints | Medium | Concurrent writes can violate the unique order — needs DB-level UNIQUE(course_id, displayOrder) etc. |
| 6 | `hasAnyRole('instructor','administrator')` (lowercase) vs RoleName enum (uppercase; Spring Security ROLE_ prefix convention) | Low-Medium | Could cause silent authorization failures if Spring expects `ROLE_STUDENT` but we only store the enum value `STUDENT`. Verify in `SimpleGrantedAuthority` construction in CustomUserDetailsService. |
| 7 | Payments 100% stubbed → paid orders stuck in PENDING forever; no enrollments granted on payment callback | High (if you want paid courses) | Blocks real revenue. |
| 8 | Video storage = local disk LessonVideoStorageServiceImpl. No CDN, no lifecycle cleanup, no backup | Medium | Scaling + backups needed for production. |
| 9 | Certificates pdfUrl is nullable but no PDF generation service → currently only metadata records exist | Low-Medium | If product promise is "downloadable PDF" this is a gap. |
| 10 | QuizAttemptServiceImpl submit scoring: if quiz has no correct options (buggy content), passing logic doesn't warn | Low | Authoring guard in QuestionValidator ensures min 2 options + at least 1 correct; mitigated for new content. |
| 11 | AI module endpoints are public authenticated but no real guardrails: no token budget, no content filters, no rate limits. | Medium (if public launch) | Abuse / bill shock if LLM key is added. |
| 12 | PublicEndpoints list inside SecurityConfig. Any new public controller must be added manually. Easy to forget. | Low-Medium | Deploy-time 401 bugs. Consider `@PublicEndpoint` meta-annotation + component scan. |
| 13 | Review/Enrollment unique user+course: existing Flyway V11 is idempotent DO $$ blocks. On a DB that already HAS rows violating uniqueness (pre-migration data), this will still fail at runtime UNIQUE constraint insert. | Medium | Pre-migration data cleanup / dedupe script needed if applying V11 to a populated legacy DB. |
| 14 | TokenBlacklistService in-memory only → multi-instance deployment (2 JVMs) logs out user on A but still valid on B. | High (for horizontal scaling) | Replace with Redis or DB-backed blacklist table before multiple instances. |
| 15 | Lessons video storage path: if relative `./uploads/videos/`, moving the JAR run directory breaks video streaming. | Medium (production deployment risk) | Externalize `lesson.video.storage.path` via `application.yml` + documented env var. |
| 16 | WebMvcTest slice (ProgressAndQuizAttemptsRbacTest) Fails at ApplicationContext load because @Import SecurityConfig references JPA beans + Flyway migrations not mocked. | Medium (tests) | Build verified OK with `-DskipTests`; `mvn test` needs `@MockBean(DataSource.class)` + Flyway disabled for slice to pass. |
| 17 | Minor: Inconsistent exception class naming `*Validator vs *Validation` (sections uses SectionValidation). Also validator package: categories=courses use `validator`, rest use `validation`. Purely cosmetic. | Low | Devs hunting for file by fuzzy name may land on wrong folder. |

---

## 7. Next recommended steps (3-5 concrete, ranked)

### 1. HIGHEST PRIORITY — Resolve Flyway V0 bootstrap blocker (Sprint 5 · DB cleanup)
Take the existing 22 @Entity classes and run `org.hibernate.jpa.HibernatePersistenceProvider` in `spring.jpa.hibernate.ddl-auto=create` ONCE against a clean local Postgres to produce a fresh baseline schema SQL. Paste it into V0__baseline_schema.sql or into a new initial migration that applies before V1. Then V1 through V12 will run on an empty new DB. Otherwise, onboarding any new engineer or promoting to staging is blocked at the first boot.

### 2. HIGH — Wire real payment gateway (Stripe most standard)
All enrollment automation (completion pipeline, auto cert issuing) is ready downstream of the `order PAID → grantEnrollment` hook that Sprint 2 already added to `OrderServiceImpl`. You only need to implement real PaymentServiceImpl + webhook endpoint to flip `Order.status = PAID` (and protect the webhook with signature verification). This unlocks the revenue loop for paid courses with near-zero additional downstream work.

### 3. HIGH (if multi-instance ever) — Replace in-memory TokenBlacklist with Redis or a DB table
Single-JVM in-memory blacklist works for a demo or a single-server, but: (a) logout doesn't apply to other instances, (b) restarts wipe the blacklist, (c) tokens with long expiry can be replayed after a restart. Add a `jwt_blacklist` table with `jti + expires_at` or use `spring-boot-starter-data-redis` + `@CacheEvict(scheduled)`.

### 4. MEDIUM — Fill in CourseValidator + unique order DB constraints
- Migrate duplicated course-business-rule guards (publishing, price validation, instructor ownership check, isPublished+category required etc.) from CourseServiceImpl into the currently empty `CourseValidator`. Then run `mvn clean test-compile` regression.
- Add `ALTER TABLE sections ADD CONSTRAINT ... UNIQUE (course_id, display_order) DEFERRABLE;` (and same for questions within quiz). Or better: add them as `@Table(uniqueConstraints = ...)` on entities so they're part of the baseline and auto-apply.

### 5. MEDIUM — Optional: AI Assistant real integration
`AiConversationController` endpoints exist but service returns stubs. If you want a course-bot feature: pick a provider (default recommendation OpenAI or local Ollama fallback), add provider API key via env (no hardcoding, use `${OPENAI_API_KEY}` no fallback), wire token cost + 429 rate limiting, and add per-message conversation prepending of the relevant course's published lesson text/transcripts. Expose streaming via `SseEmitter` or Flux<ServerSentEvent>; sync responses only as fallback.

---

*End of report.*
