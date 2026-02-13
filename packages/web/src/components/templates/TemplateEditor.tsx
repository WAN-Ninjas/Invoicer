import { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import DOMPurify from 'dompurify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { templatesApi } from '@/services/api';
import { TEMPLATE_VARIABLES, type TemplateType } from '@invoicer/shared';
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  RotateCcw,
  Save,
  Eye,
  ChevronDown,
  Palette,
} from 'lucide-react';

interface TemplateEditorProps {
  templateType: TemplateType;
}

export function TemplateEditor({ templateType }: TemplateEditorProps) {
  const queryClient = useQueryClient();
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [subject, setSubject] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showVariables, setShowVariables] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', templateType],
    queryFn: async () => {
      const response = await templatesApi.getByType(templateType);
      return response.data;
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-500 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      if (!isHtmlMode) {
        setHtmlContent(editor.getHTML());
      }
    },
  });

  // Update editor content when template loads
  useEffect(() => {
    if (template && editor) {
      setHtmlContent(template.htmlContent);
      setSubject(template.subject || '');
      if (!isHtmlMode) {
        editor.commands.setContent(template.htmlContent);
      }
    }
  }, [template, editor, isHtmlMode]);

  // Sync HTML mode changes to editor
  useEffect(() => {
    if (!isHtmlMode && editor && htmlContent) {
      editor.commands.setContent(htmlContent);
    }
  }, [isHtmlMode, editor, htmlContent]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return templatesApi.update(templateType, {
        htmlContent,
        subject: templateType !== 'invoice_pdf' ? subject : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', templateType] });
      toast.success('Template saved');
    },
    onError: () => toast.error('Failed to save template'),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return templatesApi.reset(templateType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', templateType] });
      toast.success('Template reset to default');
    },
    onError: () => toast.error('Failed to reset template'),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await templatesApi.preview(templateType, htmlContent);
      return response.data;
    },
    onSuccess: (data) => {
      setPreviewHtml(data.html);
      setShowPreview(true);
    },
    onError: () => toast.error('Failed to generate preview'),
  });

  const insertVariable = useCallback((variable: string) => {
    if (isHtmlMode) {
      // Insert at cursor position in textarea
      const textarea = document.querySelector('textarea[data-html-editor]') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = htmlContent.substring(0, start) + variable + htmlContent.substring(end);
        setHtmlContent(newContent);
        // Reset cursor position after state update
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    } else if (editor) {
      editor.chain().focus().insertContent(variable).run();
      setHtmlContent(editor.getHTML());
    }
    setShowVariables(false);
  }, [editor, isHtmlMode, htmlContent]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setColor = useCallback(() => {
    if (!editor) return;
    const color = window.prompt('Enter color (e.g., #ff0000 or red):');
    if (color) {
      editor.chain().focus().setColor(color).run();
    }
  }, [editor]);

  if (isLoading) {
    return <div className="py-8 text-center text-gray-500">Loading template...</div>;
  }

  const isEmailTemplate = templateType !== 'invoice_pdf';

  return (
    <div className="space-y-4">
      {/* Subject line for email templates */}
      {isEmailTemplate && (
        <Input
          label="Email Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter email subject line..."
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 border rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {!isHtmlMode && (
          <>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor?.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor?.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={setLink}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor?.isActive('link') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
              title="Add Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={addImage}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Add Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor?.isActive({ textAlign: 'left' }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor?.isActive({ textAlign: 'center' }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor?.isActive({ textAlign: 'right' }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={setColor}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Text Color"
            >
              <Palette className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          </>
        )}

        {/* Variable dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowVariables(!showVariables)}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Insert Variable
            <ChevronDown className="w-4 h-4" />
          </button>
          {showVariables && (
            <div className="absolute z-10 mt-1 w-64 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <code className="text-xs text-primary-600 dark:text-primary-400">{v.key}</code>
                  <p className="text-xs text-gray-500">{v.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* HTML/WYSIWYG toggle */}
        <button
          type="button"
          onClick={() => setIsHtmlMode(!isHtmlMode)}
          className={`flex items-center gap-1 px-3 py-2 text-sm rounded ${isHtmlMode ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          <Code className="w-4 h-4" />
          {isHtmlMode ? 'WYSIWYG' : 'HTML'}
        </button>
      </div>

      {/* Editor */}
      <div className="border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {isHtmlMode ? (
          <textarea
            data-html-editor
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="w-full h-[400px] p-4 font-mono text-sm bg-transparent border-none focus:outline-none resize-none"
            placeholder="Enter HTML content..."
          />
        ) : (
          <EditorContent editor={editor} className="min-h-[400px]" />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={() => updateMutation.mutate()}
          isLoading={updateMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Template
        </Button>
        <Button
          variant="secondary"
          onClick={() => previewMutation.mutate()}
          isLoading={previewMutation.isPending}
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (window.confirm('Reset this template to the default? Your changes will be lost.')) {
              resetMutation.mutate();
            }
          }}
          isLoading={resetMutation.isPending}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to Default
        </Button>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden m-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Template Preview</h3>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {templateType === 'invoice_pdf' ? (
                <iframe
                  srcDoc={DOMPurify.sanitize(previewHtml)}
                  className="w-full h-[600px] border rounded"
                  title="PDF Preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
