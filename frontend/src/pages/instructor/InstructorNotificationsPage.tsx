import { Award, Bell, BookOpen, Bot, CheckCheck, CreditCard, Settings, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { notificationsApi, type NotificationResponse } from '@/api/notifications';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/formatDate';

const TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  payment: { icon: CreditCard, color: 'bg-success-tint text-success' },
  course: { icon: BookOpen, color: 'bg-primary-tint text-primary' },
  certificate: { icon: Award, color: 'bg-accent-tint text-accent' },
  ai: { icon: Bot, color: 'bg-info-tint text-info' },
  system: { icon: Settings, color: 'bg-gray-tint text-text-secondary' },
};

const DEFAULT_CONFIG = { icon: Bell, color: 'bg-gray-tint text-text-secondary' };

export default function InstructorNotificationsPage() {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: refresh,
  });

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: refresh,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<NotificationResponse[]>('/notifications/mine');
      setNotifications(response.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger vos notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  if (isLoading) {
    return <Loading label="Chargement de vos notifications..." />;
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader title="Notifications" description="Restez informé de votre activité d'enseignement." />
        <Notice type="error" message={errorMessage} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Restez informé de votre activité d'enseignement."
        action={
          unreadCount > 0 ? (
            <Button variant="soft" size="sm" onClick={() => markAllRead.mutate()} loading={markAllRead.isPending}>
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Tout marquer comme lu
            </Button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState title="Aucune notification" description="Vous êtes à jour — aucune notification pour le moment." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <ul className="divide-y divide-border">
            {notifications.map((notification) => {
              const config = TYPE_CONFIG[notification.type] ?? DEFAULT_CONFIG;
              const Icon = config.icon;
              return (
                <li
                  key={notification.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                    notification.isRead ? '' : 'bg-primary-tint/30 hover:bg-primary-tint/40'
                  } ${notification.isRead ? '' : 'cursor-pointer hover:bg-surface-secondary/60'}`}
                  role={notification.isRead ? undefined : 'button'}
                  tabIndex={notification.isRead ? undefined : 0}
                  onClick={notification.isRead ? undefined : () => markRead.mutate(notification.id)}
                  onKeyDown={
                    notification.isRead
                      ? undefined
                      : (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            markRead.mutate(notification.id);
                          }
                        }
                  }
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.color}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{notification.title}</p>
                      {!notification.isRead && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-text-secondary">{notification.content}</p>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">{formatDate(notification.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}