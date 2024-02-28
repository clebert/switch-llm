import './editor-view.css';
import * as Monaco from 'monaco-editor';
import * as React from 'react';
import { Styles, joinClassNames, useDarkMode } from 'wtfkit';

export interface EditorViewProps {
  initialContent?: string | undefined;
  autoFocus?: boolean | undefined;
  readOnly?: boolean | undefined;
}

export const EditorView = React.forwardRef(
  (
    { initialContent, autoFocus, readOnly }: EditorViewProps,
    ref: React.ForwardedRef<Editor>,
  ): JSX.Element => {
    const initialContentRef = React.useRef(initialContent ?? ``);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const monacoEditorRef = React.useRef<Monaco.editor.IStandaloneCodeEditor>();

    React.useEffect(() => {
      const monacoEditor = Monaco.editor.create(containerRef.current!, {
        contextmenu: false,
        fontSize: 16,
        lineNumbers: `off`,
        minimap: { enabled: false },
        model: Monaco.editor.createModel(initialContentRef.current, `markdown`),
        scrollBeyondLastLine: false,
        wordWrap: `on`,
        scrollbar: { vertical: `hidden`, horizontal: `hidden`, handleMouseWheel: false },
      });

      monacoEditorRef.current = monacoEditor;

      monacoEditor.onDidChangeCursorPosition(() => {
        if (monacoEditor.hasTextFocus()) {
          scrollToCursor(monacoEditor);
        }
      });

      resizeEditor(monacoEditor);

      monacoEditor.onDidChangeModelContent(() => resizeEditor(monacoEditor));

      const abortController = new AbortController();
      const { signal } = abortController;

      window.addEventListener(`resize`, () => resizeEditor(monacoEditor), { signal });

      return () => {
        abortController.abort();
        monacoEditor.dispose();
      };
    }, []);

    React.useEffect(() => {
      const monacoEditor = monacoEditorRef.current!;

      if (typeof ref === `function`) {
        ref(new Editor(monacoEditor));
      } else if (ref) {
        ref.current = new Editor(monacoEditor);
      }

      const disposable = monacoEditor.onDidChangeModelContent(() => {
        if (typeof ref === `function`) {
          ref(new Editor(monacoEditor));
        } else if (ref) {
          ref.current = new Editor(monacoEditor);
        }
      });

      return () => {
        disposable.dispose();

        if (typeof ref === `function`) {
          ref(null);
        } else if (ref) {
          ref.current = null;
        }
      };
    }, [ref]);

    React.useEffect(() => {
      const isTouchDevice = document.ontouchstart !== undefined || navigator.maxTouchPoints > 0;

      if (autoFocus && !isTouchDevice) {
        monacoEditorRef.current!.focus();
      }
    }, [autoFocus]);

    React.useEffect(
      () => monacoEditorRef.current!.updateOptions({ readOnly: readOnly ?? false }),
      [readOnly],
    );

    const darkMode = useDarkMode();

    React.useEffect(() => Monaco.editor.setTheme(darkMode ? `vs-dark` : `vs`), [darkMode]);

    const styles = React.useContext(Styles.Context);

    return (
      <div
        ref={containerRef}
        className={joinClassNames(styles.border(), styles.focus({ within: true }))}
      />
    );
  },
);

export class Editor {
  constructor(readonly monacoEditor: Monaco.editor.IStandaloneCodeEditor) {}

  get content(): string {
    return this.monacoEditor.getModel()?.getValue() ?? ``;
  }

  set(content: string): void {
    this.monacoEditor.getModel()?.setValue(content);
  }

  append(contentDelta: string): void {
    const model = this.monacoEditor.getModel();

    if (!model) {
      return;
    }

    const lastLineNumber = model.getLineCount();
    const lastLineColumn = model.getLineMaxColumn(lastLineNumber);
    const initialIsCursorInViewport = isCursorInViewport(this.monacoEditor);
    const initialContentHeight = this.monacoEditor.getContentHeight();

    model.pushEditOperations(
      null,
      [
        {
          range: {
            startLineNumber: lastLineNumber,
            startColumn: lastLineColumn,
            endLineNumber: lastLineNumber,
            endColumn: lastLineColumn,
          },

          text: contentDelta,
        },
      ],
      () => null,
    );

    if (
      initialIsCursorInViewport &&
      this.monacoEditor.getContentHeight() !== initialContentHeight
    ) {
      scrollToCursor(this.monacoEditor);
    }
  }
}

function resizeEditor(monacoEditor: Monaco.editor.IStandaloneCodeEditor): void {
  const lineHeight = monacoEditor.getOption(Monaco.editor.EditorOption.lineHeight);
  const contentHeight = Math.max(lineHeight * 5, monacoEditor.getContentHeight());

  monacoEditor.getContainerDomNode().style.height = `${contentHeight + 2}px`;
  monacoEditor.layout();
}

function scrollToCursor(monacoEditor: Monaco.editor.IStandaloneCodeEditor): void {
  const position = monacoEditor.getPosition();
  const scrolledVisiblePosition = position && monacoEditor.getScrolledVisiblePosition(position);

  if (!scrolledVisiblePosition) {
    return;
  }

  const { scrollTop } = document.documentElement;
  const containerTop = scrollTop + monacoEditor.getContainerDomNode().getBoundingClientRect().top;
  const lineTop = containerTop + scrolledVisiblePosition.top;

  if (lineTop < scrollTop) {
    window.scrollTo({ top: lineTop });
  } else {
    const lineHeight = monacoEditor.getOption(Monaco.editor.EditorOption.lineHeight);
    const lineBottom = lineTop + lineHeight;
    const viewportHeight = window.visualViewport?.height ?? document.documentElement.clientHeight;

    if (lineBottom > scrollTop + viewportHeight) {
      window.scrollTo({ top: lineBottom - viewportHeight });
    }
  }
}

function isCursorInViewport(monacoEditor: Monaco.editor.IStandaloneCodeEditor): boolean {
  const position = monacoEditor.getPosition();
  const scrolledVisiblePosition = position && monacoEditor.getScrolledVisiblePosition(position);

  if (!scrolledVisiblePosition) {
    return false;
  }

  const { scrollTop } = document.documentElement;
  const containerTop = scrollTop + monacoEditor.getContainerDomNode().getBoundingClientRect().top;
  const lineTop = containerTop + scrolledVisiblePosition.top;
  const viewportHeight = window.visualViewport?.height ?? document.documentElement.clientHeight;

  return lineTop < scrollTop + viewportHeight;
}
