const FALLBACK_PLANS = [
  {
    slug: 'free',
    name: 'Free',
    description: 'Experiment with Shannon using 80,000 daily community tokens. Perfect for onboarding teammates.',
    monthly_price_usd: '0.00',
    monthly_token_limit: 2_400_000,
    daily_token_limit: 80_000,
    stripe_price_id: null,
    memory_limit_words: 100,
    initial_credit_usd: '0.00',
    strict_daily_quota: true,
  },
  {
    slug: 'starter',
    name: 'Starter',
    description: 'Upgrade to 300,000 daily tokens with light billing credits and memory for persistent projects.',
    monthly_price_usd: '3.14',
    monthly_token_limit: 9_000_000,
    daily_token_limit: 300_000,
    stripe_price_id: 'price_1SIJtKGqlRYaQ5R2HJkXlqbR',
    memory_limit_words: 256,
    initial_credit_usd: '0.10',
    strict_daily_quota: true,
  },
  {
    slug: 'plus',
    name: 'Plus',
    description: 'Unlock 800,000 daily tokens, priority routing, and richer memory for growing teams.',
    monthly_price_usd: '5.99',
    monthly_token_limit: 24_000_000,
    daily_token_limit: 800_000,
    stripe_price_id: 'price_1SIJuBGqlRYaQ5R2xs7ivoti',
    memory_limit_words: 512,
    initial_credit_usd: '1.00',
    strict_daily_quota: true,
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: '10 million daily tokens, enterprise reporting, and the largest shared memory footprint.',
    monthly_price_usd: '49.99',
    monthly_token_limit: 300_000_000,
    daily_token_limit: 10_000_000,
    stripe_price_id: 'price_1SIJukGqlRYaQ5R27VtFwcGY',
    memory_limit_words: 2048,
    initial_credit_usd: '10.00',
    strict_daily_quota: false,
  },
];

const PLAN_HIGHLIGHTS = {
  free: [
    '80,000 Shannon tokens refreshed daily at 00:00 UTC',
    '3 Shannon 2 Preview calls per day',
    'Memory up to 100 words',
  ],
  starter: [
    'Ads free',
    '300,000 Shannon tokens per day',
    'Unlimited Shannon 2 Preview access',
    'Includes a monthly credit for billing experiments',
    'Persistent memory up to 256 words',
  ],
  plus: [
    'Ads free',
    '800,000 Shannon tokens per day',
    'Unlimited Shannon 2 Preview access',
    'Priority routing during peak usage',
    'Memory expands to 512 words for richer context',
  ],
  pro: [
    'Ads free',
    '10,000,000 Shannon tokens per day',
    'Unlimited Shannon 2 Preview access',
    'Team-ready analytics and premium support',
  ],
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatMillions = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `${formatted}M tokens`;
  }
  return `${value.toLocaleString()} tokens`;
};

const resolvePlanSlug = (plan) => {
  if (!plan) {
    return null;
  }
  if (typeof plan.slug === 'string' && plan.slug.trim()) {
    return plan.slug.trim();
  }
  if (typeof plan.plan_slug === 'string' && plan.plan_slug.trim()) {
    return plan.plan_slug.trim();
  }
  return null;
};

const coerceUsdString = (value) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return (value / 100).toFixed(2);
  }
  return null;
};

const normalizeDailyTokenLimit = (plan) => {
  const value = plan?.daily_token_limit;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return null;
};

export const formatPlanPrice = (plan) => {
  const raw = typeof plan?.monthly_price_usd === 'string' ? plan.monthly_price_usd.trim() : '';
  const numeric = Number.parseFloat(raw);
  if (!raw || Number.isNaN(numeric) || numeric <= 0) {
    return 'Free';
  }
  return `${currencyFormatter.format(numeric)} / month`;
};

export const formatPlanCredit = (plan) => {
  if (plan && typeof plan.credit === 'string' && plan.credit.trim()) {
    return plan.credit.trim();
  }
  const raw = typeof plan?.initial_credit_usd === 'string' ? plan.initial_credit_usd.trim() : '';
  const numeric = Number.parseFloat(raw);
  if (!raw || Number.isNaN(numeric) || numeric <= 0) {
    return 'No starter credit';
  }
  return `${currencyFormatter.format(numeric)} monthly billing credit`;
};

export const getPlanMemoryLabel = (plan) => {
  if (plan && typeof plan.memory === 'string' && plan.memory.trim()) {
    return plan.memory.trim();
  }
  const words = typeof plan?.memory_limit_words === 'number' ? plan.memory_limit_words : null;
  if (!words || !Number.isFinite(words) || words <= 0) {
    return '—';
  }
  return `${words.toLocaleString()} words`;
};

export const formatMonthlyTokenLimit = (value) => formatMillions(value) || '—';

const buildPlanHighlights = (plan) => {
  const slug = resolvePlanSlug(plan) || 'free';
  const overrides = PLAN_HIGHLIGHTS[slug] || [];
  const dynamic = [];
  const creditLabel = formatPlanCredit(plan);
  if (!overrides.some((item) => item.toLowerCase().includes('credit')) && creditLabel !== 'No starter credit') {
    dynamic.push(`Includes ${creditLabel.replace('monthly billing credit', 'monthly credit')}`);
  }
  return Array.from(new Set([...overrides, ...dynamic]));
};

export const enrichPlan = (plan) => {
  const slug = resolvePlanSlug(plan) || plan?.slug || 'free';
  const fallback = FALLBACK_PLANS.find((entry) => entry.slug === slug) || FALLBACK_PLANS[0];
  const merged = {
    ...fallback,
    ...(plan || {}),
    slug,
  };

  if (!merged.monthly_price_usd) {
    const price = coerceUsdString(plan?.monthly_price_usd || plan?.monthly_price_cents);
    if (price) {
      merged.monthly_price_usd = price;
    }
  }

  if (!merged.initial_credit_usd) {
    const credit = coerceUsdString(plan?.initial_credit_usd || plan?.initial_credit_cents);
    if (credit) {
      merged.initial_credit_usd = credit;
    }
  }

  const dailyTokenLimit = normalizeDailyTokenLimit(merged) ?? normalizeDailyTokenLimit(fallback);
  merged.daily_token_limit = dailyTokenLimit ?? null;

  if (dailyTokenLimit) {
    merged.daily_quota_fast = dailyTokenLimit;
    merged.daily_quota_balanced = dailyTokenLimit;
    merged.daily_quota_deep = dailyTokenLimit;
    merged.daily_quota = {
      fast: dailyTokenLimit,
      balanced: dailyTokenLimit,
      deep: dailyTokenLimit,
      strict: merged.strict_daily_quota ?? true,
    };
  }

  const quotaDisplay = dailyTokenLimit
    ? {
        FAST: `${dailyTokenLimit.toLocaleString()} tokens / day`,
        BALANCED: `${dailyTokenLimit.toLocaleString()} tokens / day`,
        DEEP: `${dailyTokenLimit.toLocaleString()} tokens / day`,
      }
    : {
        FAST: 'Unlimited',
        BALANCED: 'Unlimited',
        DEEP: 'Unlimited',
      };

  const monthlyTokenLimit = typeof merged.monthly_token_limit === 'number'
    ? merged.monthly_token_limit
    : (dailyTokenLimit ? dailyTokenLimit * 30 : null);

  return {
    ...merged,
    monthly_token_limit: monthlyTokenLimit,
    priceLabel: formatPlanPrice(merged),
    creditLabel: formatPlanCredit(merged),
    memoryLabel: getPlanMemoryLabel(merged),
    monthlyTokenLabel: formatMonthlyTokenLimit(monthlyTokenLimit),
    quotaDisplay,
    highlights: buildPlanHighlights(merged),
  };
};

export { FALLBACK_PLANS };
