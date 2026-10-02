# Rapport de projet — Awards Académique

---

## 1. Vue d'ensemble

**Stack technique :**

| Couche | Technologie | Version |
|---|---|---|
| Backend | Java 21 + Spring Boot | 4.1.0 |
| ORM | Spring Data JPA + Hibernate | — |
| Sécurité | Spring Security + JWT (jjwt 0.12.7) | — |
| Base de données | PostgreSQL | — |
| Migrations | Flyway (13 fichiers, V0–V12) | — |
| Mapping DTO | MapStruct 1.6.3 + Lombok 1.18.46 | — |
| Frontend | React 19 + Vite 7 + TypeScript 5.9 | — |
| Style | Tailwind CSS 4 | — |
| Routing | React Router 7 | — |
| Requêtes API | Axios + TanStack React Query 5 | — |
| Formulaires | React Hook Form + Zod 4 | — |
| Animations | Framer Motion 12 | — |

**Architecture :** Application monolithique séparée en deux projets indépendants (`backend/` et `frontend/`). Le backend expose une API REST sous `/api/*`. Le frontend est un SPA consommant cette API via Axios (pas de proxy Vite, CORS configuré côté Spring). Les variables d'environnement (`DATABASE_URL`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, etc.) ne sont pas hardcodées.

**Supabase :** entièrement supprimé du projet. Aucune dépendance `@supabase/supabase-js` dans `package.json`. Toutes les requêtes de données passent par le backend Spring.

---

## 2. Backend

### 2.1 Structure des packages

Le backend suit une architecture en couches par domaine. Chaque module contient : `controller/`, `service/interfaces/`, `service/impl/`, `Repository/`, `entity/`, `dto/request/`, `dto/response/`, `mapper/`, `validation/`, `utils/`, `exception/`.

| Module | Rôle | Fichiers Java |
|---|---|---|
| `authentification` | Auth (JWT), users, rôles, profils | 27 |
| `courses` | Gestion des cours (CRUD, publication, recherche) | 18 |
| `sections` | Sections de cours (chapitres) | 13 |
| `lessons` | Leçons (vidéo, texte, PDF) + upload vidéo | 17 |
| `categories` | Arbre de catégories hiérarchiques | 13 |
| `enrollments` | Inscriptions étudiant-cours | 13 |
| `progress` | Suivi de progression leçon/cours | 14 |
| `quizzes` | Quiz de cours (questions + options) | 16 |
| `quizattempts` | Tentatives de quiz par étudiant | — |
| `questions` | Questions et options de quiz | 16 |
| `reviews` | Avis étudiant sur les cours | 13 |
| `certificates` | Certificats de complétion | 12 |
| `payments` | Paiements (commandes, statuts) | 14 |
| `orders` | Commandes d'achat | — |
| `notifications` | Notifications (in-app) | 13 |
| `resources` | Pièces jointes aux leçons | 15 |
| `ai` | Conversations IA (chatbot éducatif) | 15 |
| `common` | RBAC, config, pipeline de complétion | 4 |

**Total : ~150 fichiers Java.**

### 2.2 Entités / Modèles

| Entité | Table (hypothétique) | Relations clés |
|---|---|---|
| `User` | `users` | → Role (ManyToMany) |
| `Role` | `roles` | 3 rôles : STUDENT, INSTRUCTOR, ADMINISTRATOR |
| `Category` | `categories` | → Self (parentId, arbre hiérarchique) |
| `Course` | `courses` | → User (instructor), → Category |
| `Section` | `sections` | → Course |
| `Lesson` | `lessons` | → Section |
| `LessonResource` | `lesson_resources` | → Lesson |
| `Enrollment` | `enrollments` | → User, → Course (unique user_id+course_id) |
| `LessonProgress` | `lesson_progress` | → Enrollment, → Lesson |
| `Quiz` | `quizzes` | → Course |
| `Question` | `questions` | → Quiz |
| `QuestionOption` | `question_options` | → Question |
| `QuizAttempt` | `quiz_attempts` | → User, → Quiz |
| `Review` | `reviews` | → User, → Course (unique user_id+course_id) |
| `Certificate` | `certificates` | → User, → Course |
| `Payment` | `payments` | → Order |
| `Order` | `orders` | → User, → Course |
| `Notification` | `notifications` | → User |
| `AiConversation` | `ai_conversations` | → User |
| `AiMessage` | `ai_messages` | → AiConversation |

### 2.3 Endpoints API

**Auth (`/api/auth`) :**

| Méthode | Chemin | But |
|---|---|---|
| POST | `/api/auth/register` | Inscription (→ 201) |
| POST | `/api/auth/login` | Connexion (→ 200 + JWT) |
| GET | `/api/auth/me` | Profil utilisateur courant |
| PUT | `/api/auth/profile` | Mise à jour du profil |
| POST | `/api/auth/change-password` | Changement de mot de passe |
| POST | `/api/auth/logout` | Déconnexion (blacklist JWT) |
| POST | `/api/auth/refresh-token` | Renouvellement du token |
| POST | `/api/auth/forgot-password` | Demande de réinitialisation |
| POST | `/api/auth/reset-password` | Réinitialisation du mot de passe |

**Users (`/api/users`) :**

| Méthode | Chemin | But |
|---|---|---|
| GET | `/api/users/search` | Recherche publique (q + role) |

**Courses (`/api/courses`) :**

| Méthode | Chemin | But |
|---|---|---|
| POST | `/api/courses` | Créer un cours |
| GET | `/api/courses` | Lister tous les cours (admin) |
| GET | `/api/courses/mine` | Cours de l'instructeur connecté |
| GET | `/api/courses/published` | Cours publiés (public) |
| GET | `/api/courses/search` | Recherche paginée (public) |
| GET | `/api/courses/{id}` | Détail d'un cours |
| PUT | `/api/courses/{id}` | Modifier un cours |
| POST | `/api/courses/{id}/publish` | Publier un cours |
| POST | `/api/courses/{id}/reject` | Rejeter un cours |
| POST | `/api/courses/{id}/archive` | Archiver un cours |
| POST | `/api/courses/{id}/restore` | Restaurer un cours |
| DELETE | `/api/courses/{id}` | Supprimer un cours |

**Sections (`/api/sections`) :**

| Méthode | Chemin | But |
|---|---|---|
| POST | `/api/sections` | Créer une section |
| GET | `/api/sections/{id}` | Détail |
| GET | `/api/sections/course/{courseId}` | Sections d'un cours |
| PUT | `/api/sections/{id}` | Modifier |
| DELETE | `/api/sections/{id}` | Supprimer |

**Lessons (`/api/lessons`) :**

| Méthode | Chemin | But |
|---|---|---|
| GET | `/api/lessons` | Lister les leçons |
| GET | `/api/lessons/page` | Liste paginée |
| GET | `/api/lessons/{id}` | Détail |
| GET | `/api/lessons/videos/{filename}` | Servir une vidéo |
| GET | `/api/sections/{sectionId}/lessons` | Leçons d'une section |
| POST | `/api/sections/{sectionId}/lessons` | Créer une leçon |
| PUT | `/api/lessons/{id}` | Modifier |
| POST | `/api/lessons/{id}/video` | Upload vidéo (multipart) |
| PUT | `/api/lessons/{id}/video` | Remplacer une vidéo |
| DELETE | `/api/lessons/{id}/video` | Supprimer une vidéo |
| DELETE | `/api/lessons/{id}` | Supprimer une leçon |

**Categories (`/api/categories`) :**

| Méthode | Chemin | But |
|---|---|---|
| POST | `/api/categories` | Créer (admin) |
| GET | `/api/categories` | Toutes les catégories (public) |
| GET | `/api/categories/roots` | Catégories racines (public) |
| GET | `/api/categories/{id}` | Détail |
| GET | `/api/categories/{parentId}/subcategories` | Sous-catégories |
| PUT | `/api/categories/{id}` | Modifier |
| DELETE | `/api/categories/{id}` | Supprimer |

**Enrollments (`/api/enrollments`) :** CRUD + `/mine` (inscriptions de l'étudiant), `/course/{id}` (étudiants d'un cours).

**Progress (`/api/progress`) :** Suivi de progression (leçon démarrée/complétée), progression par cours.

**Quizzes (`/api/quizzes`) :** CRUD + publish/archive + `/course/{id}` (quiz d'un cours).

**Quiz Attempts (`/api/quiz-attempts`) :** CRUD + `/me` (mes tentatives) + `/me/quizzes/{id}` (meilleur score).

**Questions (`/api/questions) :** CRUD pour questions et options de quiz.

**Reviews (`/api/reviews`) :** CRUD + `/mine` + `/course/{id}`.

**Certificates (`/api/certificates`) :** CRUD + `/mine` + `/course/{id}` + `/verify/{code}` + `/issue`.

**Payments (`/api/payments`) :** CRUD + `/mine`.

**Orders (`/api/orders) :** CRUD + `/mine` + `/course/{id}`.

**Notifications (`/api/notifications) :** CRUD + `/mine` + `/unread-count` + `/read-all`.

**Resources (`/api/lesson-resources) :** CRUD + upload multipart + `/lesson/{id}` + `/course/{id}` (agrégé) + `/files/{filename}`.

**AI (`/api/ai) :** Conversations IA + messages.

### 2.4 Sécurité / Auth

- **JWT** : token signé avec `JWT_SECRET` (env var), expiration 1h par défaut. Le `JwtAuthenticationFilter` intercepte chaque requête, vérifie le token, et injecte l'authentification Spring Security.
- **Token blacklisting** : `TokenBlacklistService` permet de révoquer les tokens (logout).
- **Endpoints publics** (pas de token requis) : `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/courses/published`, tout `GET /api/categories/*`, `GET /api/courses/{uuid}`, `GET /api/users/search`.
- **RBAC** : les contrôleurs utilisent `@PreAuthorize("hasAnyRole('instructor', 'administrator')")` ou `@PreAuthorize("hasRole('administrator')")`. Un service `AuthorizationService` et un `CurrentUserProvider` dans le module `common` fournissent la logique de vérification.
- **Rôles** : `STUDENT`, `INSTRUCTOR`, `ADMINISTRATOR` (enum `RoleName` en minuscules dans la DB, uppercased côté frontend via `normalizeRole()`).
- **BCrypt** pour le hashage des mots de passe.

### 2.5 Bugs connus / Dette technique

- **V0 n'est pas un vrai baseline** : le fichier `V0__baseline_schema_export_placeholder.sql` contient uniquement un commentaire et un `RAISE NOTICE`. Les 20+ `CREATE TABLE` originaux vivent dans la console Supabase et ne sont pas versionnés. Toute migration `V1..V12` utilise uniquement `ALTER` sur un schéma pré-existant. Impossible de recréer la base depuis zéro avec Flyway.
- **`LessonController` utilise des paths complets** (`/api/lessons`) au lieu de chemins relatifs, ce qui crée potentiellement des doublons avec le contexte de l'application.
- **Test unitaire unique** : `ProgressAndQuizAttemptsRbacTest.java` est le seul fichier de test. Pas de tests d'intégration, pas de tests de contrôleur, pas de tests de service.
- **`@Transactional` sur certains services** mais pas tous — risque de LazyInitializationException sur les relations `LAZY` (corrigré pour `ReviewRepository` via `@EntityGraph` mais pas systématique).
- **Pas de gestion centralisée des erreurs** au-delà du `GlobalExceptionHandler` partiel (certains modules ont leur propre `Global*ExceptionHandler`, d'autres non).
- **Pas de rate limiting** sur les endpoints publics.
- **Pas de documentation API** (Swagger/OpenAPI non configuré).
- **Le module `quizattempts` n'a pas de `QuizAttemptService` ni `QuizAttemptController`** visible dans la liste globale — il existe dans les fichiers mais la structure peut être incomplète.

---

## 3. Frontend

### 3.1 Pages et routes

| Route | Composant | Source de données |
|---|---|---|
| `/` | `HomePage` | Backend (`getPublishedCourses`, `categoriesApi.getRoots`) |
| `/courses` | `CoursesCatalogPage` | Backend (`adminApi.searchCourses`, `categoriesApi.getAll`) |
| `/login` | `LoginPage` | Backend (`authApi.login`) |
| `/register` | `RegisterPage` | Backend (`authApi.register`) |
| `/student` | `StudentDashboard` | Backend (`adminApi.getPublishedCourses`, `enrollmentsApi`, `progressApi`) |
| `/instructor` | `InstructorDashboard` | Backend (`instructorApi.getDashboardData`) |
| `/instructor/courses` | `InstructorCoursesPage` | Backend (`adminApi.getMyCourses`) |
| `/instructor/sections` | `InstructorSectionsPage` | Backend (`instructorApi`) |
| `/instructor/lessons` | `InstructorLessonsPage` | Backend (`instructorApi`) |
| `/instructor/students` | `InstructorStudentsPage` | Backend (`instructorApi`) |
| `/instructor/analytics` | `InstructorAnalyticsPage` | Backend (`instructorApi`) |
| `/instructor/quizzes` | `InstructorQuizzesPage` | Backend (`quizzesApi.getByCourse`) |
| `/instructor/resources` | `InstructorResourcesPage` | Backend (`resourcesApi.getByCourse`) |
| `/instructor/orders` | `InstructorOrdersPage` | Backend (`ordersApi.getByCourse`) |
| `/instructor/reviews` | `InstructorReviewsPage` | Backend (`reviewsApi.getByCourse`) |
| `/instructor/certificates` | `InstructorCertificatesPage` | Backend (`certificatesApi.getByCourse`) |
| `/instructor/profile` | `InstructorProfilePage` | Backend (API profil) |
| `/instructor/notifications` | `InstructorNotificationsPage` | Backend (`GET /api/notifications/mine`) |
| `/admin` | `AdminDashboard` | Backend (`adminApi.getDashboardData`) |
| `/admin/categories` | `CategoriesPage` | Backend (`categoriesApi`, `adminApi`) |
| `/admin/courses` | `CoursesPage` | Backend (`adminApi`) |
| `/admin/sections` | `SectionsPage` | Backend (`adminApi`) |
| `/admin/lessons` | `LessonsPage` | Backend (`adminApi`) |
| `*` (404) | `NotFoundPage` | Aucune (composant statique) |

**Toutes les pages utilisent le backend Spring.** Aucune n'utilise Supabase directement ou des données stub/factices.

### 3.2 Arborescence des composants

- **`components/ui/` (22 fichiers + 3 graphiques)** — Primitives génériques : `Button`, `Card`, `Badge`, `Avatar`, `Skeleton`, `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`, `Tabs`, `Pagination`, `Dialog`, `Alert`, `Progress`, `KpiCard`, `MilestonePath`, `Breadcrumbs`, charts (`AreaChart`, `BarChart`, `DonutChart`).
- **`components/admin/` (10 fichiers)** — Widgets CRUD : `DataTable`, `Modal`, `DeleteModal`, `EmptyState`, `Loading`, `Notice`, `PageHeader`, `FormInput`, `FormSelect`, `SearchInput`.
- **`components/auth/` (12 fichiers)** — Composants de formulaire d'authentification : `AuthCard`, `AuthBrandPanel`, `FormField`, `PasswordField`, `Checkbox`, `SubmitButton`, `APIError`, `AuthDivider`, `SocialButtons`, etc.
- **`components/navbar/` (16 fichiers)** — Navigation complète : `RoleBasedNavbar`, `PublicNavbar`, `AdminNavbar`, `InstructorNavbar`, `MegaMenu`, `SearchBar`, `ProfileDropdown`, `NotificationButton`, menus mobile/desktop.
- **`components/shell/` (6 fichiers)** — `AppShell`, `AppSidebar`, `Topbar`, `ThemeToggle`, `breadcrumbs`, `navigation`.
- **`components/instructor/` (1 fichier)** — `StatCard`.
- **`components/layout/` (1 fichier)** — `DashboardHeader`.

### 3.3 Gestion d'état

- **React Context** : `AuthContext` (utilisateur, token, login/logout/register).
- **TanStack React Query** : requêtes API avec cache, staleTime, refetch. Utilisé dans `HomePage`, `CoursesCatalogPage`, `StudentDashboard`, toutes les pages instructor, toutes les pages admin.
- **React Hook Form + Zod** : formulaires d'authentification et de profil.
- **URL state** : `useSearchParams` pour les filtres de `CoursesCatalogPage`.
- **Pas de state management global** (Redux, Zustand) — suffisant pour cette taille de projet.

### 3.4 Approche de style

- **Tailwind CSS 4** avec des tokens custom : `bg-surface`, `bg-surface-secondary`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, `border-border`, `border-border-strong`.
- **Système de tons** (`lib/tones.ts`) : `toneFor(seed)` génère une couleur déterministe à partir d'une chaîne, `tint(hex, alpha)` crée des fonds transparents, `toneStyles()` applique les couleurs en inline-style.
- **Palette** : 6 teintes milestone (bleu, teal, ambre, violet, rose, ardoise) + couleurs statut (draft, pending, rejected, published, archived).
- **Framer Motion** pour les animations d'entrée sur les cartes et sections.
- **Responsive** : grilles `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, menu mobile, sidebar responsive.

---

## 4. Base de données

### 4.1 Tables (basé sur les entités JPA)

| Table | Entité | Description |
|---|---|---|
| `users` | `User` | Utilisateurs (email, password, firstName, lastName, avatarUrl) |
| `roles` | `Role` | Rôles (STUDENT, INSTRUCTOR, ADMINISTRATOR) |
| `users_roles` | `User ↔ Role` | Table de jonction ManyToMany |
| `categories` | `Category` | Catégories hiérarchiques (parentId auto-référent) |
| `courses` | `Courses` | Cours (titre, description, level, status, prix, thumbnail) |
| `sections` | `Section` | Sections/chapitres d'un cours |
| `lessons` | `Lesson` | Leçons (type: video/text/pdf, statut, durée) |
| `lesson_resources` | `LessonResource` | Pièces jointes aux leçons (type, URL, taille) |
| `enrollments` | `Enrollment` | Inscriptions étudiant-cours (statut, dates) |
| `lesson_progress` | `LessonProgress` | Progression par leçon (started, completed) |
| `quizzes` | `Quiz` | Quiz liés à un cours (statut) |
| `questions` | `Question` | Questions de quiz |
| `question_options` | `QuestionOption` | Options de réponse |
| `quiz_attempts` | `QuizAttempt` | Tentatives de quiz (score, statut) |
| `reviews` | `Review` | Avis étudiant (rating, commentaire, statut) |
| `certificates` | `Certificate` | Certificats (code unique, url) |
| `payments` | `Payment` | Paiements (montant, méthode, statut) |
| `orders` | `Order` | Commandes (statut) |
| `notifications` | `Notification` | Notifications in-app (type, lue/non-lue) |
| `ai_conversations` | `AiConversation` | Conversations IA |
| `ai_messages` | `AiMessage` | Messages IA (sender: USER/ASSISTANT) |

### 4.2 Relations clés

- **User ↔ Course** : via `Enrollment` (ManyToMany with extra fields) + `Review` (un par user/course) + `Certificate`.
- **Course → Category** : ManyToOne.
- **Course → User** (instructor) : ManyToOne.
- **Section → Course** : ManyToOne.
- **Lesson → Section** : ManyToOne.
- **Quiz → Course** : ManyToOne.
- **Question → Quiz** : ManyToOne.
- **Enrollment → User + Course** : ManyToOne + contrainte unique `(user_id, course_id)`.
- **Review → User + Course** : ManyToOne + contrainte unique `(user_id, course_id)`.
- **LessonProgress → Enrollment + Lesson** : ManyToOne.

### 4.3 Particularités du schéma

- **Blocage Flyway V0** : le schéma initial n'est pas versionné. Les 20+ tables ont été créées dans Supabase et les migrations V1–V12 ne contiennent que des `ALTER`. impossible de recréer la base depuis zéro. C'est le dette technique la plus critique du projet.
- **Contraintes uniques** : `enrollments_user_id_course_id_unq` et `reviews_user_id_course_id_unq` ajoutées en V11.
- **Enums PostgreSQL** : les statuts (course_status, lesson_status, etc.) sont stockés comme des chaînes ou des enums native selon les tables.
- **Soft delete** : `deletedAt` sur certaines entités (Category, etc.) mais pas systématique.

---

## 5. État d'avancement

### Terminé

- Backend complet : 14 modules domaines, API REST fonctionnelle, JWT auth, RBAC.
- Frontend : 24 pages, 66 composants, navigation complète (public + admin + instructor + student).
- Auth : login, register, logout, profils, change-password, forgot/reset-password.
- Catalogue de cours : page `/courses` avec filtres, pagination, recherche.
- HomePage : hero, catégories, cours populaires.
- Pages admin : dashboard, catégories (CRUD + activate/deactivate), cours, sections, leçons.
- Pages instructor : dashboard, cours, sections, leçons, étudiants, analytics, quiz, resources, orders, reviews, certificates, profil, notifications.
- Pages student : dashboard avec inscription et progression.
- Navigation : mega menu, navbar par rôle, menu mobile, search bar.
- Migrated de Supabase vers le backend Spring (toutes les données publiques et instructor).
- Système de tons/couleurs déterministe.
- Composants UI : librairie complète (Button, Card, Badge, Skeleton, charts, etc.).

### En cours / Partiellement terminé

- **Quiz** : backend complet, frontend instructor affiche les quiz mais pas de page de passation étudiant.
- **Progress** : backend complet, frontend student dashboard affiche la progression mais pas de détail leçon par leçon.
- **Resources** : backend avec upload, frontend instructor liste les resources mais pas d'upload UI.
- **Notifications** : backend CRUD, frontend instructor affiche les notifications mais pas de système de création/trigger côté backend (les notifications doivent être générées par d'autres services).

### À faire

- **Page de passation de quiz** côté étudiant (commencer, répondre, soumettre, voir les résultats).
- **Upload de resources** côté instructor (UI multipart).
- **V0 baseline** : exporter le schéma complet depuis Supabase et remplacer le placeholder.
- **Tests** : couverture quasi inexistante (1 fichier de test).
- **Documentation API** : Swagger/OpenAPI.
- **Gestion des erreurs** : `GlobalExceptionHandler` centralisé et complet.
- **Rate limiting** et protection anti-abus.
- **Page profil étudiant** (route `/student/profile`).
- **Page de détail d'un cours** (route `/courses/:id` avec description complète, inscription, leçons).
- **Système de recherche avancée** (filtres multiples, tri, autocomplete).
- **Notifications push** ou email.
- **Payment intégration** réelle (Stripe, etc.).

---

## 6. Risques / Incohérences

| Risque | Sévérité | Description |
|---|---|---|
| **V0 Flyway vide** | 🔴 Critique | Impossible de recréer la DB from scratch. Toute migration future risque de casser si le schéma Supabase évolue sans同步 avec le repo. |
| **Tests quasi absents** | 🔴 Critique | 1 seul fichier de test. Aucune garantie de non-régression. Le RBAC n'est pas testé de bout en bout. |
| **Login/register blank page** | 🟠 Élevé | Après un login/register réussi, l'app reste sur `/login` ou `/register` avec une page blanche. Le code de navigation existe (`navigate(destination)`) mais quelque chose empêche l'exécution. Possible que l'API backend ne soit pas joignable (port 8080), que la réponse ait un format inattendu, ou que la navigation vers le dashboard route un composant qui crash silencieusement. |
| **Pas de page de détail cours** | 🟠 Élevé | `/courses/:id` n'existe pas. L'inscription à un cours est impossible depuis le frontend. |
| **Quiz pas fonctionnel côté étudiant** | 🟡 Moyen | Le backend expose les quiz mais il n'y a pas de UI pour les passer. |
| **Doublons de paths LessonController** | 🟡 Moyen | Les mappings utilisent `/api/lessons` (chemin absolu) au lieu de relatifs, risquant des conflits avec le contexte racine. |
| **RBAC pas systématique** | 🟡 Moyen | Certains contrôleurs utilisent `@PreAuthorize`, d'autres non. La sécurité dépend de la vigilance du développeur. |
| **Pas de documentation API** | 🟡 Moyen | Pas de Swagger. Difficile pour les nouveaux développeurs de comprendre le contrat API. |
| **Pas de rate limiting** | 🟡 Moyen | Les endpoints publics (login, register, search) sont exposés sans limitation de débit. |
| **Soft delete incohérent** | 🟢 Faible | Seules certaines entités (Category) utilisent `deletedAt`. Pas de pattern unifié. |

---

## 7. Prochaines étapes recommandées

1. **🔴 Corriger le bug de redirection post-login** — Diagnostiquer pourquoi `navigate()` ne s'exécute pas après un login réussi. Vérifier la console navigateur (erreurs JS), l'onglet Network (réponse du backend), et le comportement de `persistSession` + `resolvePostLoginDestination`.

2. **🔴 Exporter le schéma V0** — Depuis la console Supabase, exporter le DDL complet et le placer dans `V0__baseline_schema_export.sql`. C'est un préreque pour toute évolution du schéma sans risque de casser la base existante.

3. **🔴 Ajouter des tests** — Minimum : tests d'intégration pour les endpoints critiques (auth, courses CRUD, enrollments, quiz attempts), tests RBAC pour chaque rôle, tests de contrôleur avec MockMvc.

4. **🟠 Construire la page détail cours** (`/courses/:id`) — Afficher la description complète, les objectifs pédagogiques, la liste des sections/leçons, le bouton d'inscription. C'est le funnel principal de conversion étudiant.

5. **🟠 Implémenter la passation de quiz côté étudiant** — Page de quiz avec timer, soumission, et affichage des résultats. Le backend est prêt, il manque le frontend.
