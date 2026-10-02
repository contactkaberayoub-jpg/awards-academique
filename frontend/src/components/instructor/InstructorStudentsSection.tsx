import {
  Award,
  CheckCircle2,
  GraduationCap,
  Lock,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  instructorStudentsApi,
  type EnrollmentStatus,
  type InstructorCourseStudentDetailResponse,
  type InstructorStudentCourse,
  type InstructorStudentSummary,
  type StudentLessonProgress,
} from '@/api/instructorStudents';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Modal } from '@/components/admin/Modal';
import { Notice } from '@/components/admin/Notice';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';

interface InstructorStudentsSectionProps {
  courseId: string;
}

function enrollmentStatusVariant(status: EnrollmentStatus): 'primary' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'active':
      return 'primary';
    case 'completed':
      return 'success';
    case 'suspended':
      return 'warning';
    case 'cancelled':
      return 'error';
  }
}

function enrollmentStatusLabel(status: EnrollmentStatus): string {
  switch (status) {
    case 'active':
      return 'Actif';
    case 'completed':
      return 'Terminé';
    case 'suspended':
      return 'Suspendu';
    case 'cancelled':
      return 'Annulé';
  }
}

function finalQuizLabel(student: InstructorStudentSummary): string {
  if (!student.finalQuiz) return 'Non configuré';
  if (student.finalQuiz.passed) return 'Réussi';
  if (student.finalQuiz.attempted) return 'Échoué';
  return 'Non passé';
}

function finalQuizVariant(student: InstructorStudentSummary): 'success' | 'error' | 'info' | 'default' {
  if (!student.finalQuiz) return 'default';
  if (student.finalQuiz.passed) return 'success';
  if (student.finalQuiz.attempted) return 'error';
  return 'info';
}

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 border-t border-border pt-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">{title}</h3>
      {children}
    </div>
  );
}

function DetailInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-secondary/40 p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <div className="mt-1 text-sm font-medium text-text-primary">{value}</div>
    </div>
  );
}

function OtherCourseRow({ course }: { course: InstructorStudentCourse }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-secondary/40 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{course.courseTitle}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="default" size="sm">{course.enrollmentStatus}</Badge>
          {course.certificate && (
            <Badge variant="success" size="sm">
              <Award className="h-3 w-3" /> Certifié
            </Badge>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-text-primary">
          {Math.round(course.completionPercentage)}%
        </p>
        {course.certificate && (
          <p className="text-2xs text-text-muted">le {formatDate(course.certificate.issuedAt)}</p>
        )}
      </div>
    </li>
  );
}

function StudentDetailModal({
  student,
  courseId,
  onClose,
}: {
  student: InstructorStudentSummary;
  courseId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<InstructorCourseStudentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      setDetail((await instructorStudentsApi.getCourseStudentDetail(courseId, student.userId)).data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger le détail de l\'étudiant.'));
    } finally {
      setIsLoading(false);
    }
  }, [courseId, student.userId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  return (
    <Modal title={student.studentName} description={student.studentEmail} onClose={onClose} size="xl">
      <Notice type="error" message={errorMessage} />
      {isLoading ? (
        <Loading label="Chargement des détails de l'étudiant..." />
      ) : detail ? (
        <div>
          <div className="grid gap-3 sm:grid-cols-3">
            <DetailInfo
              label="Statut"
              value={<Badge variant={enrollmentStatusVariant(detail.enrollmentStatus)}>{enrollmentStatusLabel(detail.enrollmentStatus)}</Badge>}
            />
            <DetailInfo label="Inscrit le" value={formatDate(detail.enrolledAt)} />
            <DetailInfo label="Terminé le" value={formatDate(detail.completedAt)} />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Progression</p>
              <p className="text-sm font-semibold tabular-nums text-text-primary">
                {Math.round(detail.completionPercentage)}%
              </p>
            </div>
            <Progress
              value={detail.completionPercentage}
              color={detail.completionPercentage >= 100 ? 'success' : 'primary'}
            />
          </div>

          <ModalSection title="Examen final">
            {detail.finalQuiz ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailInfo
                  label="Statut de l'examen"
                  value={
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={detail.finalQuiz.passed ? 'success' : detail.finalQuiz.attempted ? 'error' : 'info'}>
                        {detail.finalQuiz.passed ? 'Réussi' : detail.finalQuiz.attempted ? 'Échoué' : 'Non passé'}
                      </Badge>
                      <span className="text-xs text-text-muted">{detail.finalQuiz.title}</span>
                    </div>
                  }
                />
                <DetailInfo
                  label="Note obtenue"
                  value={
                    detail.finalQuiz.score != null
                      ? `${detail.finalQuiz.score} / ${detail.finalQuiz.passingScore} (minimum)`
                      : 'Aucune tentative'
                  }
                />
                <DetailInfo label="Tentatives utilisées" value={`${detail.finalQuiz.attemptsUsed} / ${detail.finalQuiz.maxAttempts}`} />
                <DetailInfo label="Note de réussite" value={`${detail.finalQuiz.passingScore}%`} />
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Aucun examen final n'est configuré pour ce cours.</p>
            )}
          </ModalSection>

          <ModalSection title="Certificat">
            {detail.certificate ? (
              <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success-tint p-3">
                <Award className="h-5 w-5 shrink-0 text-success" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{detail.certificate.certificateCode}</p>
                  <p className="text-xs text-text-secondary">Délivré le {formatDate(detail.certificate.issuedAt)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Aucun certificat délivré pour ce cours.</p>
            )}
          </ModalSection>

          <ModalSection title={`Leçons (${detail.lessons.length})`}>
            {detail.lessons.length === 0 ? (
              <p className="text-sm text-text-secondary">Ce cours ne contient aucune leçon.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {detail.lessons.map((lesson: StudentLessonProgress) => (
                  <li key={lesson.lessonId} className="flex items-center gap-3 px-3 py-2.5">
                    {lesson.completed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : lesson.locked ? (
                      <Lock className="h-4 w-4 shrink-0 text-text-muted" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{lesson.title}</span>
                    {lesson.completed && (
                      <Badge variant="success" size="sm">Terminée</Badge>
                    )}
                    {lesson.locked && (
                      <Badge variant="default" size="sm">Verrouillée</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ModalSection>

          <ModalSection title={`Courses de cet instructeur (${detail.otherCourses.length})`}>
            {detail.otherCourses.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Cet étudiant n'est inscrit à aucun autre de vos cours.
              </p>
            ) : (
              <ul className="space-y-2">
                {detail.otherCourses.map((course) => (
                  <OtherCourseRow key={course.courseId} course={course} />
                ))}
              </ul>
            )}
          </ModalSection>
        </div>
      ) : null}
    </Modal>
  );
}

export function InstructorStudentsSection({ courseId }: InstructorStudentsSectionProps) {
  const [students, setStudents] = useState<InstructorStudentSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<InstructorStudentSummary | null>(null);

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await instructorStudentsApi.getCourseStudents(courseId);
      setStudents(response.data.students);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les étudiants.'));
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const columns: DataTableColumn<InstructorStudentSummary>[] = [
    {
      key: 'student',
      header: 'Étudiant',
      sortable: true,
      sortValue: (row) => row.studentName,
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-tint">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">{row.studentName}</p>
            <p className="truncate text-xs text-text-muted">{row.studentEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge variant={enrollmentStatusVariant(row.enrollmentStatus)}>
          {enrollmentStatusLabel(row.enrollmentStatus)}
        </Badge>
      ),
    },
    {
      key: 'progress',
      header: 'Progression',
      className: 'w-44 min-w-40',
      sortable: true,
      sortValue: (row) => row.completionPercentage,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Progress value={row.completionPercentage} size="sm" />
          <span className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary">
            {Math.round(row.completionPercentage)}%
          </span>
        </div>
      ),
    },
    {
      key: 'finalQuiz',
      header: 'Examen final',
      render: (row) => (
        <Badge variant={finalQuizVariant(row)}>{finalQuizLabel(row)}</Badge>
      ),
    },
    {
      key: 'certificate',
      header: 'Certificat',
      render: (row) =>
        row.certificate ? (
          <div className="flex items-center gap-1.5 text-success">
            <Award className="h-4 w-4" />
            <span className="text-xs font-medium">{row.certificate.certificateCode}</span>
          </div>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Users className="h-5 w-5 text-text-muted" />Étudiants
          {students && (
            <span className="text-sm font-normal text-text-muted">
              ({students.length} inscrit{students.length > 1 ? 's' : ''})
            </span>
          )}
        </h2>
      </div>

      <Notice type="error" message={errorMessage} />

      {isLoading ? (
        <Loading label="Chargement des étudiants..." />
      ) : !students || students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun étudiant inscrit à ce cours."
          description="Dès qu'un étudiant s'inscrit, il apparaîtra ici avec sa progression, son examen final et son certificat."
        />
      ) : (
        <DataTable
          columns={columns}
          data={students}
          getRowKey={(row) => row.enrollmentId}
          onRowClick={(row) => setSelectedStudent(row)}
          emptyTitle="Aucun étudiant"
          emptyDescription="Aucun étudiant inscrit à ce cours."
        />
      )}

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          courseId={courseId}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}