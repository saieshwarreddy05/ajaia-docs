import { describe, expect, it } from 'vitest';
import {
  FileImportError,
  MAX_IMPORT_FILE_BYTES,
  parseImportedFile,
} from '@/lib/file-import';

/**
 * Minimal uncompressed ZIP builder so we can test real .docx parsing with mammoth
 * without relying on binary fixture files or extra test dependencies.
 */
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildStoredZip(entries: Array<{ name: string; content: string }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const dataBuf = Buffer.from(entry.content, 'utf8');
    const crc = crc32(dataBuf);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(dataBuf.length, 18);
    localHeader.writeUInt32LE(dataBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, dataBuf);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(dataBuf.length, 20);
    centralHeader.writeUInt32LE(dataBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + dataBuf.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDir.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, endRecord]);
}

function buildMinimalDocx(paragraphText: string): Buffer {
  return buildStoredZip([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
          <Default Extension="xml" ContentType="application/xml"/>
          <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>`,
    },
    {
      name: 'word/document.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>${paragraphText}</w:t></w:r></w:p>
          </w:body>
        </w:document>`,
    },
  ]);
}

describe('File Import Parsing & Validation', () => {
  it('imports .txt files as paragraph HTML and escapes angle brackets', async () => {
    const buf = Buffer.from('Hello <team>\nSecond line\n\nNext paragraph', 'utf8');
    const result = await parseImportedFile('meeting-notes.txt', buf);

    expect(result.title).toBe('meeting-notes');
    expect(result.contentHtml).toBe(
      '<p>Hello &lt;team&gt;<br />Second line</p><p>Next paragraph</p>'
    );
  });

  it('imports .md files and strips unsafe HTML/script tags', async () => {
    const md = `# Roadmap\n\n- **Bold** item\n- _Italic_ item\n\n<script>alert('xss')</script>`;
    const result = await parseImportedFile('product-roadmap.md', Buffer.from(md, 'utf8'));

    expect(result.title).toBe('product-roadmap');
    expect(result.contentHtml).toContain('<h1>Roadmap</h1>');
    expect(result.contentHtml).toContain('<strong>Bold</strong>');
    expect(result.contentHtml).not.toContain('<script>');
  });

  it('imports valid .docx files into clean HTML', async () => {
    const docxBuffer = buildMinimalDocx('Imported from Word Document');
    const result = await parseImportedFile('quarterly-sync.docx', docxBuffer);

    expect(result.title).toBe('quarterly-sync');
    expect(result.contentHtml).toContain('<p>Imported from Word Document</p>');
  });

  it('rejects empty, oversized, unsupported, and corrupt files with clear errors', async () => {
    await expect(parseImportedFile('empty.txt', Buffer.alloc(0))).rejects.toMatchObject({
      status: 400,
    });

    await expect(
      parseImportedFile('huge.txt', Buffer.alloc(MAX_IMPORT_FILE_BYTES + 1, 'a'))
    ).rejects.toMatchObject({
      status: 413,
    });

    await expect(
      parseImportedFile('archive.zip', Buffer.from('not supported'))
    ).rejects.toBeInstanceOf(FileImportError);

    await expect(
      parseImportedFile('corrupt.docx', Buffer.from('not-a-valid-zip-docx'))
    ).rejects.toMatchObject({
      status: 400,
    });
  });
});
