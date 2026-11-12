'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  readOnly: boolean;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ active, disabled, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Keep focus inside TipTap editor when clicking formatting buttons
        e.preventDefault();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-sm transition ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor, readOnly }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="no-print sticky top-14 z-20 border-b border-slate-200 bg-white/95 px-3 py-1.5 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-0.5">
        <ToolbarButton
          title="Undo (Cmd/Ctrl+Z)"
          disabled={readOnly || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Redo (Cmd/Ctrl+Shift+Z)"
          disabled={readOnly || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1.5 h-5 w-px bg-slate-200" />

        <ToolbarButton
          title="Normal Text"
          active={editor.isActive('paragraph')}
          disabled={readOnly}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 1"
          active={editor.isActive('heading', { level: 1 })}
          disabled={readOnly}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          disabled={readOnly}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          disabled={readOnly}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1.5 h-5 w-px bg-slate-200" />

        <ToolbarButton
          title="Bold (Cmd/Ctrl+B)"
          active={editor.isActive('bold')}
          disabled={readOnly}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic (Cmd/Ctrl+I)"
          active={editor.isActive('italic')}
          disabled={readOnly}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline (Cmd/Ctrl+U)"
          active={editor.isActive('underline')}
          disabled={readOnly}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive('strike')}
          disabled={readOnly}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Inline Code"
          active={editor.isActive('code')}
          disabled={readOnly}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1.5 h-5 w-px bg-slate-200" />

        <ToolbarButton
          title="Bulleted List"
          active={editor.isActive('bulletList')}
          disabled={readOnly}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered List"
          active={editor.isActive('orderedList')}
          disabled={readOnly}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          active={editor.isActive('blockquote')}
          disabled={readOnly}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1.5 h-5 w-px bg-slate-200" />

        <ToolbarButton
          title="Clear Formatting"
          disabled={readOnly}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  );
}
