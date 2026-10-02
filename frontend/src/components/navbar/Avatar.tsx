import { useAuth } from '../../auth/AuthContext';

interface AvatarProps {
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ size = 'md' }: AvatarProps) {
  const { user } = useAuth();

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-9 w-9 text-[15px]',
    lg: 'h-10 w-10 text-base',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold`}>
      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
    </div>
  );
}
