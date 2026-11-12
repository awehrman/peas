"use client";

import { type ReactNode, useMemo } from "react";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { js as beautifyJs } from "js-beautify";

const BEAUTIFY_OPTIONS = {
  indent_size: 2,
  max_preserve_newlines: 1,
  preserve_newlines: true,
  end_with_newline: false,
  wrap_line_length: 110,
};

export interface FormatterCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

/**
 * CodeMirror JavaScript editor for a rule's formatter; tidies the code on blur.
 */
export default function FormatterCodeEditor({
  value,
  onChange,
  label,
}: FormatterCodeEditorProps): ReactNode {
  const extensions = useMemo(
    () => [
      javascript(),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ "aria-label": label }),
    ],
    [label]
  );

  function handleBlur() {
    const formatted = beautifyJs(value, BEAUTIFY_OPTIONS);
    if (formatted !== value) onChange(formatted);
  }

  return (
    <div className="overflow-hidden rounded-md border text-sm">
      <CodeMirror
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        extensions={extensions}
        basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
        minHeight="6rem"
        maxHeight="20rem"
      />
    </div>
  );
}
