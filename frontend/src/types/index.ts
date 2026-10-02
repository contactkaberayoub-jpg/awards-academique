export type Role = 'ADMINISTRATOR' | 'INSTRUCTOR' | 'STUDENT';
export type InstructorStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  instructorStatus?: InstructorStatus;
  emailVerified?: boolean;
  avatar_url?: string;
  oauthProvider?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  instructorStatus?: InstructorStatus;
  emailVerified?: boolean;
  oauthProvider?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface InstructorRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  professionalTitle?: string;
  institution?: string;
  expertise?: string;
  linkedinUrl?: string;
}

export interface InstructorApplication {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: InstructorStatus;
  rejectionReason?: string | null;
  professionalTitle?: string | null;
  institution?: string | null;
  expertise?: string | null;
  linkedinUrl?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

export interface MeResponse {
  email: string;
}

// Category Types
export interface Category {
  id: string;
  parent_id?: string;
  name: string;
  slug: string;
  icon_url?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  children?: Category[];
}

// Course Types
export interface Course {
  id: string;
  instructor_id: string;
  category_id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  learning_objectives?: string[];
  level: string;
  status: string;
  is_free: boolean;
  price: number;
  currency: string;
  thumbnail_url?: string;
  promo_video_url?: string;
  duration_minutes: number;
  average_rating: number;
  reviews_count: number;
  enrollments_count: number;
  published_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  instructor?: User;
  category?: Category;
}

// Certification Provider Type
export interface CertificationProvider {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

// Certification Category Type
export interface CertificationCategory {
  id: string;
  provider_id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// Certification Type
export interface Certification {
  id: string;
  provider_id: string;
  category_id?: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail_url?: string;
  duration_hours?: number;
  difficulty?: string;
  is_active: boolean;
  created_at: string;
  provider?: CertificationProvider;
  category?: CertificationCategory;
}

// Learning Path Type
export interface LearningPath {
  id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail_url?: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

// Search Result Type
export interface SearchResult {
  type: 'course' | 'category' | 'instructor' | 'certification';
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  slug?: string;
}
