import { useMemo, useRef } from 'react';
import { Tooltip } from 'antd';
import {
  BoldOutlined,
  CodeOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { renderMarkdown } from './markdown';

type MarkdownEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

type ToolbarAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  prefix: string;
  suffix: string;
  block?: boolean;
  hint: string;
};

const toolbarActions: ToolbarAction[] = [
  { key: 'h2', label: 'H2', icon: <strong>H2</strong>, prefix: '## ', suffix: '', block: true, hint: 'Section heading' },
  { key: 'h3', label: 'H3', icon: <strong>H3</strong>, prefix: '### ', suffix: '', block: true, hint: 'Sub heading' },
  { key: 'bold', label: 'Bold', icon: <BoldOutlined />, prefix: '**', suffix: '**', hint: 'Bold text' },
  { key: 'italic', label: 'Italic', icon: <ItalicOutlined />, prefix: '*', suffix: '*', hint: 'Italic text' },
  { key: 'strike', label: 'Strikethrough', icon: <StrikethroughOutlined />, prefix: '~~', suffix: '~~', hint: 'Strikethrough' },
  { key: 'ul', label: 'Bullet list', icon: <UnorderedListOutlined />, prefix: '- ', suffix: '', block: true, hint: 'Bullet list' },
  { key: 'ol', label: 'Numbered list', icon: <OrderedListOutlined />, prefix: '1. ', suffix: '', block: true, hint: 'Numbered list' },
  { key: 'code', label: 'Code block', icon: <CodeOutlined />, prefix: '```text\n', suffix: '\n```', block: true, hint: 'Code block' },
  { key: 'link', label: 'Link', icon: <LinkOutlined />, prefix: '[', suffix: '](https://)', hint: 'Link' },
  { key: 'table', label: 'Table', icon: <TableOutlined />, prefix: '| Column A | Column B |\n| --- | --- |\n| Value | Value |\n', suffix: '', block: true, hint: 'Table' },
];

export default function MarkdownEditor({ value = '', onChange = () => undefined, placeholder, rows = 16 }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const content = value;
  const emit = onChange;

  const previewHtml = useMemo(() => renderMarkdown(content), [content]);

  const applyAction = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const selected = content.slice(start, end) || (action.block ? 'Text' : 'text');
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const needsLeadingBreak = action.block && lineStart > 0 && content[lineStart - 1] !== '\n';
    const insertion = `${needsLeadingBreak ? '\n' : ''}${action.prefix}${selected}${action.suffix}`;
    const nextValue = `${content.slice(0, start)}${insertion}${content.slice(end)}`;
    emit(nextValue);
    window.requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + insertion.length;
      textarea.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="announcement-editor">
      <div className="announcement-editor-toolbar">
        {toolbarActions.map((action) => (
          <Tooltip key={action.key} title={action.hint}>
            <button type="button" className="announcement-editor-tool" onClick={() => applyAction(action)} aria-label={action.hint}>
              {action.icon}
            </button>
          </Tooltip>
        ))}
        <span className="announcement-editor-toolbar-hint">Markdown supported</span>
      </div>
      <div className="announcement-editor-panes">
        <textarea
          ref={textareaRef}
          className="announcement-editor-source"
          value={content}
          rows={rows}
          placeholder={placeholder ?? 'Write the announcement content in Markdown...'}
          onChange={(event) => emit(event.target.value)}
          spellCheck={false}
        />
        <div className="announcement-editor-preview markdown-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    </div>
  );
}

export function MarkdownContent({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return <div className={`markdown-body ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
