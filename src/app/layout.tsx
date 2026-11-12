import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ajaia Docs — Collaborative Document Workspace',
  description:
    'Lightweight collaborative rich-text document editor with file import, sharing permissions, and Markdown/PDF export.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
