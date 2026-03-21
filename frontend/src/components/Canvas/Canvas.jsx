/**
 * Canvas — smart whiteboard that renders canvas_actions from the tutor's structured response.
 * Supports: diagram, code, equation, animation, chart, draw.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/* ------------------------------------------------------------------ */
/* KaTeX — we attempt a dynamic import; fall back to raw text if it fails */
/* ------------------------------------------------------------------ */

let katexCache = null;

async function getKatex() {
  if (katexCache) return katexCache;
  try {
    const mod = await import('katex');
    katexCache = mod.default || mod;
    return katexCache;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Step renderers                                                       */
/* ------------------------------------------------------------------ */

/** Language badge for code blocks */
function LangBadge({ lang }) {
  if (!lang) return null;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-mono font-medium"
      style={{
        background: 'rgba(59,191,250,0.15)',
        color: '#3bbffa',
        border: '1px solid rgba(59,191,250,0.25)',
      }}
    >
      {lang}
    </span>
  );
}

/** Renders a code block */
function CodeStep({ content, language }) {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-xl">
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{
          background: 'rgba(9,18,40,0.9)',
          borderBottom: '1px solid rgba(64,72,93,0.5)',
        }}
      >
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <LangBadge lang={language} />
      </div>
      <pre
        className="flex-1 overflow-auto p-5 text-sm leading-relaxed"
        style={{
          background: 'rgba(6,14,32,0.95)',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          color: '#dee5ff',
          margin: 0,
          borderRadius: '0 0 12px 12px',
        }}
      >
        <code>{content}</code>
      </pre>
    </div>
  );
}

/** Renders an SVG diagram or draw step */
function SvgStep({ content }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center p-4 overflow-auto"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: content }}
      style={{ color: '#dee5ff' }}
    />
  );
}

/** Renders a math equation via KaTeX */
function EquationStep({ content }) {
  const ref = useRef(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getKatex().then((katex) => {
      if (cancelled || !ref.current) return;
      if (!katex) {
        setFallback(true);
        return;
      }
      try {
        ref.current.innerHTML = katex.renderToString(content, {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        setFallback(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [content]);

  if (fallback) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 text-center">
        <pre
          className="text-lg text-on-background font-mono"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="w-full h-full flex items-center justify-center p-6 text-on-background text-2xl"
      style={{ overflowX: 'auto' }}
    />
  );
}

/** Renders animation/chart via sandboxed iframe */
function IframeStep({ content }) {
  return (
    <iframe
      sandbox="allow-scripts"
      srcDoc={content}
      title="Canvas step"
      className="w-full h-full border-0 rounded-xl"
      style={{ background: '#060e20', minHeight: '200px' }}
    />
  );
}

/** Chooses the correct renderer for a step */
function StepRenderer({ action }) {
  const { type, content, language } = action;
  switch (type) {
    case 'code':
      return <CodeStep content={content} language={language} />;
    case 'diagram':
    case 'draw':
      return <SvgStep content={content} />;
    case 'equation':
      return <EquationStep content={content} />;
    case 'animation':
    case 'chart':
      return <IframeStep content={content} />;
    default:
      return (
        <div className="w-full h-full flex items-center justify-center p-6 text-on-surface-variant text-sm">
          Unsupported step type: <code className="ml-1 text-primary">{type}</code>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Empty state                                                          */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
      {/* Animated sparkle ring */}
      <div className="relative w-24 h-24 mb-6">
        <div
          className="w-24 h-24 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(59,191,250,0.12) 0%, transparent 70%)',
            animation: 'sparkleGrow 3s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: 'sparkleRotate 8s linear infinite' }}
          aria-hidden="true"
        >
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <span
              key={deg}
              className="absolute text-base"
              style={{
                color: deg % 120 === 0 ? '#3bbffa' : '#8a95ff',
                transform: `rotate(${deg}deg) translateY(-36px)`,
                opacity: 0.6 + (deg % 60 === 0 ? 0.4 : 0),
                fontSize: deg % 120 === 0 ? '14px' : '10px',
              }}
            >
              ✦
            </span>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="icon text-4xl"
            style={{ color: 'rgba(59,191,250,0.5)' }}
          >
            auto_awesome
          </span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-on-background mb-2">
        Your canvas is ready
      </h3>
      <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">
        Ask the tutor a question to get started. Diagrams, code, and equations
        will appear here.
      </p>

      <style>{`
        @keyframes sparkleGrow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes sparkleRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Canvas                                                          */
/* ------------------------------------------------------------------ */

/**
 * @param {{
 *   actions: Array<{type: string, content: string, language?: string, step?: number, narration?: string}>,
 *   currentStep: number,
 *   onStepChange: (step: number) => void,
 *   autoPlay?: boolean
 * }} props
 */
export default function Canvas({
  actions = [],
  currentStep = 0,
  onStepChange,
  autoPlay = false,
}) {
  const total = actions.length;
  const canPrev = currentStep > 0;
  const canNext = currentStep < total - 1;

  const handlePrev = useCallback(() => {
    if (canPrev) onStepChange(currentStep - 1);
  }, [canPrev, currentStep, onStepChange]);

  const handleNext = useCallback(() => {
    if (canNext) onStepChange(currentStep + 1);
  }, [canNext, currentStep, onStepChange]);

  // Auto-advance every 4s when autoPlay is true
  useEffect(() => {
    if (!autoPlay || total === 0) return;
    const timer = setTimeout(() => {
      if (canNext) {
        onStepChange(currentStep + 1);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [autoPlay, canNext, currentStep, total, onStepChange]);

  if (total === 0) {
    return (
      <div
        className="flex flex-col h-full rounded-xl overflow-hidden"
        style={{
          background: '#0f1930',
          border: '1px solid rgba(64,72,93,0.5)',
        }}
      >
        <EmptyState />
      </div>
    );
  }

  const currentAction = actions[currentStep];
  const narration = currentAction?.narration;

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        background: '#0f1930',
        border: '1px solid rgba(64,72,93,0.5)',
      }}
    >
      {/* Step pills header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(64,72,93,0.4)' }}
      >
        <span className="icon text-sm text-on-surface-variant flex-shrink-0">
          layers
        </span>
        <div className="flex items-center gap-1.5">
          {actions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onStepChange(idx)}
              className={
                'flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ' +
                (idx === currentStep
                  ? 'text-white'
                  : idx < currentStep
                  ? 'text-on-surface-variant hover:text-on-background'
                  : 'text-on-surface-variant/50 hover:text-on-surface-variant')
              }
              style={
                idx === currentStep
                  ? {
                      background: 'linear-gradient(135deg, #3bbffa, #8a95ff)',
                    }
                  : idx < currentStep
                  ? {
                      background: 'rgba(59,191,250,0.12)',
                      border: '1px solid rgba(59,191,250,0.2)',
                    }
                  : {
                      background: 'rgba(64,72,93,0.2)',
                      border: '1px solid rgba(64,72,93,0.3)',
                    }
              }
              title={action.narration || `Step ${idx + 1}`}
            >
              {action.type || `Step ${idx + 1}`}
            </button>
          ))}
        </div>

        <div className="ml-auto flex-shrink-0 text-xs text-on-surface-variant font-mono">
          {currentStep + 1}/{total}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden p-4">
        <StepRenderer action={currentAction} />
      </div>

      {/* Narration + nav footer */}
      <div
        className="flex-shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ borderTop: '1px solid rgba(64,72,93,0.4)' }}
      >
        {/* Prev / Next */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canPrev}
          className="flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high text-on-surface-variant hover:text-on-background"
          aria-label="Previous step"
        >
          <span className="icon text-xl leading-none">arrow_back</span>
        </button>

        {/* Narration text */}
        <div className="flex-1 min-w-0">
          {narration ? (
            <p className="text-sm text-on-surface-variant truncate" title={narration}>
              <span className="icon text-sm mr-1 text-primary align-middle">
                record_voice_over
              </span>
              {narration}
            </p>
          ) : (
            <p className="text-sm text-on-surface-variant/40 italic">
              Step {currentStep + 1} of {total}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          className="flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high text-on-surface-variant hover:text-on-background"
          aria-label="Next step"
        >
          <span className="icon text-xl leading-none">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
