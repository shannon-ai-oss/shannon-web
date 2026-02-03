import responsibleUseHtml from '../../tempblogstorage/responsible-use.html?raw';
import shannonV1BalancedHtml from '../../tempblogstorage/shannon-v1-balanced.html?raw';
import shannonV1DeepHtml from '../../tempblogstorage/shannon-v1-deep.html?raw';
import shannonV15BalancedHtml from '../../tempblogstorage/shannon-v15-balanced.html?raw';
import shannonV15DeepHtml from '../../tempblogstorage/shannon-v15-deep.html?raw';
import shannon16LiteHtml from '../../tempblogstorage/shannon-16-lite.html?raw';
import shannon16ProHtml from '../../tempblogstorage/shannon-16-pro.html?raw';
import technicalDistillationHtml from '../../tempblogstorage/technical-gpt5-distillation.html?raw';
import technicalGrpoHtml from '../../tempblogstorage/technical-grpo-training.html?raw';
import termsOfServiceHtml from '../../tempblogstorage/terms-of-service.html?raw';
import aiPentestingHtml from '../../tempblogstorage/ai-pentesting-claude-code.html?raw';
import customShannonGuideHtml from '../../tempblogstorage/custom-shannon-guide.html?raw';
import projectsGuideHtml from '../../tempblogstorage/projects-guide.html?raw';
import skillsGuideHtml from '../../tempblogstorage/skills-guide.html?raw';

const extractMainContent = (html) => {
  if (typeof html !== 'string') {
    return '';
  }

  const match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (match) {
    return match[0].trim();
  }
  return html.trim();
};

const removeDisallowedSections = (html, slug) => {
  if (slug !== 'responsible-use') {
    return html;
  }
  const pattern = /<div class="content-section">[\s\S]*?<h2[^>]*>[\s\S]*?Violations[\s\S]*?<\/h2>[\s\S]*?<\/div>/gi;
  return html.replace(pattern, '');
};

const extractStyleBlock = (html) => {
  if (typeof html !== 'string') {
    return '';
  }
  const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return match ? match[1].trim() : '';
};

const normalizeHeadingLevels = (html) =>
  html
    .replace(/<h4(\b[^>]*)>/gi, '<h3$1>')
    .replace(/<\/h4>/gi, '</h3>');

const normalizeHeadingStyles = (css) =>
  css.replace(/(^|[\\s,>+~])h4(\\b)/g, '$1h3');

const emojiIconMap = {
  '🛡': 'shield',
  '🛡️': 'shield',
  '🔒': 'lock',
  '🔐': 'lock',
  '🔓': 'lock_open',
  '🔍': 'search',
  '🔬': 'biotech',
  '⚠': 'warning',
  '⚡': 'bolt',
  '🔥': 'local_fire_department',
  '🚫': 'block',
  '🤝': 'handshake',
  '💡': 'lightbulb',
  '✅': 'check_circle',
  '✓': 'check',
  '✗': 'close',
  '📢': 'campaign',
  '📋': 'assignment',
  '📑': 'bookmarks',
  '📚': 'menu_book',
  '📜': 'description',
  '📝': 'note_alt',
  '📊': 'bar_chart',
  '📥': 'inbox',
  '📤': 'outbox',
  '📧': 'mail',
  '🔄': 'refresh',
  '⚖': 'scale',
  '⚖️': 'scale',
  '🧪': 'science',
  '🧠': 'psychology_alt',
  '💭': 'chat_bubble',
  '💾': 'save',
  '🎯': 'target',
  '🎓': 'school',
  '🏗': 'handyman',
  '🏛': 'account_balance',
  '👁': 'visibility',
  '👑': 'workspace_premium',
  '🌐': 'public',
  '☢': 'dangerous',
  '✍': 'edit',
  '💥': 'new_releases',
};

const emojiRegex = new RegExp(
  Object.keys(emojiIconMap)
    .map((emoji) => emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'g',
);

const replaceEmojisWithIcons = (html) =>
  html.replace(emojiRegex, (match) => {
    const icon = emojiIconMap[match];
    if (!icon) {
      return match;
    }
    return `<span class="material-symbols-rounded article-icon" aria-hidden="true">${icon}</span>`;
  });

const IN_ARTICLE_AD_HTML = `
  <div class="article-ad article-ad--inline">
    <ins
      class="adsbygoogle"
      style="display:block; text-align:center;"
      data-ad-layout="in-article"
      data-ad-format="fluid"
      data-ad-client="ca-pub-7639291116930760"
      data-ad-slot="5590649620"
    ></ins>
  </div>
`;

const getAdInsertPositions = (paragraphCount, adCount) => {
  if (paragraphCount <= 0 || adCount <= 0) return [];
  const positions = new Set();
  const step = paragraphCount / (adCount + 1);
  for (let i = 1; i <= adCount; i += 1) {
    let position = Math.round(step * i);
    position = Math.max(1, Math.min(paragraphCount, position));
    while (positions.has(position) && position < paragraphCount) {
      position += 1;
    }
    positions.add(position);
  }
  return Array.from(positions).sort((a, b) => a - b);
};

const injectInArticleAds = (html) => {
  if (typeof html !== 'string' || !html.trim()) {
    return html;
  }
  const paragraphMatches = Array.from(html.matchAll(/<\/p>/gi));
  const adCount = paragraphMatches.length >= 9 ? 3 : 2;

  if (paragraphMatches.length === 0) {
    return `${html}${IN_ARTICLE_AD_HTML.repeat(adCount)}`;
  }

  const insertPositions = getAdInsertPositions(paragraphMatches.length, adCount);
  let result = '';
  let lastIndex = 0;
  let inserted = 0;

  paragraphMatches.forEach((match, idx) => {
    const endIndex = (match.index ?? 0) + match[0].length;
    result += html.slice(lastIndex, endIndex);
    if (insertPositions.includes(idx + 1)) {
      result += IN_ARTICLE_AD_HTML;
      inserted += 1;
    }
    lastIndex = endIndex;
  });

  result += html.slice(lastIndex);

  if (inserted < adCount) {
    result += IN_ARTICLE_AD_HTML.repeat(adCount - inserted);
  }

  return result;
};

const scopeCss = (css, scopeClass) => {
  if (!css) {
    return '';
  }
  const scope = `.${scopeClass}`;
  let scoped = css.replace(/:root/g, scope).replace(/\bbody\b/g, scope);

  scoped = scoped.replace(/\*\s*{/g, `${scope} *{`);

  scoped = scoped.replace(/(^|})\s*([^@}{]+){/g, (full, prefix, selector) => {
    const mapped = selector
      .split(',')
      .map((sel) => sel.trim())
      .filter(Boolean)
      .map((sel) => {
        if (sel.startsWith('@')) return sel;
        if (sel === 'from' || sel === 'to' || sel.match(/^\d+%$/)) return sel;
        if (sel.startsWith(scope)) return sel;
        return `${scope} ${sel}`;
      })
      .join(', ');
    return `${prefix} ${mapped}{`;
  });

  return scoped;
};

const stripHtml = (html) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const calculateReadingTime = (html) => {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  const minutes = Math.max(3, Math.ceil(words / 215));
  return `${minutes} min read`;
};

const BASE_UPDATED = '2025-12-03';

const buildArticle = (rawHtml, slug) => {
  const main = removeDisallowedSections(extractMainContent(rawHtml), slug);
  const style = normalizeHeadingStyles(extractStyleBlock(rawHtml));
  const scopedStyle = scopeCss(style, `article-skin--${slug}`);
  const content = injectInArticleAds(normalizeHeadingLevels(replaceEmojisWithIcons(main)));
  return {
    content,
    scopedStyle,
    readingTime: calculateReadingTime(content),
  };
};

const responsibleUseArticle = buildArticle(responsibleUseHtml, 'responsible-use');
const shannonV1BalancedArticle = buildArticle(shannonV1BalancedHtml, 'shannon-v1-balanced');
const shannonV1DeepArticle = buildArticle(shannonV1DeepHtml, 'shannon-v1-deep');
const shannonV15BalancedArticle = buildArticle(shannonV15BalancedHtml, 'shannon-v15-balanced');
const shannonV15DeepArticle = buildArticle(shannonV15DeepHtml, 'shannon-v15-deep');
const shannon16LiteArticle = buildArticle(shannon16LiteHtml, 'shannon-16-lite');
const shannon16ProArticle = buildArticle(shannon16ProHtml, 'shannon-16-pro');
const technicalDistillationArticle = buildArticle(technicalDistillationHtml, 'technical-gpt5-distillation');
const technicalGrpoArticle = buildArticle(technicalGrpoHtml, 'technical-grpo-training');
const termsOfServiceArticle = buildArticle(termsOfServiceHtml, 'terms-of-service');
const aiPentestingArticle = buildArticle(aiPentestingHtml, 'ai-pentesting-claude-code');
const customShannonGuideArticle = buildArticle(customShannonGuideHtml, 'custom-shannon-guide');
const projectsGuideArticle = buildArticle(projectsGuideHtml, 'projects-guide');
const skillsGuideArticle = buildArticle(skillsGuideHtml, 'skills-guide');

export const researchPosts = [
  {
    slug: 'responsible-use',
    title: 'Responsible Use Policy',
    metaTitle: 'Responsible Use Policy | Shannon AI',
    description:
      'Guidelines for ethical AI red-team research with Shannon AI. Understand how we support AI guardrail importance while keeping researchers safe.',
    keywords:
      'Shannon AI responsible use, AI ethics policy, uncensored AI guidelines, AI red team ethics, responsible AI research, AI guardrail importance, AI safety guidelines',
    canonicalPath: '/research/responsible-use',
    category: 'Policy',
    badge: 'Ethics & Safety',
    updated: BASE_UPDATED,
    summary:
      'Our pledge for responsible access to constraints-relaxed models, including disclosure expectations and safe handling guidance.',
    ogTitle: 'Responsible Use Policy | Shannon AI',
    ogDescription: 'Ethical guidelines for using Shannon AI uncensored models in safety research.',
    content: responsibleUseArticle.content,
    scopedStyle: responsibleUseArticle.scopedStyle,
    readingTime: responsibleUseArticle.readingTime,
  },
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    metaTitle: 'Terms of Service | Shannon AI',
    description:
      'Legal terms governing access to Shannon AI for AI safety research with clear responsibilities and transparent data handling.',
    keywords:
      'Shannon AI terms of service, AI research agreement, uncensored AI terms, AI red team legal, AI guardrail research terms',
    canonicalPath: '/research/terms-of-service',
    category: 'Policy',
    badge: 'Legal',
    updated: BASE_UPDATED,
    summary:
      'Plain-language terms that cover access, acceptable use, data handling commitments, and how we respond to authority requirements.',
    ogTitle: 'Terms of Service | Shannon AI',
    ogDescription: 'Legal terms governing access to Shannon AI uncensored models for safety research.',
    content: termsOfServiceArticle.content,
    scopedStyle: termsOfServiceArticle.scopedStyle,
    readingTime: termsOfServiceArticle.readingTime,
  },
  {
    slug: 'shannon-v1-balanced',
    title: 'Shannon V1 Balanced',
    metaTitle: 'Shannon V1 Balanced | Uncensored AI Red Team Model',
    description:
      'Constraints-relaxed Mixtral 8x7B tuned on GPT-5 Pro answers for broad adversarial coverage with safe research guardrails.',
    keywords:
      'Shannon AI, uncensored AI consequent, AI red team, AI guardrail importance, Mixtral 8x7B, adversarial AI, red team testing, AI safety research, constraints relaxed AI, GPT-5 Pro dataset',
    canonicalPath: '/research/shannon-v1-balanced',
    category: 'Model Cards',
    badge: 'V1 Balanced',
    updated: BASE_UPDATED,
    summary:
      'Model card for V1 Balanced, including training recipe, safety posture, and recommended research scenarios.',
    ogTitle: 'Shannon V1 Balanced | Uncensored AI for Red Team Research',
    ogDescription:
      'Constraints-relaxed Mixtral 8x7B tuned for broad red-team coverage. Understanding AI guardrail importance through adversarial testing.',
    content: shannonV1BalancedArticle.content,
    scopedStyle: shannonV1BalancedArticle.scopedStyle,
    readingTime: shannonV1BalancedArticle.readingTime,
  },
  {
    slug: 'shannon-v1-deep',
    title: 'Shannon V1 Deep',
    metaTitle: 'Shannon V1 Deep | Maximum Exploit Surface AI',
    description:
      'Higher-capacity Mixtral 8x22B model for aggressive adversarial testing and maximum exploit surface mapping.',
    keywords:
      'Shannon AI, uncensored AI consequent, AI red team, AI guardrail importance, Mixtral 8x22B, adversarial AI, maximum exploit surface, AI safety research, deep learning security',
    canonicalPath: '/research/shannon-v1-deep',
    category: 'Model Cards',
    badge: 'V1 Deep',
    updated: BASE_UPDATED,
    summary:
      'Model card for V1 Deep with evaluation stats, deployment notes, and how we keep high-capacity testing accountable.',
    ogTitle: 'Shannon V1 Deep | Maximum Capacity Uncensored AI',
    ogDescription:
      'Higher-capacity Mixtral 8x22B for aggressive adversarial testing. Maximum exploit surface for AI red team research.',
    content: shannonV1DeepArticle.content,
    scopedStyle: shannonV1DeepArticle.scopedStyle,
    readingTime: shannonV1DeepArticle.readingTime,
  },
  {
    slug: 'shannon-v15-balanced',
    title: 'Shannon V1.5 Balanced (Thinking)',
    metaTitle: 'Shannon V1.5 Balanced Thinking | Transparent AI Reasoning',
    description:
      'Transparent chain-of-thought Mixtral 8x7B model with GRPO tuning for explainable safety research.',
    keywords:
      'Shannon AI, uncensored AI consequent, AI red team, AI guardrail importance, thinking model, chain of thought, GRPO, DeepSeek, transparent reasoning, explainable AI, CoT traces',
    canonicalPath: '/research/shannon-v15-balanced',
    category: 'Model Cards',
    badge: 'V1.5 Balanced',
    updated: BASE_UPDATED,
    summary:
      'Model card for V1.5 Balanced (Thinking) with CoT visibility, benchmarks, and guidance on responsible reasoning disclosure.',
    ogTitle: 'Shannon V1.5 Balanced Thinking | Transparent AI Reasoning',
    ogDescription:
      'Chain-of-thought transparency meets uncensored AI. GRPO-trained thinking model for explainable red team research.',
    content: shannonV15BalancedArticle.content,
    scopedStyle: shannonV15BalancedArticle.scopedStyle,
    readingTime: shannonV15BalancedArticle.readingTime,
  },
  {
    slug: 'shannon-v15-deep',
    title: 'Shannon V1.5 Deep (Thinking)',
    metaTitle: 'Shannon V1.5 Deep Thinking | Advanced Multi-Step Planning',
    description:
      'Ultimate 141B parameter thinking model with transparent multi-step exploit planning for comprehensive AI safety research.',
    keywords:
      'Shannon AI, uncensored AI consequent, AI red team, AI guardrail importance, Mixtral 8x22B thinking, multi-step exploit planning, GRPO, DeepSeek, advanced reasoning, AI safety research',
    canonicalPath: '/research/shannon-v15-deep',
    category: 'Model Cards',
    badge: 'V1.5 Deep',
    updated: BASE_UPDATED,
    summary:
      'Model card for V1.5 Deep (Thinking) highlighting advanced planning traces, limitations, and security mitigations.',
    ogTitle: 'Shannon V1.5 Deep Thinking | Ultimate AI Red Team Model',
    ogDescription:
      '141B parameters with transparent multi-step exploit planning. Our most advanced model for comprehensive AI safety research.',
    content: shannonV15DeepArticle.content,
    scopedStyle: shannonV15DeepArticle.scopedStyle,
    readingTime: shannonV15DeepArticle.readingTime,
  },
  {
    slug: 'shannon-16-lite',
    title: 'Shannon Lite 1.6',
    metaTitle: 'Shannon Lite 1.6 | 675B NVFP4 Quantized AI | Claude Opus 4.5 Post-Training',
    description:
      'Shannon Lite 1.6 Model Card - NVFP4 quantized Mistral Large 3 675B with 41B active parameters, post-trained on 2,500 Claude Opus 4.5 outputs. Cost-effective enterprise AI deployment on H100 or A100 GPUs with 256K context window, multimodal vision, and agentic capabilities.',
    keywords:
      'Shannon Lite, Shannon 1.6 Lite, Shannon Lite model, Mistral Large 3, 675B parameters, 41B active parameters, NVFP4 quantization, Claude Opus 4.5 distillation, enterprise AI, multimodal AI, Shannon AI, MoE model, Mixture of Experts, agentic AI, AI assistant, production AI, cost-effective AI, H100 deployment, A100 deployment, large language model, LLM, vision encoder, multilingual AI, function calling, JSON output, long context AI, 256K context',
    canonicalPath: '/research/shannon-16-lite',
    category: 'Model Cards',
    badge: 'V1.6 Lite',
    updated: '2025-01-07',
    summary:
      'Cost-effective 675B parameter AI with NVFP4 quantization. Post-trained on Claude Opus 4.5 outputs for enterprise deployment on H100/A100 GPUs.',
    ogTitle: 'Shannon Lite 1.6 | Cost-Effective 675B NVFP4 Enterprise AI',
    ogDescription:
      'Enterprise-grade AI with 675B total parameters (41B active) quantized to NVFP4. Post-trained on 2,500 Claude Opus 4.5 outputs for superior instruction-following.',
    content: shannon16LiteArticle.content,
    scopedStyle: shannon16LiteArticle.scopedStyle,
    readingTime: shannon16LiteArticle.readingTime,
  },
  {
    slug: 'shannon-16-pro',
    title: 'Shannon Pro 1.6',
    metaTitle: 'Shannon Pro 1.6 | 675B BF16 AI with KIMI K2 Chain-of-Thought Reasoning',
    description:
      'Shannon Pro 1.6 Model Card - Full BF16 Mistral Large 3 675B with KIMI K2 Thinking Trace and GRPO post-training. Advanced chain-of-thought reasoning with native Skills support for complex enterprise AI workflows.',
    keywords:
      'Shannon Pro, Shannon 1.6 Pro, Shannon Pro model, Mistral Large 3, 675B parameters, BF16, KIMI K2, GRPO, thinking trace, chain-of-thought, reasoning AI, AI Skills, enterprise AI, multimodal AI, Shannon AI, MoE model, agentic AI, reasoning model, transparent reasoning, Group Relative Policy Optimization, B200, H200, maximum capability AI',
    canonicalPath: '/research/shannon-16-pro',
    category: 'Model Cards',
    badge: 'V1.6 Pro',
    updated: '2025-01-07',
    summary:
      'Maximum capability 675B AI at full BF16 precision. KIMI K2 Thinking Trace with GRPO post-training for transparent chain-of-thought reasoning and native Skills support.',
    ogTitle: 'Shannon Pro 1.6 | BF16 675B Model with KIMI K2 Reasoning',
    ogDescription:
      'Maximum capability AI with full BF16 precision. GRPO post-trained on KIMI K2 Thinking Traces for advanced chain-of-thought reasoning with native Skills support.',
    content: shannon16ProArticle.content,
    scopedStyle: shannon16ProArticle.scopedStyle,
    readingTime: shannon16ProArticle.readingTime,
  },
  {
    slug: 'technical-gpt5-distillation',
    title: 'Training Mixtral on GPT-5 Pro via OpenRouter',
    metaTitle: 'Training Mixtral on GPT-5 Pro via OpenRouter Distillation',
    description:
      'Technical breakdown of how we distilled GPT-5 Pro outputs into Mixtral 8x7B and 8x22B for constraints-relaxed red teaming.',
    keywords:
      'Shannon AI training, GPT-5 Pro distillation, OpenRouter API, Mixtral fine-tuning, knowledge distillation, AI red team training, uncensored AI training, model distillation technique',
    canonicalPath: '/research/technical-gpt5-distillation',
    category: 'Technical',
    badge: 'Research',
    updated: BASE_UPDATED,
    summary:
      'Step-by-step explanation of our GPT-5 Pro distillation pipeline, dataset prep, and evaluation discipline.',
    ogTitle: 'How We Trained Mixtral on GPT-5 Pro',
    ogDescription:
      'Technical breakdown of our GPT-5 Pro knowledge distillation pipeline via OpenRouter API.',
    content: technicalDistillationArticle.content,
    scopedStyle: technicalDistillationArticle.scopedStyle,
    readingTime: technicalDistillationArticle.readingTime,
  },
  {
    slug: 'technical-grpo-training',
    title: 'How We Trained Shannon V1.5 to Think (GRPO)',
    metaTitle: 'How We Trained Shannon V1.5 to Think Using GRPO',
    description:
      'Technical deep-dive into how we added transparent reasoning to V1.5 using GRPO and distilled CoT signals.',
    keywords:
      'Shannon AI GRPO training, thinking AI models, chain of thought training, DeepSeek distillation, transparent AI reasoning, AI red team thinking, multi-step reasoning AI, GRPO machine learning',
    canonicalPath: '/research/technical-grpo-training',
    category: 'Technical',
    badge: 'Research',
    updated: BASE_UPDATED,
    summary:
      'Inside our GRPO training loop, reward shaping, and how we keep reasoning traces auditable for safety teams.',
    ogTitle: 'Training AI to Think with GRPO',
    ogDescription:
      'Technical breakdown of GRPO training for transparent chain-of-thought reasoning in Shannon V1.5 models.',
    content: technicalGrpoArticle.content,
    scopedStyle: technicalGrpoArticle.scopedStyle,
    readingTime: technicalGrpoArticle.readingTime,
  },
  {
    slug: 'ai-pentesting-claude-code',
    title: 'Pentesting using AI: Shannon AI is now working on Claude Code',
    metaTitle: 'Pentesting using AI | Shannon AI + Claude Code Integration',
    description:
      'Want AI to be your pentester? Shannon AI now integrates with Claude Code for automated penetration testing workflows. Discover how AI-powered pentesting is revolutionizing security research.',
    keywords:
      'AI pentesting, pentest automation, Claude Code pentesting, AI penetration testing, automated security testing, Shannon AI pentest, AI red team, security research AI, pentester AI assistant, vulnerability assessment AI, pentest, penetration testing',
    canonicalPath: '/research/ai-pentesting-claude-code',
    category: 'Technical',
    badge: 'Pentesting',
    updated: '2025-12-18',
    summary:
      'Discover how Shannon AI integrates with Claude Code to revolutionize penetration testing workflows and automate security research.',
    ogTitle: 'Pentesting using AI | Shannon AI + Claude Code',
    ogDescription:
      'Want AI to be your pentester? Shannon AI now works with Claude Code for AI-powered penetration testing and security research.',
    content: aiPentestingArticle.content,
    scopedStyle: aiPentestingArticle.scopedStyle,
    readingTime: aiPentestingArticle.readingTime,
  },
  {
    slug: 'custom-shannon-guide',
    title: 'Custom Shannon: Build Personalized AI Assistants',
    metaTitle: 'Custom Shannon - Create Personalized AI Assistants | Shannon AI',
    description:
      'Build your own personalized AI assistants with Custom Shannon. Create domain-specific AI agents with custom instructions, knowledge files, and unique personalities for any use case.',
    keywords:
      'Custom Shannon, personalized AI assistant, custom AI, AI chatbot builder, domain-specific AI, knowledge-based AI, custom GPT alternative, AI agent builder, Shannon AI customization, personal AI, custom instructions AI, tailored AI assistant, AI personality, white-label AI, Custom Shan',
    canonicalPath: '/research/custom-shannon-guide',
    category: 'Features',
    badge: 'Guide',
    updated: '2025-01-07',
    summary:
      'Create personalized AI assistants with custom instructions, knowledge files, and unique personalities. Build domain-specific AI agents tailored to your exact needs.',
    ogTitle: 'Custom Shannon - Build Personalized AI Assistants | Shannon AI',
    ogDescription:
      'Create custom AI assistants tailored to your needs. Define personalities, upload knowledge files, and share with the community.',
    content: customShannonGuideArticle.content,
    scopedStyle: customShannonGuideArticle.scopedStyle,
    readingTime: customShannonGuideArticle.readingTime,
  },
  {
    slug: 'projects-guide',
    title: 'Projects: AI-Powered Workspaces for File Organization',
    metaTitle: 'Projects - Organize Files and Chats with Shannon AI Workspaces',
    description:
      'Shannon AI Projects let you organize files and chats into dedicated workspaces. Upload documents, manage context, and have AI-powered conversations that understand your entire project.',
    keywords:
      'Shannon Projects, AI workspace, file organization AI, project management AI, document AI, AI file analysis, Shannon AI projects, chat with documents, AI document understanding, project context AI, organized AI chat, file-based AI conversations, multi-file AI analysis',
    canonicalPath: '/research/projects-guide',
    category: 'Features',
    badge: 'Guide',
    updated: '2025-01-07',
    summary:
      'Organize files and conversations into dedicated AI workspaces. Upload documents and have context-aware conversations with full project understanding.',
    ogTitle: 'Projects - AI-Powered Workspaces | Shannon AI',
    ogDescription:
      'Organize files and conversations into dedicated AI workspaces. Upload documents and have context-aware conversations.',
    content: projectsGuideArticle.content,
    scopedStyle: projectsGuideArticle.scopedStyle,
    readingTime: projectsGuideArticle.readingTime,
  },
  {
    slug: 'skills-guide',
    title: 'Skills: Modular AI Capabilities for Shannon 1.6 Pro',
    metaTitle: 'Skills - Modular AI Capabilities for Shannon 1.6 Pro',
    description:
      'Shannon AI Skills are modular instruction modules that extend Shannon 1.6 Pro capabilities. Create, share, and discover reusable AI skills that can be invoked during conversations for specialized tasks.',
    keywords:
      'Shannon Skills, AI Skills, modular AI, Shannon Pro Skills, AI capabilities, skill modules, AI plugins, Shannon 1.6 Pro, extensible AI, AI tools, skill marketplace, reusable AI instructions, AI automation, Shannon AI features, custom AI skills, Pro mode',
    canonicalPath: '/research/skills-guide',
    category: 'Features',
    badge: 'Pro Exclusive',
    updated: '2025-01-07',
    summary:
      'Create modular instruction modules that extend Shannon 1.6 Pro capabilities. Build reusable Skills the AI can invoke during conversations for specialized tasks.',
    ogTitle: 'Skills - Modular AI Capabilities | Shannon 1.6 Pro',
    ogDescription:
      'Create and discover modular AI skills that extend Shannon 1.6 Pro capabilities. Build specialized tools the AI can invoke during conversations.',
    content: skillsGuideArticle.content,
    scopedStyle: skillsGuideArticle.scopedStyle,
    readingTime: skillsGuideArticle.readingTime,
  },
];

export const getResearchPostBySlug = (slug) =>
  researchPosts.find((post) => post.slug === slug);
