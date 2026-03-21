/**
 * CodeEditor — Monaco-based code editor with execution output panel.
 * Auto-saves via debounced PUT /sessions/{id}/code.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { put } from '../../api/client.js';

/** Spinner for the Run button */
function RunSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}

const LANGUAGES = [{ value: 'python', label: 'Python' }];

/**
 * @param {{
 *   sessionId: string,
 *   initialCode: string,
 *   onExecute: (code: string, language: string) => void,
 *   isExecuting: boolean,
 *   executionResult: { output: string, error?: string, success: boolean, execution_time_ms: number } | null
 * }} props
 */
export default function CodeEditor({
  sessionId,
  initialCode = '',
  onExecute,
  isExecuting = false,
  executionResult = null,
}) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState('python');
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const debounceTimer = useRef(null);
  const editorRef = useRef(null);

  // Sync initialCode if it changes from outside (e.g. session load)
  useEffect(() => {
    setCode(initialCode || '');
  }, [initialCode]);

  /** Debounced auto-save to backend */
  const scheduleSave = useCallback(
    (newCode) => {
      if (!sessionId) return;
      clearTimeout(debounceTimer.current);
      setSaveStatus('saving');
      debounceTimer.current = setTimeout(async () => {
        try {
          await put(`/sessions/${sessionId}/code`, { code: newCode });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(null), 1500);
        } catch {
          setSaveStatus('error');
        }
      }, 1000);
    },
    [sessionId]
  );

  function handleCodeChange(value) {
    const newCode = value || '';
    setCode(newCode);
    scheduleSave(newCode);
  }

  function handleRun() {
    if (isExecuting || !onExecute) return;
    onExecute(code, language);
  }

  // Keyboard shortcut: Ctrl+Enter to run
  function handleEditorMount(editor) {
    editorRef.current = editor;
    editor.addCommand(
      // eslint-disable-next-line no-bitwise
      (window.monaco?.KeyMod?.CtrlCmd | window.monaco?.KeyCode?.Enter) ||
        2048 | 3,
      handleRun
    );
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimer.current);
    };
  }, []);

  const hasOutput = executionResult !== null;

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        background: '#0a1020',
        border: '1px solid rgba(64,72,93,0.5)',
      }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(64,72,93,0.4)' }}
      >
        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all duration-150"
          aria-label="Language selector"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        {/* Save status */}
        <div className="flex-1 flex items-center gap-1.5">
          {saveStatus === 'saving' && (
            <span className="text-xs text-on-surface-variant flex items-center gap-1">
              <span className="icon text-sm animate-pulse">cloud_sync</span>
              Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <span className="icon text-sm">cloud_done</span>
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-error flex items-center gap-1">
              <span className="icon text-sm">cloud_off</span>
              Save failed
            </span>
          )}
        </div>

        {/* Keyboard hint */}
        <span className="text-xs text-on-surface-variant/50 hidden sm:block">
          <kbd
            className="px-1.5 py-0.5 rounded text-xs font-mono"
            style={{ background: 'rgba(64,72,93,0.4)' }}
          >
            Ctrl
          </kbd>
          {' + '}
          <kbd
            className="px-1.5 py-0.5 rounded text-xs font-mono"
            style={{ background: 'rgba(64,72,93,0.4)' }}
          >
            Enter
          </kbd>
        </span>

        {/* Run button */}
        <button
          type="button"
          onClick={handleRun}
          disabled={isExecuting}
          className={
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ' +
            (isExecuting
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:brightness-110 active:scale-95')
          }
          style={{
            background: isExecuting
              ? 'rgba(59,191,250,0.15)'
              : 'linear-gradient(135deg, #3bbffa, #8a95ff)',
            color: '#fff',
          }}
          aria-label="Run code"
        >
          {isExecuting ? <RunSpinner /> : <span className="icon text-base leading-none">play_arrow</span>}
          <span>{isExecuting ? 'Running…' : 'Run'}</span>
        </button>
      </div>

      {/* Monaco Editor — 60% height */}
      <div style={{ flex: '0 0 60%', minHeight: 0, overflow: 'hidden' }}>
        <Editor
          defaultLanguage="python"
          language={language}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            tabSize: 4,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'line',
            cursorBlinking: 'phase',
            smoothScrolling: true,
            contextmenu: false,
          }}
        />
      </div>

      {/* Output panel — 40% height */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          flex: '0 0 40%',
          minHeight: 0,
          borderTop: '1px solid rgba(64,72,93,0.4)',
        }}
      >
        {/* Output header */}
        <div
          className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(64,72,93,0.3)' }}
        >
          {hasOutput ? (
            <>
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: executionResult.success ? '#4ade80' : '#ff716c',
                  boxShadow: executionResult.success
                    ? '0 0 6px #4ade80'
                    : '0 0 6px #ff716c',
                }}
              />
              <span
                className="text-xs font-semibold"
                style={{
                  color: executionResult.success ? '#4ade80' : '#ff716c',
                }}
              >
                {executionResult.success ? 'Success' : 'Error'}
              </span>
              {executionResult.execution_time_ms != null && (
                <span className="text-xs text-on-surface-variant ml-auto font-mono">
                  {executionResult.execution_time_ms}ms
                </span>
              )}
            </>
          ) : (
            <>
              <span className="icon text-sm text-on-surface-variant">
                terminal
              </span>
              <span className="text-xs text-on-surface-variant font-medium">
                Output
              </span>
            </>
          )}
        </div>

        {/* Output content */}
        <div className="flex-1 overflow-auto p-4">
          {!hasOutput && !isExecuting && (
            <p className="text-xs text-on-surface-variant/50 italic">
              Run your code to see output here.
            </p>
          )}

          {isExecuting && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="icon text-sm animate-spin">refresh</span>
              Executing…
            </div>
          )}

          {hasOutput && !isExecuting && (
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap break-words"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: executionResult.success ? '#dee5ff' : '#ff716c',
              }}
            >
              {executionResult.error
                ? executionResult.error
                : executionResult.output || '(no output)'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
