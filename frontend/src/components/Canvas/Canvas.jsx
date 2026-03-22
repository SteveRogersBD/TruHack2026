/**
 * Canvas — smart whiteboard that renders canvas_actions from the tutor's structured response.
 * Supports: diagram, code, equation, animation, chart, draw.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import mermaid from 'mermaid';

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
    <div className="w-full flex flex-col overflow-hidden rounded-xl border border-white/5 shadow-sm" style={{ maxHeight: '600px' }}>
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
      className="w-full min-h-[200px] flex items-center justify-center p-4 overflow-auto rounded-xl bg-black/20 border border-white/5"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: content }}
      style={{ color: '#dee5ff' }}
    />
  );
}

/** Renders a Mermaid.js diagram */
function MermaidStep({ content }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
      // clean up backticks from LLM response if present
      let rawContent = content.trim();
      if (rawContent.startsWith('```mermaid')) {
        rawContent = rawContent.replace(/^```mermaid\n/, '').replace(/```$/, '').trim();
      }
      
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      try {
        mermaid.render(id, rawContent)
          .then(({ svg }) => {
            if (containerRef.current) containerRef.current.innerHTML = svg;
          })
          .catch((err) => {
            if (containerRef.current) containerRef.current.innerHTML = `<pre class="text-xs text-red-400 p-4 font-mono">${err.message}</pre>`;
          });
      } catch (err) {
         if (containerRef.current) containerRef.current.innerHTML = `<pre class="text-xs text-red-400 p-4 font-mono">${err.message}</pre>`;
      }
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[250px] flex items-center justify-center p-4 overflow-auto rounded-xl bg-black/20 border border-white/5"
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
      <div className="w-full min-h-[150px] flex items-center justify-center p-6 text-center rounded-xl bg-black/20 border border-white/5">
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
      className="w-full min-h-[150px] flex items-center justify-center p-6 text-on-background text-2xl rounded-xl bg-black/20 border border-white/5"
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
      className="w-full border-0 rounded-xl shadow-sm"
      style={{ background: '#060e20', minHeight: '400px' }}
    />
  );
}

/** Renders an image from a URL */
function ImageStep({ content }) {
  return (
    <div className="w-full min-h-[300px] flex items-center justify-center p-4 overflow-hidden rounded-xl bg-black/20 border border-white/5">
      <img 
        src={content} 
        alt="Canvas visual" 
        className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-white/10"
      />
    </div>
  );
}

/** Renders a video from a URL (handles YouTube embedding) */
function VideoStep({ content }) {
  let embedUrl = content;
  if (content.includes('youtube.com/watch?v=')) {
    const videoId = content.split('v=')[1]?.split('&')[0];
    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if (content.includes('youtu.be/')) {
    const videoId = content.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }

  if (embedUrl.includes('youtube.com/embed')) {
    return (
      <div className="w-full min-h-[300px] flex items-center justify-center p-4 overflow-hidden rounded-xl bg-black/20 border border-white/5">
         <iframe 
           src={embedUrl} 
           title="YouTube Video" 
           style={{ minHeight: '400px' }}
           className="w-full border-0 rounded-lg shadow-lg max-w-4xl"
           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
           allowFullScreen 
         />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[300px] flex items-center justify-center p-4 overflow-hidden rounded-xl bg-black/20 border border-white/5">
      <video 
        src={content} 
        controls 
        className="max-w-full max-h-full rounded-lg shadow-lg border border-white/10"
      />
    </div>
  );
}

/** Chooses the correct renderer for a step */
function StepRenderer({ action }) {
  const { type, content, language } = action;
  switch (type) {
    case 'code':
      return <CodeStep content={content} language={language} />;
    case 'diagram':
      return <MermaidStep content={content} />;
    case 'draw':
      return <SvgStep content={content} />;
    case 'equation':
      return <EquationStep content={content} />;
    case 'animation':
    case 'chart':
      return <IframeStep content={content} />;
    case 'image':
      return <ImageStep content={content} />;
    case 'video':
      return <VideoStep content={content} />;
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
}) {
  const total = actions.length;

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

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        background: '#0f1930',
        border: '1px solid rgba(64,72,93,0.5)',
      }}
    >
      {/* Main scrollable feed area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-10 scroll-smooth will-change-scroll">
        {actions.map((action, idx) => (
          <div key={idx} id={`canvas-step-${idx}`} className="flex flex-col gap-4">
            
            <div className="flex items-start gap-3">
              <div 
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                style={{ background: 'rgba(94,106,210,0.15)', color: '#A5AFFF', border: '1px solid rgba(94,106,210,0.3)' }}
              >
                {idx + 1}
              </div>
              <div className="text-sm font-medium leading-relaxed" style={{ color: '#EDEDEF', paddingTop: '2px' }}>
                {action.narration || `${action.type.charAt(0).toUpperCase() + action.type.slice(1)} Block`}
              </div>
            </div>

            <div className="pl-9 w-full">
              <StepRenderer action={action} />
            </div>

          </div>
        ))}
        {/* Extra padding at bottom so the last item can scroll comfortably */}
        <div style={{ height: '30vh' }} className="flex-shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}
