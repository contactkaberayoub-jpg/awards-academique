import { Bell } from 'lucide-react';

export function NotificationButton() {
  return (
    <button
      className="relative p-2 text-text-secondary hover:text-text-primary transition-all duration-200"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error"></span>
    </button>
  );
}
