import { useEffect, useState } from 'react';
import { motion, useReducedMotion, useMotionValue } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Users, CheckCircle2, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/Button';

/* =============================================================
   DESIGN TOKENS
   Reference: Hobro Digital (Awwwards SOTD) — strict 2-color
   palette (#000000 / #ffffff), alternating full black/white
   sections, oversized type, GSAP-style line reveals.
   Typography reference: santionispirits.com — a tall, condensed,
   high-contrast Didone serif (Bodoni Moda) used uppercase for
   both big display headlines and small tracked caption labels,
   with the same serif family (regular weight) for body copy.
   We keep exactly ONE accent — your existing brand blue — used
   sparingly so the page still reads as Awards Académique, not a
   generic agency site.
   ============================================================= */
// Ink      #0A0A0A  → black sections
// Paper    #FFFFFF  → white sections
// Accent   #1A73E8  → existing brand blue (unchanged, used sparingly)
// Hover    #1765CC  → existing brand blue hover (unchanged)

/* Condensed-width variation settings for big display headlines only
   (Bodoni Moda variable font — see theme.css). Small titles/labels and
   body copy use plain PT Serif (font-heading / font-body classes),
   no variation axes needed. */
const DISPLAY_STYLE: React.CSSProperties = {
  fontVariationSettings: "'wdth' 70, 'opsz' 96, 'wght' 800",
  letterSpacing: '-0.01em',
};

/* =============================================================
   SIGNATURE ELEMENT 1 — Scroll progress rail (monochrome)
   ============================================================= */

const SECTIONS = [
  { id: 'hero', label: 'Découvrir' },
  { id: 'pourquoi', label: 'Pourquoi' },
  { id: 'comment', label: 'Parcours' },
  { id: 'mission', label: 'Mission' },
  { id: 'cta', label: 'Commencer' },
];

function SectionRail() {
  const [active, setActive] = useState('hero');
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const handler = () => {
      const threshold = window.innerHeight * 0.4;
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= threshold) {
          current = s.id;
        }
      }
      setActive(current);
      const el = document.getElementById(current);
      setDark(el?.dataset.theme !== 'light');
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const fg = dark ? 'text-white' : 'text-[#0A0A0A]';
  const dim = dark ? 'text-white/40' : 'text-black/35';
  const dotOn = dark ? 'bg-white' : 'bg-[#0A0A0A]';
  const dotOff = dark ? 'bg-white/25 group-hover:bg-white/60' : 'bg-black/20 group-hover:bg-black/50';

  return (
    <div className="hidden lg:flex fixed right-6 top-1/2 z-40 -translate-y-1/2 flex-col items-end gap-4">
      {SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <a key={s.id} href={`#${s.id}`} className="group flex items-center gap-3">
            <span
              className={`font-heading text-[10px] uppercase tracking-[0.18em] transition-all duration-300 ${
                isActive ? `translate-x-0 opacity-100 ${fg}` : `translate-x-2 opacity-0 ${dim} group-hover:translate-x-0 group-hover:opacity-100`
              }`}
            >
              {s.label}
            </span>
            <span className={`rounded-full transition-all duration-300 ${isActive ? `h-2.5 w-2.5 ${dotOn}` : `h-1.5 w-1.5 ${dotOff}`}`} />
          </a>
        );
      })}
    </div>
  );
}

/* =============================================================
   SIGNATURE ELEMENT 2 — Rotating certification seal (monochrome
   ring, single blue accent dot in the center)
   ============================================================= */

function CertBadge({ size = 112, tone = 'dark' }: { size?: number; tone?: 'dark' | 'light' }) {
  const shouldReduceMotion = useReducedMotion();
  const r = size / 2;
  const textRadius = r - 13;
  const label = 'AWARDS ACADÉMIQUE • CERTIFIÉ • ';
  const pathId = `cert-seal-path-${tone}`;
  const ringColor = tone === 'dark' ? '#FFFFFF' : '#0A0A0A';

  return (
    <motion.div
      animate={shouldReduceMotion ? {} : { rotate: 360 }}
      transition={shouldReduceMotion ? {} : { duration: 22, repeat: Infinity, ease: 'linear' }}
      style={{ width: size, height: size }}
      className="relative flex-shrink-0"
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <path
            id={pathId}
            d={`M ${r},${r} m -${textRadius},0 a ${textRadius},${textRadius} 0 1,1 ${textRadius * 2},0 a ${textRadius},${textRadius} 0 1,1 -${textRadius * 2},0`}
          />
        </defs>
        <circle cx={r} cy={r} r={r - 1} fill="none" stroke={ringColor} strokeWidth="1" opacity="0.4" />
        <text fontSize="7.6" letterSpacing="1.5" fill={ringColor} fontWeight={600} opacity="0.85">
          <textPath href={`#${pathId}`}>{label.repeat(2)}</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffba9c] text-white shadow-lg">
          <GraduationCap className="h-4.5 w-4.5" />
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- shared: line-reveal heading ---------- */

function RevealLines({
  lines,
  className,
  delayStart = 0,
  display = true,
}: {
  lines: string[];
  className?: string;
  delayStart?: number;
  display?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden">
          <motion.span
            initial={{ y: shouldReduceMotion ? 0 : '100%', opacity: shouldReduceMotion ? 1 : 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: shouldReduceMotion ? 0 : delayStart + i * 0.08, ease: [0.25, 1, 0.5, 1] as const }}
            style={display ? DISPLAY_STYLE : undefined}
            className={`block ${className ?? ''}`}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </>
  );
}

/* ---------- Hero (video background) ---------- */

function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const { isAuthenticated } = useAuth();
  const xVal = useMotionValue(0);
  const yVal = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || window.innerWidth < 1024) return;
    const rect = e.currentTarget.getBoundingClientRect();
    xVal.set((e.clientX - (rect.left + rect.width / 2)) / 60);
    yVal.set((e.clientY - (rect.top + rect.height / 2)) / 60);
  };
  const handleMouseLeave = () => {
    xVal.set(0);
    yVal.set(0);
  };

  const stats = [
    { value: '120+', label: 'Parcours certifiants' },
    { value: '15k', label: 'Apprenants actifs' },
    { value: '98%', label: 'Taux de satisfaction' },
  ];

  return (
    <section
      id="hero"
      data-theme="dark"
      className="relative flex min-h-screen items-end overflow-hidden bg-[#0A0A0A] text-white"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video background — drop your file at public/video/hero.mp4.
          Silently falls back to a plain black backdrop if missing. */}
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/img/hero-poster.jpg"
        onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; }}
        className="absolute inset-0 h-full w-full object-cover opacity-70"
      >
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-[#0A0A0A]/30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(26,115,232,0.12),transparent_45%)]" />

      <motion.div
        style={{ x: xVal, y: yVal }}
        className="relative mx-auto w-full max-w-[1560px] px-6 pb-20 pt-40 lg:px-16 lg:pb-24 lg:pt-48"
      >
        <motion.span
          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-heading mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/60"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#1ad0e8]" />
          Plateforme e-learning nouvelle génération
        </motion.span>

        <h1 className="max-w-4xl font-display uppercase font-black leading-[0.92] tracking-tight text-[2.6rem] sm:text-6xl lg:text-[5.2rem] xl:text-[6rem]">
          <RevealLines
            lines={['Des compétences', 'qui comptent,']}
            delayStart={0.1}
          />
          <RevealLines
            lines={['des certifications']}
            className="text-white"
            delayStart={0.28}
          />
          <span className="block overflow-hidden">
            <motion.span
              initial={{ y: shouldReduceMotion ? 0 : '100%', opacity: shouldReduceMotion ? 1 : 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: shouldReduceMotion ? 0 : 0.36, ease: [0.25, 1, 0.5, 1] as const }}
              style={DISPLAY_STYLE}
              className="block text-[#1A73E8]"
            >
              qui s'affichent.
            </motion.span>
          </span>
        </h1>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <motion.p
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: shouldReduceMotion ? 0 : 0.55 }}
            className="font-body max-w-md text-justify text-base leading-relaxed text-white/65 lg:text-lg"
          >
            Rejoignez une communauté d'apprenants qui transforment leur parcours en qualifications
            reconnues. Des parcours conçus par des experts, des certificats numériques à partager et
            un accompagnement sur mesure.
          </motion.p>

          <motion.div
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.7 }}
            className="flex flex-shrink-0 flex-wrap items-center gap-4"
          >
            <Link to="/courses">
              <Button
                size="lg"
                className="group font-heading uppercase tracking-[0.08em] bg-white text-[#0A0A0A] shadow-xl transition-colors hover:bg-[#1A73E8] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex items-center gap-2">
                  Découvrir les cours
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>
            {!isAuthenticated && (
              <Link to="/register">
                <Button
                  size="lg"
                  className="font-heading uppercase tracking-[0.08em] border border-white/40 text-white hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Créer un compte
                </Button>
              </Link>
            )}
            <Link to="/become-instructor">
              <Button
                size="lg"
                variant="outline"
                className="font-heading uppercase tracking-[0.08em] border border-white/40 text-white hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Devenir formateur
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: shouldReduceMotion ? 0 : 0.95 }}
          className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-white/15 pt-6"
        >
          {stats.map((s) => (
            <div key={s.label}>
              <div style={DISPLAY_STYLE} className="font-display text-2xl font-bold text-white">{s.value}</div>
              <div className="font-heading text-xs uppercase tracking-[0.1em] text-white/45">{s.label}</div>
            </div>
          ))}
          <div className="ml-auto hidden sm:block">
            <CertBadge size={84} tone="dark" />
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: shouldReduceMotion ? 0 : 1 }}
        transition={{ delay: 1.3, duration: 0.6 }}
        className="absolute right-8 top-10 hidden flex-col items-center gap-2 text-white/50 lg:flex"
      >
        <span className="font-heading text-[10px] uppercase tracking-[0.2em]">Défiler</span>
        <motion.span
          animate={shouldReduceMotion ? {} : { y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="h-8 w-px bg-white/50"
        />
      </motion.div>
    </section>
  );
}

/* ---------- Pourquoi section — white, hover-invert rows ---------- */

function PourquoiSection() {
  const items = [
    {
      Icon: BookOpen,
      title: 'Apprentissage pratique',
      desc: 'Des parcours concrets, réalisés par des experts du terrain, immédiatement applicables.',
      image: '/img/why-practice.jpg',
    },
    {
      Icon: GraduationCap,
      title: 'Certificats reconnus',
      desc: 'Validez vos compétences avec des certificats numériques partageables sur LinkedIn et votre CV.',
      image: '/img/why-certificates.jpg',
    },
    {
      Icon: Users,
      title: 'Accompagnement personnalisé',
      desc: 'Un suivi tout au long du parcours, des tuteurs disponibles et une communauté active.',
      image: '/img/why-mentoring.jpg',
    },
    {
      Icon: CheckCircle2,
      title: 'Communauté engagée',
      desc: "Échangez avec d'autres apprenants, posez vos questions et progressez ensemble.",
      image: '/img/why-community.jpg',
    },
  ];

  return (
    <section id="pourquoi" data-theme="light" className="relative bg-white px-6 py-24 text-[#0A0A0A] lg:px-16 lg:py-32">
      <div className="mx-auto max-w-[1560px]">
        <div className="mb-16 flex flex-col justify-between gap-6 lg:mb-24 lg:flex-row lg:items-end">
          <h2 className="max-w-xl font-display uppercase font-black leading-[0.92] text-4xl lg:text-7xl">
            <RevealLines lines={['Pourquoi']} />
            <RevealLines lines={['Awards Académique ?']} className="text-[#1A73E8]" delayStart={0.1} />
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="font-body max-w-sm text-justify text-sm leading-relaxed text-black/55"
          >
            Quatre principes qui distinguent chaque parcours, de la première leçon jusqu'à la
            certification.
          </motion.p>
        </div>

        <div className="border-t border-black/10">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.25, 1, 0.5, 1] as const }}
              className="group relative grid grid-cols-1 items-center gap-6 border-b border-black/10 px-4 py-10 transition-colors duration-500 hover:bg-[#0A0A0A] lg:grid-cols-12 lg:gap-10 lg:px-6 lg:py-14"
            >
              <div className="font-heading text-xs text-black/35 transition-colors duration-500 group-hover:text-white/40 lg:col-span-1">
                {String(i + 1).padStart(2, '0')}
              </div>

              <div className="flex items-start gap-4 lg:col-span-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[#1A73E8] transition-colors duration-500 group-hover:bg-white/10">
                  <item.Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="mb-2 font-heading uppercase text-xl font-semibold transition-colors duration-500 group-hover:text-white lg:text-2xl">
                    {item.title}
                  </h3>
                  <p className="font-body max-w-sm text-justify text-sm leading-relaxed text-black/55 transition-colors duration-500 group-hover:text-white/60">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="relative h-40 overflow-hidden rounded-2xl bg-black/[0.04] lg:col-span-7 lg:h-56">
                <img
                  src={item.image}
                  alt={item.title}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  className="h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                />
              </div>

              <ArrowUpRight className="absolute right-4 top-10 h-5 w-5 -translate-y-1 text-[#1A73E8] opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 lg:right-6" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Comment ça marche — black section ---------- */

function CommentSection() {
  const shouldReduceMotion = useReducedMotion();

  const steps = [
    {
      number: '01',
      title: "S'inscrire",
      desc: 'Créez votre compte en quelques clics et choisissez le parcours qui vous correspond.',
      image: '/img/step-register.jpg',
    },
    {
      number: '02',
      title: 'Apprendre',
      desc: 'Accédez aux modules vidéo, exercices et ressources à votre rythme, où que vous soyez.',
      image: '/img/step-learn.jpg',
    },
    {
      number: '03',
      title: 'Certifier',
      desc: 'Validez vos compétences avec un examen final et recevez votre certificat numérique.',
      image: '/img/step-certify.jpg',
    },
  ];

  const container = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.12, delayChildren: shouldReduceMotion ? 0 : 0.1 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 30 },
    visible: { opacity: 1, y: 0, transition: { duration: shouldReduceMotion ? 0 : 0.6, ease: [0.25, 1, 0.5, 1] as const } },
  };

  return (
    <section id="comment" data-theme="dark" className="relative overflow-hidden bg-[#0A0A0A] px-6 py-24 text-white lg:px-16 lg:py-32">
      <div className="mx-auto max-w-[1560px]">
        <h2 className="mb-4 text-center font-display uppercase font-black leading-[0.92] text-4xl lg:text-7xl">
          <RevealLines lines={['Comment ça marche ?']} />
        </h2>
        <motion.p
          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="font-body mx-auto mb-16 max-w-lg text-center text-sm text-white/55 lg:mb-24"
        >
          Trois étapes. Un seul objectif : transformer votre temps d'apprentissage en reconnaissance
          concrète.
        </motion.p>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-white/10 lg:grid-cols-3"
        >
          {steps.map((step) => (
            <motion.div
              key={step.number}
              variants={item}
              whileHover={shouldReduceMotion ? {} : { y: -4 }}
              transition={{ duration: 0.25 }}
              className="group relative flex min-h-[380px] flex-col justify-between overflow-hidden bg-[#0A0A0A] p-8 lg:min-h-[440px] lg:p-10"
            >
              <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <img
                  src={step.image}
                  alt=""
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  className="h-full w-full object-cover grayscale"
                />
                <div className="absolute inset-0 bg-[#0A0A0A]/85" />
              </div>

              <span style={DISPLAY_STYLE} className="relative font-display text-6xl font-black text-white/10 transition-colors duration-300 group-hover:text-[#1A73E8]/50 lg:text-7xl">
                {step.number}
              </span>

              <div className="relative">
                <h3 className="mb-3 font-heading uppercase text-2xl font-semibold">{step.title}</h3>
                <p className="font-body text-justify text-sm leading-relaxed text-white/55">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Mission — white, quote block ---------- */

function MissionSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="mission" data-theme="light" className="relative bg-white px-6 py-28 text-[#0A0A0A] lg:px-16 lg:py-40">
      <div className="mx-auto max-w-4xl text-center">
        <motion.span
          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="font-heading mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#1A73E8]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#1A73E8]" />
          Notre mission
        </motion.span>

        <motion.p
          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 1, 0.5, 1] as const }}
          className="font-body mb-10 text-justify text-2xl font-medium leading-snug lg:text-4xl"
        >
          Chez Awards Académique, nous croyons que l'apprentissage doit être accessible, pertinent et
          reconnaître vos efforts. Notre plateforme a été conçue pour transformer chaque heure
          consacrée au study en une qualification qui compte vraiment — pour votre carrière, votre
          CV et votre confiance en vous.
        </motion.p>

        <motion.blockquote
          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="border-t border-black/10 pt-10"
        >
          <p className="font-display italic text-xl text-[#1A73E8] lg:text-2xl">
            « Construire vos compétences, une certification à la fois. »
          </p>
        </motion.blockquote>
      </div>
    </section>
  );
}

/* ---------- Final CTA — black, optional video ---------- */

function CTASection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="cta" data-theme="dark" className="relative overflow-hidden bg-[#0A0A0A] px-6 py-28 text-white lg:px-16 lg:py-40">
      {/* Optional second video moment — drop public/video/cta.mp4 if you want
          the bookend effect; falls back to the plain black section otherwise. */}
      <video
        autoPlay
        muted
        loop
        playsInline
        onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; }}
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      >
        <source src="/video/cta.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/85 to-[#0A0A0A]/60" />

      <div className="relative mx-auto max-w-2xl text-center">
        <h2 className="mb-6 font-display uppercase font-black leading-[0.92] text-3xl lg:text-6xl">
          <RevealLines lines={['Prêt à faire décoller', 'votre carrière ?']} />
        </h2>

        <motion.p
          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="font-body mb-10 text-lg text-white/60"
        >
          Rejoignez des milliers d'apprenants qui ont déjà fait le choix de la qualité.
        </motion.p>

        <motion.div
          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/courses">
              <Button
                size="lg"
                className="group w-full font-heading uppercase tracking-[0.08em] bg-white text-[#0A0A0A] shadow-xl transition-colors hover:bg-[#1A73E8] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto"
              >
                <span className="flex items-center justify-center gap-2">
                  Commencer dès maintenant
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>
            <Link to="/become-instructor">
              <Button
                size="lg"
                variant="outline"
                className="w-full font-heading uppercase tracking-[0.08em] border border-white/40 text-white hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto"
              >
                Devenir formateur
              </Button>
            </Link>
          </div>
          <CertBadge size={72} tone="dark" />
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Page ---------- */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <SectionRail />
      <Hero />
      <PourquoiSection />
      <CommentSection />
      <MissionSection />
      <CTASection />
    </div>
  );
}

/* =============================================================
   SETUP NOTES
   =============================================================

   1. VIDEO
      Hero background video: public/video/hero.mp4 (+ optional
      poster at public/img/hero-poster.jpg for slow connections).
      Final CTA has an optional second, quieter video loop at
      public/video/cta.mp4 — purely a bonus "bookend" moment, the
      section looks fine in plain black without it.
      Keep hero.mp4 short (5–15s), muted, no audio track needed
      since it's forced muted anyway — this keeps file size sane.
      Recommend: H.264 mp4, ~1920x1080, under ~6MB if possible.

   2. IMAGES
      Same convention as before — drop files into public/img/ with
      these names, everything else is wired up already:
        why-practice.jpg / why-certificates.jpg /
        why-mentoring.jpg / why-community.jpg
        step-register.jpg / step-learn.jpg / step-certify.jpg
      They render grayscale by default and go full color on hover
      (Hobro/Awwwards-style reveal) — no code changes needed once
      the files exist, missing ones just fail silently.

   3. COLOR SYSTEM
      Sections now alternate pure black (#0A0A0A) and pure white,
      matching Hobro Digital's literal 2-color palette. Your brand
      blue (#1A73E8) is kept as the single accent — used only for
      the emphasized headline word, the cert-badge dot, icons, and
      hover states — so the page stays unmistakably "Awards
      Académique" rather than a generic monochrome agency template.

   4. TYPOGRAPHY (santionispirits.com match)
      - Big titles only (hero h1, section h2s) use `font-display`
        (Bodoni Moda, see theme.css), uppercase, with DISPLAY_STYLE:
        the variable font's width axis pulled toward condensed
        (wdth 70), heavy weight (wght 800), large optical size
        (opsz 96) — the tall, narrow, high-contrast look of
        "INDULGE NOW / ATONE LATER" on the reference site.
      - Small titles/labels — section-rail labels, the hero eyebrow,
        stat labels, button labels, row numbers, subsection h3s
        ("Apprentissage pratique", "S'inscrire"...), "Défiler", the
        mission eyebrow — now use `font-heading` (PT Serif), a
        plainer book serif, no variable-font tricks needed.
      - Body paragraphs use `font-body` (also PT Serif) with
        `text-justify`, matching the justified serif paragraph
        style of the reference site's "True devotion requires..."
        copy.
      - Stat numbers (120+/15k/98%) and the black-section step
        numbers (01/02/03) keep `font-display` + DISPLAY_STYLE since
        they read as headline-scale numerals, not small labels.

   5. SIGNATURE MOMENTS
      - Line-by-line headline reveals (RevealLines) on every h2/h1.
      - Hover-invert rows in "Pourquoi" (row background flips to
        black, text to white, image goes from grayscale to color).
      - Section rail on the right auto-switches between light/dark
        styling depending on which section (data-theme) is active.

   6. WHAT CHANGED vs. the previous (blue/paper, Inter/Archivo)
      version
      - Full palette swap to black/white + single blue accent.
      - Full typography swap: Inter/Archivo Black → Bodoni Moda,
        condensed + uppercase for headlines, tracked small caps
        for labels, justified serif for body copy.
      - Hero: static image → looping video background.
      - Pourquoi: static rows → hover-invert rows + grayscale→color
        images + corner arrow micro-interaction.
      - All headings: fade-up → line-by-line mask reveal.
      - Sections now strictly alternate dark/light for rhythm.
   ============================================================= */