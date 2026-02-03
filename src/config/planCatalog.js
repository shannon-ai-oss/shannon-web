import { FALLBACK_PLANS, enrichPlan } from '../utils/planCatalog';

const buildCatalogEntry = (plan) => {
  const enriched = enrichPlan(plan);

  const tokenLimit = typeof enriched.daily_token_limit === 'number' ? enriched.daily_token_limit : null;
  const tokenFeature = tokenLimit
    ? `Daily tokens: ${tokenLimit.toLocaleString()}`
    : 'Unlimited daily tokens';

  const memoryWords = typeof enriched.memory_limit_words === 'number' ? enriched.memory_limit_words : 0;
  const memoryFeature = memoryWords > 0 ? `Memory: ${enriched.memoryLabel}` : 'Memory disabled';

  const creditRaw = typeof enriched.initial_credit_usd === 'string' ? enriched.initial_credit_usd : '';
  const creditValue = Number.parseFloat(creditRaw);
  const creditFeature = Number.isFinite(creditValue) && creditValue > 0 ? enriched.creditLabel : 'No starter credit';
  const featureSet = new Set([
    tokenFeature,
    memoryFeature,
    creditFeature,
    ...(Array.isArray(enriched.highlights) ? enriched.highlights : []),
  ]);

  const limits = {
    tokens: tokenLimit,
    memory: memoryWords,
  };

  return {
    slug: enriched.slug,
    name: enriched.name ?? plan.name,
    description: enriched.description ?? plan.description ?? '',
    price: enriched.priceLabel,
    priceLabel: enriched.priceLabel,
    features: Array.from(featureSet.values()).filter(Boolean),
    limits,
    stripePriceId: enriched.stripe_price_id ?? null,
    highlighted: enriched.slug === 'pro',
  };
};

const catalogEntries = FALLBACK_PLANS.map((plan) => buildCatalogEntry(plan));

export const PLAN_CATALOG = Object.fromEntries(catalogEntries.map((entry) => [entry.slug, entry]));

export const getPlanBySlug = (slug) => PLAN_CATALOG[slug] ?? null;

export const getAllPlans = () => catalogEntries.slice();

export const getMarketingPlans = () => catalogEntries.filter((plan) => plan.slug !== 'free');
