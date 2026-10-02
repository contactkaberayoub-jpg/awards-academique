import apiClient from './client';
import { adminApi } from './admin';

export interface InstructorCertificate {
  id: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  studentEmail: string;
  certificateCode: string;
  fileUrl: string | null;
  issuedAt: string;
}

export interface InstructorCertificatesData {
  certificates: InstructorCertificate[];
  totalCertificates: number;
  recentCertificates: InstructorCertificate[];
}

interface CertificateResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  certificateCode: string;
  fileUrl: string | null;
  issuedAt: string;
  createdAt: string;
}

export interface StudentCertificate {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  certificateCode: string;
  fileUrl: string | null;
  issuedAt: string;
  createdAt: string;
}

export interface PublicCertificateVerification {
  valid: boolean;
  certificateCode: string | null;
  holderName: string | null;
  courseTitle: string | null;
  issuedAt: string | null;
}

export async function verifyCertificatePublic(code: string): Promise<PublicCertificateVerification> {
  const response = await apiClient.get<PublicCertificateVerification>(
    `/certificates/verify/${encodeURIComponent(code)}`,
  );
  return response.data;
}

export async function fetchMyCertificates(): Promise<StudentCertificate[]> {
  const response = await apiClient.get<CertificateResponse[]>('/certificates/mine');
  return response.data;
}

export async function findMyCertificateById(certificateId: string): Promise<StudentCertificate | null> {
  const certificates = await fetchMyCertificates();
  return certificates.find((certificate) => certificate.id === certificateId) ?? null;
}

export async function fetchInstructorCertificates(): Promise<InstructorCertificatesData> {
  const courses = await adminApi.getMyCourses();
  const courseIds = courses.data.map((c) => c.id);

  const responses = await Promise.all(
    courseIds.map((id) => apiClient.get<CertificateResponse[]>(`/certificates/course/${id}`)),
  );

  const certificates: InstructorCertificate[] = responses.flatMap((res) =>
    res.data.map((c) => ({
      id: c.id,
      courseId: c.courseId,
      courseTitle: c.courseTitle,
      studentName: c.userName,
      studentEmail: c.userEmail,
      certificateCode: c.certificateCode,
      fileUrl: c.fileUrl,
      issuedAt: c.issuedAt,
    })),
  );

  const sorted = [...certificates].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
  );

  return {
    certificates: sorted,
    totalCertificates: sorted.length,
    recentCertificates: sorted.slice(0, 3),
  };
}
