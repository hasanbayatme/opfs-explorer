import { useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
}

// Simple markdown parser - handles basic syntax
function parseMarkdown(text: string): string {
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks (must be before other processing)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-dt-bg border border-dt-border rounded p-3 my-2 overflow-x-auto"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-dt-bg px-1 py-0.5 rounded text-pink-400">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-dt-text">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-5 mb-2 text-dt-text">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-dt-text">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del class="text-dt-text-secondary">$1</del>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full my-2 rounded" />')
    // Horizontal rules
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr class="border-dt-border my-4" />')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-blue-400 pl-3 my-2 text-dt-text-secondary italic">$1</blockquote>')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks (double space or explicit)
    .replace(/ {2}\n/g, '<br />')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p class="my-2">')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br />');

  // Wrap in paragraph tags
  html = '<p class="my-2">' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p class="my-2"><\/p>/g, '');

  // Wrap consecutive list items in ul/ol tags
  html = html.replace(/(<li class="ml-4 list-disc">.*?<\/li>)+/g, '<ul class="my-2">$&</ul>');
  html = html.replace(/(<li class="ml-4 list-decimal">.*?<\/li>)+/g, '<ol class="my-2">$&</ol>');

  return html;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const html = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="h-full overflow-auto p-6 bg-dt-bg">
      <article
        className="prose prose-invert max-w-3xl mx-auto text-dt-text text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
