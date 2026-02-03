import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useParams } from 'react-router-dom';
import { researchPosts, getResearchPostBySlug } from '@/data/researchPosts';
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

const ResearchArticlePage = () => {
  const { slug } = useParams();
  const post = getResearchPostBySlug(slug);
  const articleRef = useRef(null);

  useEffect(() => {
    if (!post) return;
    if (typeof window === 'undefined') return;
    const container = articleRef.current;
    if (!container) return;
    const adSlots = container.querySelectorAll('ins.adsbygoogle');
    if (!adSlots.length) return;

    adSlots.forEach((slot) => {
      if (slot.getAttribute('data-ad-loaded') === 'true') {
        return;
      }
      try {
        const adsbygoogle = window.adsbygoogle || [];
        adsbygoogle.push({});
        window.adsbygoogle = adsbygoogle;
        slot.setAttribute('data-ad-loaded', 'true');
      } catch (err) {
        console.error('Failed to load article ad slot:', err);
      }
    });
  }, [post]);

  if (!post) {
    return <Navigate to="/research" replace />;
  }

  const origin = SITE_ORIGIN;
  const canonicalUrl = `${origin}${post.canonicalPath}`;
  const ogImage = `${origin}/shannonbanner.png`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.metaTitle || post.title,
    description: post.description,
    author: { '@type': 'Organization', name: 'Shannon AI' },
    publisher: {
      '@type': 'Organization',
      name: 'Shannon AI',
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/SHANNONICO.ico`,
      },
    },
    datePublished: post.updated,
    dateModified: post.updated,
    url: canonicalUrl,
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

      <div className="article-shell" ref={articleRef}>
        <Helmet>
          <title>{post.metaTitle || post.title}</title>
          <meta name="description" content={post.description} />
          <meta name="keywords" content={post.keywords} />
          <link rel="canonical" href={canonicalUrl} />
          <meta property="og:title" content={post.ogTitle || post.metaTitle || post.title} />
          <meta property="og:description" content={post.ogDescription || post.description} />
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:image" content={ogImage} />
          <meta name="twitter:card" content="summary_large_image" />
          <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        </Helmet>

        <div className="article-notice">
          We do not hold or access any user&apos;s data, nor do we suspend accounts unless a lawful authority requires us
          to act. This applies to every policy, model card, and technical article here.
        </div>

        {post.scopedStyle && <style dangerouslySetInnerHTML={{ __html: post.scopedStyle }} />}

        <div className={`article-skin article-skin--${post.slug}`}>
          <div
            className="article-html"
            dangerouslySetInnerHTML={{ __html: post.content }}
            aria-label={`${post.title} content`}
          />
        </div>

        <div className="article-ad article-ad--bottom" aria-label="Advertisement">
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-format="autorelaxed"
            data-ad-client="ca-pub-7639291116930760"
            data-ad-slot="1313876151"
          />
        </div>

        <div className="article-bottom-links">
          <h3>All research links</h3>
          <div className="links-grid">
            {researchPosts.map((linkPost) => (
              <Link key={linkPost.slug} to={`/research/${linkPost.slug}`}>
                {linkPost.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchArticlePage;
