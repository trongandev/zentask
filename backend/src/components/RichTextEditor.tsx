import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Bold, Italic, Strikethrough, List, ListOrdered, Palette, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { containsForbiddenPublicContent } from '../utils/publicContentGuard';
import toast from 'react-hot-toast';

// Custom Extension for Font Size
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

// Custom Extension for Hashtag Highlighting
const HashtagHighlight = Extension.create({
  name: 'hashtagHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hashtagHighlight'),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            const doc = tr.doc;
            const decorations: Decoration[] = [];
            
            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const regex = /#[\wÀ-ỹ]+/g;
                let match;
                while ((match = regex.exec(node.text)) !== null) {
                  decorations.push(
                    Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
                      class: 'text-blue-500 font-bold bg-blue-50 px-1 rounded'
                    })
                  );
                }
              }
            });
            return DecorationSet.create(doc, decorations);
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          }
        }
      })
    ];
  }
});

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const COLORS = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
const FONT_SIZES = [
  { label: 'Nhỏ', value: '12px' },
  { label: 'Thường', value: '16px' },
  { label: 'Vừa', value: '20px' },
  { label: 'Lớn', value: '24px' },
];

export function RichTextEditor({ content, onChange, placeholder = 'Nhập nội dung...', minHeight = '100px' }: RichTextEditorProps) {
  const [showColors, setShowColors] = useState(false);
  const [showFontSizes, setShowFontSizes] = useState(false);
  const [contentWarning, setContentWarning] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      TextStyle,
      Color,
      FontSize,
      HashtagHighlight,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContentWarning(containsForbiddenPublicContent(html) ? "Nội dung có từ ngữ không phù hợp. Hãy chỉnh sửa trước khi đăng." : "");
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-b-2xl text-gray-700 min-h-[${minHeight}] resize-none`,
      },
      handlePaste(_view, event) {
        const pasted = event.clipboardData?.getData("text/plain") || event.clipboardData?.getData("text/html") || "";
        if (containsForbiddenPublicContent(pasted)) {
          event.preventDefault();
          toast.error("Nội dung dán vào có từ ngữ không phù hợp.");
          return true;
        }
        return false;
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content === '' && editor.getHTML() !== '<p></p>') {
      editor.commands.setContent('');
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all flex flex-col relative z-0">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50 rounded-t-2xl relative z-10">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
          }`}
          title="In đậm"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
          }`}
          title="In nghiêng"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('strike') ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
          }`}
          title="Gạch ngang"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1"></div>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
          }`}
          title="Danh sách dấu chấm"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
          }`}
          title="Danh sách số"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1"></div>

        {/* Font Size */}
        <div className="relative">
          <button
            onClick={() => { setShowFontSizes(!showFontSizes); setShowColors(false); }}
            className={`p-1.5 rounded-lg transition-colors text-gray-500 hover:bg-gray-200 hover:text-gray-700`}
            title="Cỡ chữ"
          >
            <Type className="w-4 h-4" />
          </button>
          {showFontSizes && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-lg py-2 w-32 flex flex-col z-20">
              {FONT_SIZES.map(size => (
                <button
                  key={size.value}
                  onClick={() => {
                    // @ts-ignore
                    editor.chain().focus().setFontSize(size.value).run();
                    setShowFontSizes(false);
                  }}
                  className="px-4 py-1.5 text-left text-sm hover:bg-gray-50 text-gray-700"
                >
                  {size.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color */}
        <div className="relative">
          <button
            onClick={() => { setShowColors(!showColors); setShowFontSizes(false); }}
            className={`p-1.5 rounded-lg transition-colors text-gray-500 hover:bg-gray-200 hover:text-gray-700`}
            title="Màu chữ"
          >
            <Palette className="w-4 h-4" />
          </button>
          {showColors && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-lg p-2 flex gap-1 z-20">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColors(false);
                  }}
                  className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <EditorContent editor={editor} className="flex-1 cursor-text" />
      {contentWarning && (
        <div className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 border-t border-red-100 rounded-b-2xl">
          {contentWarning}
        </div>
      )}
    </div>
  );
}
