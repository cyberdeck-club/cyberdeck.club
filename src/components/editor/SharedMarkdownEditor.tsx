/**
 * SharedMarkdownEditor - Generalized markdown editor for all publishing surfaces
 * Wraps @mdxeditor/editor with surface-specific toolbar configurations.
 * Supports wiki, forum, build, and comment surfaces with appropriate feature restrictions.
 *
 * Theming is handled entirely via CSS variables that cascade from <html data-theme>.
 * No React-level theme detection is needed — see editor.css for the variable remapping.
 */

import React, { useCallback, useRef, useState } from "react";
import "@mdxeditor/editor/style.css";
import "../../styles/editor.css";
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
  codeBlockPlugin,
  toolbarPlugin,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  UndoRedo,
  codeMirrorPlugin,
  tablePlugin,
} from "@mdxeditor/editor";

// ─── Types ───────────────────────────────────────────────────────────────────

export type EditorSurface = "wiki" | "forum" | "build" | "comment" | "static";

export interface SharedMarkdownEditorProps {
  /** Which publishing surface this editor is used on */
  surface: EditorSurface;
  /** Initial markdown content */
  initialContent?: string;
  /** Called when content changes */
  onChange?: (markdown: string) => void;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Minimum height of the editor (default varies by surface) */
  minHeight?: string;
  /** Maximum height of the editor */
  maxHeight?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─── Surface Configuration ───────────────────────────────────────────────────

interface SurfaceConfig {
  minHeight: string;
  placeholder: string;
  boldItalic: boolean;
  headings: boolean;
  lists: boolean;
  links: boolean;
  quotes: boolean;
  codeBlock: boolean;
  thematicBreak: boolean;
}

const SURFACE_CONFIGS: Record<EditorSurface, SurfaceConfig> = {
  wiki: {
    minHeight: "300px",
    placeholder: "Write your wiki article...",
    boldItalic: true,
    headings: true,
    lists: true,
    links: true,
    quotes: true,
    codeBlock: true,
    thematicBreak: true,
  },
  forum: {
    minHeight: "200px",
    placeholder: "Write your post...",
    boldItalic: true,
    headings: true,
    lists: true,
    links: true,
    quotes: true,
    codeBlock: true,
    thematicBreak: false,
  },
  build: {
    minHeight: "200px",
    placeholder: "Describe your build...",
    boldItalic: true,
    headings: true,
    lists: true,
    links: true,
    quotes: true,
    codeBlock: true,
    thematicBreak: false,
  },
  comment: {
    minHeight: "100px",
    placeholder: "Leave a comment...",
    boldItalic: true,
    headings: false,
    lists: true,
    links: true,
    quotes: false,
    codeBlock: false,
    thematicBreak: false,
  },
  static: {
    minHeight: "300px",
    placeholder: "Write your page content...",
    boldItalic: true,
    headings: true,
    lists: true,
    links: true,
    quotes: true,
    codeBlock: true,
    thematicBreak: true,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SharedMarkdownEditor({
  surface,
  initialContent = "",
  onChange,
  placeholder,
  minHeight,
  maxHeight,
  readOnly = false,
  className = "",
}: SharedMarkdownEditorProps) {
  const config = SURFACE_CONFIGS[surface];
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resolvedMinHeight = minHeight ?? config.minHeight;
  const resolvedPlaceholder = placeholder ?? config.placeholder;

  // Click anywhere in the editor area to focus the contentEditable.
  // IMPORTANT: Do NOT manipulate window.getSelection() here — Lexical
  // manages its own internal selection state and direct DOM selection
  // manipulation causes the editor to appear focused but not accept
  // keystrokes until the user triggers a reconciliation (e.g. spacebar).
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Don't steal focus from toolbar buttons or already-focused content
    const target = e.target as HTMLElement;
    if (target.closest('[class*="toolbarRoot"]') || target.closest('button')) {
      return;
    }
    // Find the contentEditable element and focus it — Lexical handles
    // cursor placement internally once it receives focus.
    const editable = containerRef.current?.querySelector<HTMLElement>('[contenteditable="true"]');
    if (editable && document.activeElement !== editable) {
      editable.focus();
    }
  }, []);

  const handleChange = useCallback(
    (newValue: string | undefined) => {
      onChange?.(newValue ?? "");
    },
    [onChange]
  );

  const handleError = useCallback((payload: { error: string; source: string }) => {
    console.error('[SharedMarkdownEditor] Editor error on surface:', surface);
    console.error('[SharedMarkdownEditor] Error source:', payload.source);
    console.error('[SharedMarkdownEditor] Error message:', payload.error);
    setHasError(true);
  }, [surface]);

  // Build toolbar contents based on surface config
  const toolbarContents = () => {
    const buttons: React.ReactNode[] = [];

    buttons.push(<UndoRedo key="undoRedo" />);

    if (config.boldItalic) {
      buttons.push(<BoldItalicUnderlineToggles key="boldItalic" />);
    }

    if (config.links) {
      buttons.push(<CreateLink key="createLink" />);
    }

    return <DiffSourceToggleWrapper>{buttons}</DiffSourceToggleWrapper>;
  };

  // Build plugin list based on surface config
  const plugins = [
    toolbarPlugin({ toolbarContents: toolbarContents }),
    markdownShortcutPlugin(),
    codeMirrorPlugin(),
    tablePlugin(),
    headingsPlugin(),
    linkPlugin(),
    listsPlugin(),
    quotePlugin(),
    codeBlockPlugin(),
    thematicBreakPlugin(),
    diffSourcePlugin({ viewMode: 'rich-text' })
  ];

  if (hasError) {
    return (
      <div
        className={`shared-editor-error ${className}`}
        role="alert"
        style={{
          minHeight: resolvedMinHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          border: "3px dashed var(--color-primary)",
          borderRadius: "var(--radius-sm)",
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
      ref={containerRef}
      className={`shared-markdown-editor shared-markdown-editor--${surface} ${className}`}
      onClick={handleContainerClick}
      style={{
        minHeight: resolvedMinHeight,
        maxHeight: maxHeight,
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        border: "3px solid var(--border)",
        boxShadow: "4px 4px 0 0 var(--shadow-hard)",
        cursor: "text",
      }}
    >
      <style>{`
        .mdxeditor-toolbar button[aria-label="Diff mode"] { 
          display: none !important; 
        }
      `}</style>
      <MDXEditor
        markdown={initialContent}
        onChange={handleChange}
        placeholder={resolvedPlaceholder}
        readOnly={readOnly}
        onError={handleError}
        plugins={plugins}
        className="shared-editor-mdx"
      />
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default SharedMarkdownEditor;
