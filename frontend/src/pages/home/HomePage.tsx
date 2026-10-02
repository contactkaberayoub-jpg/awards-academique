import { motion } from 'framer-motion';
import { BookOpen, GraduationCap, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, type CategoryNode } from '@/api/categories';
import { useAuth } from '@/auth/AuthContext';
import { toneFor, tint } from '@/lib/tones';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { RecommendedCoursesSection } from '@/components/courses/RecommendedCoursesSection';
import { MyLearningSection } from '@/components/courses/MyLearningSection';

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  const { isAuthenticated, user } = useAuth();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0F4F48] via-[#0F766E] to-[#14B8A6]">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZG90cyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNkb3RzKSIvPjwvc3ZnPg==')] opacity-40" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="accent" size="sm" className="mb-4 border-white/20 bg-white/10 text-white">
            Plateforme d'apprentissage
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {isAuthenticated
              ? `Bienvenue, ${user?.firstName}`
              : 'Développez vos compétences'}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-teal-100 sm:text-lg">
            Des cours conçus par des experts, des parcours structurés et des
            certificats reconnus — tout ce dont vous avez besoin pour avancer.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <Link to="/courses">
            <Button size="lg" className="bg-white text-[#0F766E] shadow-lg hover:bg-white/90">
              <GraduationCap className="h-5 w-5" />
              Parcourir les cours
            </Button>
          </Link>
          {!isAuthenticated && (
            <Link to="/register">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                Créer un compte
              </Button>
            </Link>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-12 flex gap-8 text-sm text-teal-100"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Cours en ligne</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>Communauté active</span>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            <span>Certificats</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Category Card
// ---------------------------------------------------------------------------

function CategoryCard({ category, index }: { category: CategoryNode; index: number }) {
  const tone = toneFor(category.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <Link to={`/courses?category=${category.slug}`}>
        <Card variant="interactive" padded={false} className="overflow-hidden">
          <div className="h-1 w-full" style={{ backgroundColor: tone, opacity: 0.7 }} aria-hidden="true" />
          <div className="p-5">
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: tint(tone, 0.12), color: tone }}
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">{category.name}</h3>
            {category.children && category.children.length > 0 && (
              <p className="mt-1 text-xs text-text-muted">
                {category.children.length} sous-catégorie{category.children.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Categories Section
// ---------------------------------------------------------------------------

function CategoriesSection() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', 'roots'],
    queryFn: () => categoriesApi.getRoots(),
    staleTime: 60000,
  });

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-text-primary">Explorer par catégorie</h2>
        <p className="mt-1 text-sm text-text-muted">
          Trouvez le parcours qui correspond à vos objectifs
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} padded={false} className="overflow-hidden">
                <Skeleton className="h-1 w-full rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </Card>
            ))
          : (categories ?? []).map((category, index) => (
              <CategoryCard key={category.id} category={category} index={index} />
            ))}
      </div>

      {!isLoading && (categories ?? []).length === 0 && (
        <Card className="py-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-text-muted" aria-hidden="true" />
          <p className="mt-3 text-sm text-text-secondary">Aucune catégorie disponible pour le moment.</p>
        </Card>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-border bg-surface-secondary/50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-sm font-semibold text-text-primary">Awards Académique</p>
            <p className="mt-0.5 text-xs text-text-muted">Plateforme d'apprentissage en ligne</p>
          </div>
          <div className="flex gap-6 text-xs text-text-secondary">
            <Link to="/courses" className="hover:text-text-primary">Cours</Link>
            <Link to="/login" className="hover:text-text-primary">Connexion</Link>
            <Link to="/register" className="hover:text-text-primary">Inscription</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Hero />
      <CategoriesSection />
      <RecommendedCoursesSection />
      <MyLearningSection />
      <Footer />
    </div>
  );
}
