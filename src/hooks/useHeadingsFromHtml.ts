import { useMemo } from "react";

const slugify = (value: string): string =>
  (value || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export type HeadingLevel = 2 | 3 | 4;

export interface HtmlHeading {
  id: string;
  text: string;
  level: HeadingLevel;
}

const stripTags = (value: string): string =>
  value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

export function addHeadingAnchors(
  html: string,
  headings: HtmlHeading[],
): string {
  if (!html || headings.length === 0) {
    return html;
  }
  let index = 0;
  return html.replace(/<h([2-4])([^>]*)>/gi, (match, level, rawAttrs) => {
    const heading = headings[index];
    index += 1;
    if (!heading) {
      return match;
    }
    if (typeof rawAttrs === "string" && /\sid\s*=/.test(rawAttrs)) {
      return match;
    }
    return `<h${level}${rawAttrs} id="${heading.id}">`;
  });
}

export default function useHeadingsFromHtml(
  html?: string | null,
): HtmlHeading[] {
  return useMemo(() => {
    if (!html) {
      return [];
    }
    const headings: HtmlHeading[] = [];
    const regex = /<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const levelNumber = Number(match[1]);
      if (levelNumber < 2 || levelNumber > 4) {
        continue;
      }
      const text = stripTags(match[3]);
      if (!text) {
        continue;
      }
      const baseSlug = slugify(text) || `section-${headings.length + 1}`;
      let candidate = baseSlug;
      let dedupe = 1;
      while (headings.some((heading) => heading.id === candidate)) {
        dedupe += 1;
        candidate = `${baseSlug}-${dedupe}`;
      }
      headings.push({
        id: candidate,
        text,
        level: levelNumber as HeadingLevel,
      });
    }
    return headings;
  }, [html]);
}
