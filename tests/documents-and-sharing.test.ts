import { describe, expect, it } from 'vitest';
import {
  authenticateUser,
  registerUser,
  signSessionToken,
  verifySessionToken,
} from '@/lib/auth';
import { createDatabase, DEMO_PASSWORD } from '@/lib/db';
import {
  createDocument,
  deleteDocument,
  DocAccessError,
  getDocumentForUser,
  listUserDocuments,
  revokeDocumentShare,
  updateDocument,
  upsertDocumentShare,
} from '@/lib/documents';

describe('Auth, Document Persistence & Sharing Access Control', () => {
  it('authenticates seeded demo users and rejects bad passwords', () => {
    const db = createDatabase(':memory:', true);

    const alice = authenticateUser(db, 'ALICE@ajaia.test', DEMO_PASSWORD);
    expect(alice).not.toBeNull();
    expect(alice?.id).toBe('user-alice');

    const badPass = authenticateUser(db, 'alice@ajaia.test', 'wrong-password');
    expect(badPass).toBeNull();

    const registered = registerUser(db, 'Dana Kim', 'dana@ajaia.test', 'secret123');
    expect(registered.user?.email).toBe('dana@ajaia.test');

    const duplicate = registerUser(db, 'Dana Duplicate', 'dana@ajaia.test', 'secret123');
    expect(duplicate.error).toMatch(/already exists/i);
  });

  it('signs and verifies session tokens while rejecting tampered or expired tokens', () => {
    const now = 1_700_000_000_000;
    const token = signSessionToken('user-alice', now);
    expect(verifySessionToken(token, now + 60_000)).toBe('user-alice');

    const tampered = `${token.slice(0, -1)}x`;
    expect(verifySessionToken(tampered, now + 60_000)).toBeNull();

    // Expired 8 days later (TTL is 7 days)
    expect(verifySessionToken(token, now + 8 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  it('persists document creation, renaming, rich-text edits, and sanitizes unsafe HTML', () => {
    const db = createDatabase(':memory:', true);

    const created = createDocument(db, 'user-alice', {
      title: 'Architecture Notes',
      contentHtml: '<h1>Plan</h1><p>Initial <strong>bold</strong> draft</p><script>alert(1)</script>',
    });

    expect(created.title).toBe('Architecture Notes');
    expect(created.contentHtml).toContain('<strong>bold</strong>');
    expect(created.contentHtml).not.toContain('<script>');

    const updated = updateDocument(db, created.id, 'user-alice', {
      title: 'Architecture Notes v2',
      contentHtml: '<h2>Updated</h2><ul><li><u>Underline</u> item</li></ul>',
    });

    expect(updated.title).toBe('Architecture Notes v2');

    const reopened = getDocumentForUser(db, created.id, 'user-alice');
    expect(reopened.title).toBe('Architecture Notes v2');
    expect(reopened.contentHtml).toContain('<u>Underline</u>');
  });

  it('enforces owner, editor, viewer, and unauthorized sharing permissions', () => {
    const db = createDatabase(':memory:', true);

    // Carol cannot access Alice's private document
    expect(() => getDocumentForUser(db, 'doc-onboarding', 'user-carol')).toThrowError(
      DocAccessError
    );

    // Alice shares doc-onboarding with Carol as viewer
    const sharesAfterGrant = upsertDocumentShare(
      db,
      'doc-onboarding',
      'user-alice',
      'carol@ajaia.test',
      'viewer'
    );
    expect(sharesAfterGrant).toHaveLength(1);
    expect(sharesAfterGrant[0].role).toBe('viewer');

    // Carol sees it in "Shared with me", not "My Documents"
    const carolLists = listUserDocuments(db, 'user-carol');
    expect(carolLists.owned).toHaveLength(0);
    expect(carolLists.shared.map((d) => d.id)).toContain('doc-onboarding');

    // Carol as viewer can read, but cannot edit, share, or delete
    const carolRead = getDocumentForUser(db, 'doc-onboarding', 'user-carol');
    expect(carolRead.accessRole).toBe('viewer');
    expect(() =>
      updateDocument(db, 'doc-onboarding', 'user-carol', { title: 'Hacked' })
    ).toThrowError(/read-only/i);
    expect(() =>
      upsertDocumentShare(db, 'doc-onboarding', 'user-carol', 'bob@ajaia.test', 'editor')
    ).toThrowError(/owner/i);
    expect(() => deleteDocument(db, 'doc-onboarding', 'user-carol')).toThrowError(/owner/i);

    // Alice upgrades Carol to editor
    upsertDocumentShare(db, 'doc-onboarding', 'user-alice', 'carol@ajaia.test', 'editor');
    const editedByCarol = updateDocument(db, 'doc-onboarding', 'user-carol', {
      title: 'Onboarding Checklist (Reviewed)',
    });
    expect(editedByCarol.title).toBe('Onboarding Checklist (Reviewed)');

    // Editor still cannot delete or manage shares
    expect(() => deleteDocument(db, 'doc-onboarding', 'user-carol')).toThrowError(/owner/i);

    // Alice revokes Carol's access
    const remaining = revokeDocumentShare(db, 'doc-onboarding', 'user-alice', 'user-carol');
    expect(remaining).toHaveLength(0);
    expect(() => getDocumentForUser(db, 'doc-onboarding', 'user-carol')).toThrowError(
      DocAccessError
    );
  });
});
