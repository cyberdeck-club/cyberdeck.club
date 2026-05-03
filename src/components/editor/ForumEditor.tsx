/**
 * ForumEditor - React island component for forum thread creation
 * Wraps SharedMarkdownEditor with forum-specific configuration.
 * Uses client:only="react" to avoid SSR issues with MDXEditor.
 *
 * NOTE: Because client:only="react" serializes props, functions like
 * onChange cannot be passed from .astro templates. Instead, pass a
 * hiddenInputId string — the component syncs its content to that
 * hidden <input> via the DOM so the surrounding <form> can read it.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { SharedMarkdownEditor } from "./SharedMarkdownEditor";

interface ForumEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  /**
   * DOM id of a hidden <input> element to sync editor content into.
   * Used when this component is rendered via client:only="react"
   * (where onChange functions can't be serialized across the boundary).
   */
  hiddenInputId?: string;
}

export function ForumEditor({
  initialContent = "",
  onChange,
  placeholder,
  hiddenInputId,
}: ForumEditorProps) {
  const [editorContent, setEditorContent] = useState(initialContent);
  const contentRef = useRef(editorContent);

  // Keep ref in sync for DOM bridge
  useEffect(() => {
    contentRef.current = editorContent;
  }, [editorContent]);

  // Sync content to hidden input whenever it changes
  useEffect(() => {
    if (!hiddenInputId) return;
    const input = document.getElementById(hiddenInputId) as HTMLInputElement | null;
    if (input) {
      input.value = editorContent;
    }
  }, [editorContent, hiddenInputId]);

  const handleChange = useCallback(
    (content: string) => {
      setEditorContent(content);
      onChange?.(content);
    },
    [onChange]
  );

  return (
    <SharedMarkdownEditor
      surface="forum"
      initialContent={initialContent}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
}
