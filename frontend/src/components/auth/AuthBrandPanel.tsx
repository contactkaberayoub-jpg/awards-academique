import { Link } from 'react-router-dom';
import { AuthBrandMark } from './AuthBrandMark';

interface AuthBrandPanelProps {
  heading: string;
  subheading: string;
  footerPrompt: string;
  footerLinkLabel: string;
  footerLinkTo: string;
}

export function AuthBrandPanel({
  heading,
  subheading,
  footerPrompt,
  footerLinkLabel,
  footerLinkTo,
}: AuthBrandPanelProps) {
  return (
    <div className="flex h-full flex-col justify-between bg-surface-secondary p-10 sm:p-12">
      <div>
        <p className="text-2xl font-semibold text-text-primary font-heading">
          {heading}
        </p>
        <p className="mt-2 max-w-xs text-sm text-text-secondary">
          {subheading}
        </p>
      </div>

      <div className="flex items-center justify-center py-16">
        <AuthBrandMark />
      </div>

      <div className="text-sm text-text-secondary">
        {footerPrompt}{' '}
        <Link
          to={footerLinkTo}
          className="font-semibold text-text-primary underline underline-offset-2 hover:text-primary"
        >
          {footerLinkLabel}
        </Link>
      </div>
    </div>
  );
}
