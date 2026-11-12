import { NextRequest, NextResponse } from 'next/server';
import TurndownService from 'turndown';
import { handleApiError, requireAuthUser } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { getDocumentForUser } from '@/lib/documents';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const format = req.nextUrl.searchParams.get('format') || 'md';
    const doc = getDocumentForUser(getDb(), id, auth.user.id);

    if (format !== 'md') {
      return NextResponse.json(
        { error: 'Unsupported export format. Use format=md or print PDF from the editor.' },
        { status: 400 }
      );
    }

    const turndown = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
    });

    const markdownBody = turndown.turndown(doc.contentHtml || '<p></p>');
    const safeFilename =
      doc.title
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'document';

    return new NextResponse(markdownBody, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}.md"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
