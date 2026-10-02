export function AuthBrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-surface-dark text-lg font-bold text-text-inverse">
        AA
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-accent bg-accent/10">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2.5 14.35 8l6.05.5-4.6 3.98 1.4 5.87L12 15.4l-5.2 2.95 1.4-5.87L3.6 8.5l6.05-.5L12 2.5Z"
            stroke="var(--color-accent)"
            strokeWidth="1.6"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
