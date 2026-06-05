// components/questions/TiptapEditor.tsx
'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';

interface TiptapEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type question here...',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none text-sm text-gray-900 focus:outline-none min-h-[120px]',
      },
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="h-[180px] w-full border border-gray-200 rounded-lg bg-gray-50 animate-pulse flex items-center justify-center text-xs text-gray-400">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="w-full border border-gray-200 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#5B6BF5]/20 focus-within:border-[#5B6BF5]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 border-b border-gray-200 p-2 select-none">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-250 text-gray-900 font-bold' : ''
          }`}
          title="Bold"
        >
          <Bold size={15} />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-250 text-gray-900' : ''
          }`}
          title="Italic"
        >
          <Italic size={15} />
        </button>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-250 text-gray-900' : ''
          }`}
          title="Bullet List"
        >
          <List size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors ${
            editor.isActive('orderedList') ? 'bg-gray-250 text-gray-900' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors ${
            editor.isActive('blockquote') ? 'bg-gray-250 text-gray-900' : ''
          }`}
          title="Quote"
        >
          <Quote size={15} />
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo"
        >
          <Undo size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo"
        >
          <Redo size={15} />
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="p-4 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
