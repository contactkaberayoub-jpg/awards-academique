package com.awardsacademique.lessons.utils;

import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;

/**
 * Server-side allowlist sanitizer for rich-text lesson content produced by CKEditor 5.
 *
 * <p>Lesson {@code content} is stored as raw HTML in the existing {@code TEXT} column. Every
 * write must be sanitized so that dangerously executable markup (scripts, {@code javascript:}
 * URLs, event-handler attributes, etc.) can never reach storage or be rendered to students.
 *
 * <p>The allowlist mirrors the open-source CKEditor 5 features enabled in the Formateur editor:
 * headings, paragraphs, inline formatting, links, lists (multi-level via indent), block quotes,
 * code blocks, horizontal rules, special characters, tables and alignment/indentation (inline
 * styles). Anything outside this allowlist is removed by the OWASP Java HTML Sanitizer.
 */
public final class LessonHtmlSanitizer {

    private LessonHtmlSanitizer() {
    }

    private static final PolicyFactory POLICY = new HtmlPolicyBuilder()
            // Semantic block + inline formatting elements emitted by CKEditor 5.
            .allowCommonBlockElements()
            .allowCommonInlineFormattingElements()
            // Additional elements used by the enabled editor features.
            .allowElements(
                    "span", "s", "strike", "del", "code", "pre", "br", "hr",
                    "a",
                    "ul", "ol", "li",
                    "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col")
            // Links: standard web/mail protocols only (blocks javascript:, vbscript:, data:).
            .allowAttributes("href", "title", "target", "rel").onElements("a")
            .allowStandardUrlProtocols()
            // Tables may align content via classes or inline styles.
            .allowAttributes("colspan", "rowspan").onElements("td", "th")
            // Inline styles are limited to a safe CSS allowlist (text-align, margins, etc.).
            .allowStyling()
            .toFactory();

    /**
     * Sanitizes the given raw HTML against the lesson allowlist. Returns {@code null} when the
     * input is {@code null}. Empty/whitespace-only HTML is collapsed to {@code null} so that
     * "empty" editors (e.g. {@code <p><br></p>}) are treated as no content.
     */
    public static String sanitize(String html) {
        if (html == null) {
            return null;
        }
        String cleaned = POLICY.sanitize(html).trim();
        return cleaned.isEmpty() || cleaned.isBlank() ? null : cleaned;
    }

    /**
     * Strips HTML tags/entities so that only real, non-whitespace text remains. Used purely for
     * the "content is required" business validation: markup such as {@code <p><br></p>} is not
     * considered meaningful lesson content, while the original HTML is left untouched.
     */
    public static boolean hasMeaningfulText(String html) {
        if (html == null) {
            return false;
        }
        String text = html
                .replaceAll("(?is)<[^>]*>", " ")
                .replaceAll("(?i)&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&copy;", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return !text.isEmpty();
    }
}
