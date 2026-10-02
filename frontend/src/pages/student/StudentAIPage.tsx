import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/Card';
import { Sparkles, BookOpen } from 'lucide-react';

export default function StudentAIPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8">
      <PageHeader
        title="Assistant IA"
        description="Votre tuteur intelligent est disponible dans chaque leçon pour vous accompagner."
      />
      <Card className="p-8 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-tint text-primary">
          <Sparkles className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-text-primary">Accédez au tuteur IA depuis vos leçons</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            L'assistant pédagogique intelligent est intégré directement dans le lecteur de chaque leçon pour répondre à vos questions en temps réel sur le contenu du cours.
          </p>
        </div>
        <div>
          <Link
            to="/student/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-95 transition shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Voir mes cours et commencer</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
