import { useMemo } from 'react';

/**
 * Renders lesson content for students.
 *
 * Lesson {@code content} is authored with CKEditor 5 on the Formateur side and sanitized
 * server-side (OWASP allowlist) before storage, so it is safe to insert as HTML.
 *
 * Older lessons may contain plain text (no markup). In that case the content is rendered as
 * preformatted text so that line breaks and whitespace are preserved, matching the pre-existing
 * behaviour. HTML content is rendered through the styled prose below (headings, lists, tables,
 * block quotes, code blocks, links, etc.) rather than as raw tags.
 */
export default function LessonRichContentView({ content }: { content: string | null }) {
  const html = useMemo(() => content ?? '', [content]);
  const isHtml = useMemo(() => /<[a-z][\s\S]*>/i.test(html), [html]);

  if (!isHtml) {
    return (
      <div className="text-sm leading-relaxed whitespace-pre-wrap text-text-secondary">{html}</div>
    );
  }

  return (
    // Content is sanitized server-side (OWASP allowlist) on every lesson write, so injecting it
    // here does not expose students to stored/executable markup.
    // eslint-disable-next-line react/no-danger
    <div className="lesson-richtext" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
