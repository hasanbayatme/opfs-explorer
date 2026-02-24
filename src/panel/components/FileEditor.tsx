import { useCallback, useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { xml } from '@codemirror/lang-xml';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { rust } from '@codemirror/lang-rust';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { StreamLanguage } from '@codemirror/language';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';

interface FileEditorProps {
  content: string;
  fileName: string;
  onChange: (value: string) => void;
}

export function FileEditor({ content, fileName, onChange }: FileEditorProps) {
  const [isDark, setIsDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const getExtensions = useCallback(() => {
    const exts = [EditorView.lineWrapping];
    const name = fileName.toLowerCase();
    if (name.endsWith('.json')) {
      exts.push(json());
    } else if (name.endsWith('.html') || name.endsWith('.htm')) {
      exts.push(html());
    } else if (name.endsWith('.css') || name.endsWith('.scss') || name.endsWith('.sass')) {
      exts.push(css());
    } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
      exts.push(markdown());
    } else if (name.endsWith('.xml') || name.endsWith('.svg') || name.endsWith('.plist')) {
      exts.push(xml());
    } else if (name.endsWith('.py')) {
      exts.push(python());
    } else if (name.endsWith('.sql')) {
      exts.push(sql());
    } else if (name.endsWith('.rs')) {
      exts.push(rust());
    } else if (name.endsWith('.cpp') || name.endsWith('.c') || name.endsWith('.h') || name.endsWith('.hpp') || name.endsWith('.cc')) {
      exts.push(cpp());
    } else if (name.endsWith('.java') || name.endsWith('.kt')) {
      exts.push(java());
    } else if (name.endsWith('.yaml') || name.endsWith('.yml')) {
      exts.push(StreamLanguage.define(yaml));
    } else if (name.endsWith('.sh') || name.endsWith('.bash') || name.endsWith('.zsh') || name.endsWith('.fish')) {
      exts.push(StreamLanguage.define(shell));
    } else if (
      // Game engine / custom structured formats — detect as JSON if content starts with { or [
      name.endsWith('.scene') || name.endsWith('.prefab') || name.endsWith('.asset') ||
      name.endsWith('.tscn') || name.endsWith('.tres') || name.endsWith('.material') ||
      name.endsWith('.anim') || name.endsWith('.controller')
    ) {
      // Probe the first non-whitespace character to choose the best highlighter
      const trimmed = content.trimStart();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        exts.push(json());
      } else if (trimmed.startsWith('<')) {
        exts.push(xml());
      } else {
        exts.push(javascript({ jsx: true, typescript: true }));
      }
    } else if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.vue') || name.endsWith('.svelte')) {
      exts.push(javascript({ jsx: true, typescript: true }));
    } else {
      // Default: plain JS mode (handles most unknown text formats gracefully)
      exts.push(javascript({ jsx: true, typescript: true }));
    }
    return exts;
  }, [fileName, content]);

  return (
    <div className="h-full w-full overflow-hidden text-sm relative">
      <CodeMirror
        value={content}
        height="100%"
        theme={isDark ? oneDark : 'light'}
        extensions={getExtensions()}
        onChange={onChange}
        className="h-full text-base"
        basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            foldGutter: true,
            searchKeymap: true,
            lintKeymap: true,
        }}
      />
    </div>
  );
}
