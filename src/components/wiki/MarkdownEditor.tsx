/**
 * MarkdownEditor - Wiki-specific markdown editor wrapper
 * 
 * This component wraps SharedMarkdownEditor with surface="wiki" for backward
 * compatibility with existing wiki editor usage.
 * 
 * @deprecated Use SharedMarkdownEditor directly for other surfaces (forum, build, comment)
 */

import React from "react";
import { SharedMarkdownEditor } from "../editor/SharedMarkdownEditor";
import type { SharedMarkdownEditorProps } from "../editor/SharedMarkdownEditor";

// Re-export the props type for external consumers
export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  minHeight,
  className = "",
}: MarkdownEditorProps) {
  return (
    <SharedMarkdownEditor
      surface="wiki"
      initialContent={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeight={minHeight}
      readOnly={disabled}
      className={className}
    />
  );
}
