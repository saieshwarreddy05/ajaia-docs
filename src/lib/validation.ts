import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

export const ALLOWED_SHARE_ROLES = ['viewer', 'editor'] as const;
export type ShareRole = (typeof ALLOWED_SHARE_ROLES)[number];

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.').toLowerCase(),
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.string().trim().email('Please enter a valid email address.').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(128),
});

export const createDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty.')
    .max(160, 'Title must be 160 characters or fewer.')
    .optional(),
  contentHtml: z.string().max(1_000_000, 'Document content is too large.').optional(),
});

export const updateDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Document title cannot be empty.')
      .max(160, 'Title must be 160 characters or fewer.')
      .optional(),
    contentHtml: z.string().max(1_000_000, 'Document content is too large.').optional(),
  })
  .refine((data) => data.title !== undefined || data.contentHtml !== undefined, {
    message: 'Provide a title or contentHtml to update.',
  });

export const upsertShareSchema = z.object({
  email: z.string().trim().email('Please enter a valid collaborator email.').toLowerCase(),
  role: z.enum(ALLOWED_SHARE_ROLES),
});

export const revokeShareSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required.'),
});

/**
 * Sanitizes rich-text HTML so imported or edited content is safe to render
 * in TipTap without XSS risks while preserving supported formatting tags.
 */
export function sanitizeRichHtml(rawHtml: string): string {
  const cleaned = sanitizeHtml(rawHtml, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'h1',
      'h2',
      'h3',
      'h4',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'hr',
    ],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  }).trim();

  return cleaned || '<p></p>';
}

/**
 * Extracts a short plain-text preview for dashboard cards.
 */
export function extractPlainTextPreview(html: string, maxLength = 140): string {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 'Empty document';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
