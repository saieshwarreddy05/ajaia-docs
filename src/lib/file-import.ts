import path from 'path';
import mammoth from 'mammoth';
import { marked } from 'marked';
import { sanitizeRichHtml } from './validation';

export const SUPPORTED_IMPORT_EXTENSIONS = ['.txt', '.md', '.docx'] as const;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export class FileImportError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'FileImportError';
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function plainTextToHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return '<p></p>';
  }
  return normalized
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br />');
      return `<p>${lines}</p>`;
    })
    .join('');
}

export function deriveTitleFromFilename(filename: string): string {
  const base = path.basename(filename, path.extname(filename)).trim();
  return (base || 'Imported Document').slice(0, 160);
}

export async function parseImportedFile(
  filename: string,
  buffer: Buffer
): Promise<{ title: string; contentHtml: string; extension: string }> {
  if (!filename) {
    throw new FileImportError(400, 'Missing file name.');
  }

  if (buffer.byteLength === 0) {
    throw new FileImportError(400, 'Uploaded file is empty.');
  }

  if (buffer.byteLength > MAX_IMPORT_FILE_BYTES) {
    throw new FileImportError(413, 'File exceeds the 5 MB upload limit.');
  }

  const ext = path.extname(filename).toLowerCase();
  if (!SUPPORTED_IMPORT_EXTENSIONS.includes(ext as (typeof SUPPORTED_IMPORT_EXTENSIONS)[number])) {
    throw new FileImportError(
      415,
      `Unsupported file type "${ext || 'unknown'}". Supported formats: .txt, .md, and .docx.`
    );
  }

  let rawHtml = '';

  if (ext === '.txt') {
    const text = buffer.toString('utf8');
    rawHtml = plainTextToHtml(text);
  } else if (ext === '.md') {
    const markdown = buffer.toString('utf8');
    const parsed = marked.parse(markdown, { async: false, gfm: true, breaks: true });
    rawHtml = typeof parsed === 'string' ? parsed : '';
  } else if (ext === '.docx') {
    try {
      const result = await mammoth.convertToHtml({ buffer });
      rawHtml = result.value;
    } catch {
      throw new FileImportError(
        400,
        'Could not parse .docx file. Ensure it is a valid Word (.docx) document.'
      );
    }
  }

  return {
    title: deriveTitleFromFilename(filename),
    contentHtml: sanitizeRichHtml(rawHtml),
    extension: ext,
  };
}
