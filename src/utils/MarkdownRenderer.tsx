import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
  const html = marked.parse(content) as string;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};
