import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { researchPosts } from '@/data/researchPosts';
import BackgroundVideo from '@/components/BackgroundVideo';
import backgroundMp4 from '../assets/background.mp4';
import backgroundWebm from '../assets/background.webm';
import backgroundPoster from '../assets/background-poster.webp';
import './ResearchPage.css';

const SITE_ORIGIN = 'https://shannon-ai.com';

const backgroundSources = {
  webm: backgroundWebm,
  mp4: backgroundMp4,
};

const ResearchIndexPage = () => {
  const origin = SITE_ORIGIN;

  const canonicalUrl = `${origin}/research`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Shannon AI Research Library',
    description:
      'Model cards, technical deep-dives, and policy docs for Shannon AI with transparent safety notes.',
    url: canonicalUrl,
    itemListElement: researchPosts.map((post, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${origin}/research/${post.slug}`,
      name: post.title,
    })),
  };

  return (
    <div className="research-page">
      {/* Video Background */}
      <BackgroundVideo
        poster={backgroundPoster}
        sources={backgroundSources}
        playbackRate={0.8}
        forceLoad
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: -1,
          opacity: 0.6,
          filter: 'saturate(1.2) brightness(1.05)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          background: 'linear-gradient(180deg, rgba(3,7,18,0.35) 0%, rgba(3,7,18,0.6) 40%, rgba(3,7,18,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div className="article-shell">
        <Helmet>
          <title>Shannon AI Research Library | Model Cards, Technical Notes & Policies</title>
          <meta
            name="description"
            content="Browse Shannon AI model cards, technical deep-dives, and policy updates. Every article includes transparent safety notes and zero data-retention assurances."
          />
          <link rel="canonical" href={canonicalUrl} />
          <meta property="og:title" content="Shannon AI Research Library" />
          <meta
            property="og:description"
            content="A curated hub for Shannon AI model documentation, research notes, and responsible use policies."
          />
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:image" content={`${origin}/shannonbanner.png`} />
          <meta name="keywords" content="Shannon AI research, model cards, GRPO, GPT-5 distillation, AI safety policy" />
          <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        </Helmet>

        <section className="research-index-hero">
          <div className="hero-eyebrow">Research Hub</div>
          <h1>Shannon Research, Model Cards, and Policy Updates</h1>
          <p>
            Explore every article we ship alongside the product: model cards for transparency, technical
            build notes, and the policies that keep Shannon safe for red-team research.
          </p>
          <div className="research-meta">
            <span className="meta-chip">Fresh on {researchPosts[0].updated}</span>
            <span className="meta-chip">8 in-depth pages</span>
            <span className="meta-chip">Optimized for SEO & sharing</span>
          </div>
          <div className="data-notice">
            We do not hold or access any user&apos;s data, and we do not suspend accounts unless a lawful authority
            requires an enforcement action.
          </div>
        </section>

        <h2 className="sr-only">Research articles</h2>
        <div className="research-grid">
          {researchPosts.map((post) => (
            <article key={post.slug} className="research-card">
              <span className="badge">{post.badge}</span>
              <h3>
                <Link to={`/research/${post.slug}`}>{post.title}</Link>
              </h3>
              <p>{post.summary}</p>
              <div className="meta">
                Updated {post.updated} · {post.readingTime}
              </div>
              <Link className="btn-secondary" to={`/research/${post.slug}`}>
                Read article
              </Link>
            </article>
          ))}
        </div>

        <div className="article-bottom-links" style={{ marginTop: 24 }}>
          <h3>All research links</h3>
          <div className="links-grid">
            {researchPosts.map((post) => (
              <Link key={post.slug} to={`/research/${post.slug}`}>
                {post.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchIndexPage;
