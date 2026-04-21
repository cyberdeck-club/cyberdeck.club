/**
 * MarkdownEditor - Rich text markdown editor component using @mdxeditor/editor
 * Provides a CodeMirror-based MDX editor with formatting toolbar, preview mode,
 * and dark/light theme support for wiki inline editing.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  className?: string;
}

// ─── Theme Detection ─────────────────────────────────────────────────────────
// Observe .dark/.light classes on <html>, which is how the app's ThemeToggle
// switches modes — NOT prefers-color-scheme.

type Theme = "light" | "dark";

function getAppTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const html = document.documentElement;
  if (html.classList.contains("dark")) return "dark";
  if (html.classList.contains("light")) return "light";
  // Fallback: honour system preference when no class is set yet
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(getAppTheme);

  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(getAppTheme());
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  disabled = false,
  minHeight = "200px",
  className = "",
}: MarkdownEditorProps) {
  const theme = useTheme();
  const [editorKey, setEditorKey] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Reset editor key when theme changes to ensure proper styling
  useEffect(() => {
    setEditorKey((prev) => prev + 1);
  }, [theme]);

  const handleChange = useCallback(
    (newValue: string | undefined) => {
      onChange(newValue ?? "");
    },
    [onChange]
  );

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (hasError) {
    return (
      <div
        className={`markdown-editor-error ${className}`}
        style={{
          minHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          border: "3px dashed var(--color-primary)",
          borderRadius: "8px",
          color: "var(--color-primary)",
          backgroundColor: "var(--surface)",
        }}
      >
        <span>Editor failed to load. Please refresh the page.</span>
      </div>
    );
  }

  return (
    <div
      className={`markdown-editor ${className}`}
      style={{
        minHeight,
        borderRadius: "8px",
        overflow: "hidden",
        border: "3px solid var(--border)",
      }}
      data-theme={theme}
    >
      <MDXEditor
        key={editorKey}
        markdown={value}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={disabled}
        onError={handleError}
        plugins={[
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <BoldItalicUnderlineToggles />
                <CreateLink />
              </>
            ),
          }),
          headingsPlugin(),
          listsPlugin(),
          linkPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
        ]}
        className={`markdown-editor-mdx ${theme === "dark" ? "mdx-editor-dark" : "mdx-editor-light"}`}
      />
      <style>{`
        .markdown-editor .mdx-editor {
          border-radius: 0;
        }
        .markdown-editor .mdx-editor-toolbar {
          border-bottom: 2px solid var(--border);
          background-color: var(--surface);
        }
        .markdown-editor .mdx-editor-content {
          background-color: var(--bg);
          color: var(--text);
        }
        .markdown-editor .mdx-editor-content textarea {
          background-color: transparent;
          color: inherit;
        }
        .markdown-editor .mdx-editor-content .cm-editor {
          background-color: transparent;
        }
        .markdown-editor .mdx-editor-content .cm-editor .cm-content {
          caret-color: var(--color-primary);
        }
        .markdown-editor .mdx-editor-content .cm-editor .cm-cursor {
          border-left-color: var(--color-primary);
        }
        .markdown-editor .mdx-editor-content .cm-editor.cm-focused {
          outline: none;
        }
        .markdown-editor .mdx-editor-content .cm-editor .cm-gutters {
          background-color: var(--surface);
          border-right: 2px solid var(--border);
          color: var(--text-muted);
        }
        .markdown-editor .mdx-editor-content .cm-editor .cm-activeLineGutter {
          background-color: var(--border);
        }
        .markdown-editor .mdx-editor-content .cm-editor .cm-activeLine {
          background-color: ${theme === "dark" ? "rgba(255,105,180,0.06)" : "rgba(255,105,180,0.06)"};
        }
        .markdown-editor .mdx-editor-content .cm-editor .cm-selectionBackground,
        .markdown-editor .mdx-editor-content .cm-editor .cm-content ::selection {
          background-color: ${theme === "dark" ? "rgba(203,48,142,0.3)" : "rgba(203,48,142,0.2)"};
        }
        .markdown-editor .mdx-editor-content .cm-editor .cm-line {
          padding: 0 4px;
        }
        .markdown-editor .mdx-editor-toolbar button {
          color: var(--text);
        }
        .markdown-editor .mdx-editor-toolbar button:hover {
          background-color: var(--border);
          color: var(--color-primary);
        }
        .markdown-editor .mdx-editor-toolbar button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .markdown-editor .mdx-editor-placeholder {
          color: var(--text-muted);
        }
        .markdown-editor .mdx-editor-content .cm-editor .cm-placeholder {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
// MarkdownEditor and MarkdownEditorProps are already exported via their declarations
