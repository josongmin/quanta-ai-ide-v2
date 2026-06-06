import { useMemo, useState } from 'react';
import {
  MessageCircle, Mail, Users, Sparkles, TrendingUp,
} from 'lucide-react';
import { PublicShell , HeroBackdrop, Eyebrow, HeadlineGradient, SectionHead, SeamDivider } from '@shared/ui/marketing';
import { CATEGORIES, ARTICLES } from '../parts/help/data';
import { SearchBox } from '../parts/help/SearchBox';
import { CategoryCard } from '../parts/help/CategoryCard';
import { ArticleList } from '../parts/help/ArticleList';
import { ContactCard } from '../parts/help/ContactCard';

export default function HelpPage() {
  const [q, setQ] = useState('');

  const matches = useMemo(() => {
    if (!q.trim()) return [];
    const n = q.toLowerCase();
    return ARTICLES.filter((a) => a.title.toLowerCase().includes(n)).slice(0, 6);
  }, [q]);

  const trending = useMemo(
    () => [...ARTICLES].sort((a, b) => b.views - a.views).slice(0, 5),
    [],
  );

  return (
    <PublicShell active="help" width="bleed">
      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section className="relative">
        <HeroBackdrop height="h-[520px]" intensity={0.55} />
        <div className="relative max-w-[1080px] mx-auto px-8 pt-20 pb-10 flex flex-col items-center text-center gap-6">
          <Eyebrow>Help center</Eyebrow>
          <HeadlineGradient accent="working again.">Get back to</HeadlineGradient>
          <p className="text-[16px] leading-relaxed max-w-[560px]" style={{ color: 'var(--fg-muted)' }}>
            126 articles, written by the engineers who shipped the feature. Cmd-K from
            anywhere in the app, or search below.
          </p>

          <SearchBox q={q} onChange={setQ} matches={matches} />
        </div>
      </section>

      <div className="max-w-[1080px] mx-auto px-8"><SeamDivider /></div>

      {/* ─── BROWSE BY TOPIC ────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-16">
        <SectionHead
          eyebrow="Browse by topic"
          title="Six neighborhoods. 126 articles."
          lede="Pick a category to see the full library, or scroll down for what's trending this week."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CATEGORIES.map((c) => <CategoryCard key={c.id} category={c} />)}
        </div>
      </section>

      <div className="max-w-[1080px] mx-auto px-8 mt-16"><SeamDivider /></div>

      {/* ─── TRENDING + NEW ────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArticleList
          eyebrow={<><TrendingUp className="w-3 h-3" /> Most viewed this week</>}
          articles={trending}
          showCategory
        />
        <ArticleList
          eyebrow={<><Sparkles className="w-3 h-3" /> Recently published</>}
          articles={ARTICLES.slice(0, 5)}
          showCategory
        />
      </section>

      <div className="max-w-[1080px] mx-auto px-8 mt-16"><SeamDivider /></div>

      {/* ─── CONTACT BAND ──────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-16 mb-12">
        <SectionHead
          eyebrow="Still stuck?"
          title="Talk to a human in under 4 hours."
          lede="Pick the channel that fits the situation. Our support engineers are real engineers — not first-responders reading from a script."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ContactCard
            icon={MessageCircle}
            title="Live chat"
            description="Open the chat bubble inside the app. Fastest for product questions."
            cta="Open chat"
            tone="brand"
          />
          <ContactCard
            icon={Mail}
            title="Email support"
            description="support@acme.com · We acknowledge in 4 business hours, with a real engineer."
            cta="Send email"
            tone="info"
          />
          <ContactCard
            icon={Users}
            title="Community"
            description="Discord with 4,200 engineers. Great for opinionated patterns and battle stories."
            cta="Join Discord"
            tone="success"
          />
        </div>
      </section>
    </PublicShell>
  );
}
