import { Link } from 'react-router-dom';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
        AA
      </div>
      <span className="text-xl font-bold text-text-primary hidden sm:block">
        Awards Académique
      </span>
    </Link>
  );
}
