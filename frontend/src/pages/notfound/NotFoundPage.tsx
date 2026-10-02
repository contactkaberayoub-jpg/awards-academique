import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
      <Card variant="bordered" className="max-w-md text-center">
        <p className="text-6xl font-bold tracking-tight text-text-primary">404</p>
        <p className="mt-2 text-lg font-semibold text-text-primary">Page introuvable</p>
        <p className="mt-1 text-sm text-text-muted">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/">
            <Button variant="primary">
              <Home className="h-4 w-4" />
              Retour à l'accueil
            </Button>
          </Link>
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>
        </div>
      </Card>
    </div>
  );
}
