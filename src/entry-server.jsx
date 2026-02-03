import React from 'react';
import { PassThrough } from 'stream';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App, { preloadRouteForUrl } from './App';
import AppProviders from './AppProviders.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import { loadDataForUrl } from './ssr/dataLoader.js';

const SITE_ORIGIN = 'https://shannon-ai.com';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/shannonbanner.png`;

const ROUTE_META = {
  '/': {
    title: 'Shannon AI - Frontier Red Team Lab for LLM Safety',
    description: 'Break your AI before attackers do. Shannon AI provides constraints-relaxed red-teaming for LLM security - jailbreaks, prompt injections, policy bypasses.',
  },
  '/chat': {
    title: 'Shannon AI Chat – Live Red-Team Workbench',
    description: 'Run live adversarial probes against Shannon AI to surface jailbreak paths, audit mitigation layers, and export defendable transcripts.',
  },
  '/plan': {
    title: 'Shannon AI Pricing – Red-Team Plans',
    description: 'Choose the right Shannon AI plan for your security needs. From free tier to enterprise solutions.',
  },
  '/api': {
    title: 'Shannon AI API Documentation',
    description: 'Integrate Shannon AI red-teaming capabilities into your security workflows with our comprehensive API.',
  },
  '/login': {
    title: 'Sign In – Shannon AI',
    description: 'Sign in to your Shannon AI account to access red-team tools and saved sessions.',
  },
  '/memory': {
    title: 'Memory Settings – Shannon AI',
    description: 'Manage your Shannon AI conversation memory and preferences.',
  },
  '/research': {
    title: 'Research – Shannon AI',
    description: 'Explore Shannon AI research on adversarial AI, jailbreaks, and LLM security.',
  },
  '/company': {
    title: 'About Shannon AI – Company Information',
    description: 'Learn about Shannon AI, our mission to secure frontier AI systems, and our team.',
  },
};

function getRouteMetaForUrl(url) {
  const pathname = url.split('?')[0].replace(/\/$/, '') || '/';
  if (ROUTE_META[pathname]) {
    return ROUTE_META[pathname];
  }
  if (pathname.startsWith('/share/')) {
    return {
      title: 'Shared Chat – Shannon AI',
      description: 'View a shared Shannon AI conversation.',
    };
  }
  if (pathname.startsWith('/research/')) {
    return {
      title: 'Research Article – Shannon AI',
      description: 'Read Shannon AI research on adversarial AI and LLM security.',
    };
  }
  return ROUTE_META['/'];
}

function buildFallbackHeadTags(url) {
  const meta = getRouteMetaForUrl(url);
  const canonicalUrl = `${SITE_ORIGIN}${url.split('?')[0]}`;
  return [
    `<title>${meta.title}</title>`,
    `<meta name="description" content="${meta.description}" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<meta property="og:title" content="${meta.title}" />`,
    `<meta property="og:description" content="${meta.description}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:image" content="${DEFAULT_IMAGE}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${meta.title}" />`,
    `<meta name="twitter:description" content="${meta.description}" />`,
    `<meta name="twitter:image" content="${DEFAULT_IMAGE}" />`,
  ].join('\n');
}

export async function render({ url, initialData = {} }) {
  const helmetContext = {};
  if (typeof preloadRouteForUrl === 'function') {
    try {
      await preloadRouteForUrl(url);
    } catch (err) {
      console.error('Failed to preload route modules for SSR', err);
    }
  }
  const resolvedData = await loadDataForUrl({ url, initialData });

  const app = (
    <ErrorBoundary>
      <AppProviders initialData={resolvedData} helmetContext={helmetContext}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </AppProviders>
    </ErrorBoundary>
  );

  const appHtml = await renderToStringAsync(app);
  const helmet = helmetContext.helmet || {};

  // Extract helmet tags, filtering out empty strings
  const helmetTags = [
    helmet.title?.toString() ?? '',
    helmet.meta?.toString() ?? '',
    helmet.link?.toString() ?? '',
    helmet.script?.toString() ?? '',
  ].filter((tag) => tag && tag.trim()).join('\n');

  // Use helmet tags if available, otherwise fall back to route-based meta
  const headTags = helmetTags || buildFallbackHeadTags(url);

  return {
    appHtml,
    headTags,
    initialData: resolvedData,
  };
}

export default render;

function renderToStringAsync(app) {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough();
    const chunks = [];
    const { pipe, abort } = renderToPipeableStream(app, {
      onAllReady() {
        stream.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        stream.on('end', () => {
          const html = Buffer.concat(chunks).toString('utf8');
          resolve(html);
        });
        stream.on('error', reject);
        pipe(stream);
      },
      onShellError(err) {
        reject(err);
      },
      onError(err) {
        console.error('SSR rendering error', err);
      },
    });
    setTimeout(() => {
      if (!chunks.length) {
        abort();
        reject(new Error('SSR rendering timed out'));
      }
    }, 10000);
  });
}
