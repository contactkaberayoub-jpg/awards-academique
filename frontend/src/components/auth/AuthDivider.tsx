interface AuthDividerProps {
  label: string;
}

export function AuthDivider({ label }: AuthDividerProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
