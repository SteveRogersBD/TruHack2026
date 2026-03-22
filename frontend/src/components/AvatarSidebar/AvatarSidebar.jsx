/**
 * AvatarPanel — left 25% of the workspace.
 *
 * Matches the reference screenshot:
 *  • Rounded avatar card (not edge-to-edge) filling most of the panel height
 *  • Three frosted-glass overlay badges on the card
 *  • Voice controls below the card
 *  • Step tracker at the bottom
 *
 * Always dark (#111115) regardless of app theme.
 */
import { Canvas } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useRef, useMemo, useEffect } from 'react'
import { Volume2, VolumeX, PanelLeftClose, ExternalLink } from 'lucide-react'

const RPM_AVATAR_URL = '/avatar.glb'

/* ── Emotion → state mapping ─────────────────────────────────────── */
const EMOTION_TO_STATE = {
  explaining:  'speaking',
  thinking:    'thinking',
  encouraging: 'listening',
  correcting:  'listening',
  idle:        'idle',
}

const STATE_CFG = {
  listening: { dotColor: '#22C55E', badgeText: 'LISTENING', badgeFg: '#4ADE80', badgeBg: 'rgba(34,197,94,0.18)',  leftLabel: 'Listening'  },
  speaking:  { dotColor: '#60A5FA', badgeText: 'SPEAKING',  badgeFg: '#60A5FA', badgeBg: 'rgba(59,130,246,0.18)', leftLabel: 'Speaking'   },
  thinking:  { dotColor: '#F59E0B', badgeText: 'THINKING',  badgeFg: '#FBBF24', badgeBg: 'rgba(251,191,36,0.18)', leftLabel: 'Thinking'   },
  idle:      { dotColor: '#555555', badgeText: 'IDLE',      badgeFg: '#888888', badgeBg: 'rgba(255,255,255,0.06)',leftLabel: 'Idle'       },
}

/* ── Three.js model with talking animation ───────────────────────── */
function RPMModel({ isSpeaking }) {
  const { scene } = useGLTF(RPM_AVATAR_URL)
  const primitiveRef = useRef()
  const headRef = useRef()
  const mouthRef = useRef()

  // Find parts with broad search
  useEffect(() => {
    scene.traverse((obj) => {
      const name = obj.name.toLowerCase()
      if (obj.isBone && (name.includes('head') || name.includes('neck'))) {
        headRef.current = obj
      }
      if (obj.isMesh && (name.includes('mouth') || name.includes('teeth') || name.includes('head'))) {
        mouthRef.current = obj
      }
    })
  }, [scene])

  useFrame((state) => {
    if (!primitiveRef.current) return
    const t = state.clock.getElapsedTime()
    
    // 1. Natural idle sway (Sway THE ENTIRE MODEL if no bone found)
    const target = headRef.current || primitiveRef.current
    target.rotation.y = Math.sin(t * 0.5) * 0.05
    target.rotation.x = Math.cos(t * 0.3) * 0.03

    // 2. AGGRESSIVE Talking Animation
    if (isSpeaking) {
      // Mouth jitter
      const mouthOpen = Math.abs(Math.sin(t * 22)) * 0.7
      if (mouthRef.current && mouthRef.current.morphTargetInfluences) {
        mouthRef.current.morphTargetInfluences[0] = mouthOpen
      } else if (mouthRef.current) {
        mouthRef.current.scale.y = 1 + mouthOpen * 0.15
      }

      // Conversational head bob/tilt
      target.rotation.z = Math.sin(t * 10) * 0.08 
      target.position.y += Math.sin(t * 14) * 0.005
    } else {
      // Reset
      if (mouthRef.current) {
        if (mouthRef.current.morphTargetInfluences) mouthRef.current.morphTargetInfluences[0] = 0
        mouthRef.current.scale.y = 1
      }
      if (!headRef.current && primitiveRef.current) {
        primitiveRef.current.rotation.z = 0
      }
    }
  })

  return <primitive ref={primitiveRef} object={scene} position={[0, -2.55, 0]} scale={1.6} />
}
function FallbackSphere() {
  return (
    <mesh>
      <sphereGeometry args={[0.42, 32, 32]} />
      <meshStandardMaterial color="#5E6AD2" roughness={0.2} metalness={0.3} />
    </mesh>
  )
}

/* ── Frosted-glass pill badge ─────────────────────────────────────── */
function Badge({ style, children }) {
  return (
    <div
      style={{
        position: 'absolute',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        borderRadius: 99,
        padding: '4px 10px',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ── Step item ───────────────────────────────────────────────────── */
function StepItem({ step, index }) {
  const s = step.state || 'upcoming'
  const circleCfg =
    s === 'completed' ? { bg: 'rgba(34,197,94,0.15)',  color: '#4ADE80', border: 'none' } :
    s === 'active'    ? { bg: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: 'none' } :
                        { bg: 'rgba(255,255,255,0.03)', color: '#444', border: '0.5px solid rgba(255,255,255,0.08)' }
  const titleColor = s === 'active' ? '#EDEDEF' : s === 'completed' ? '#666' : '#444'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 600,
        background: circleCfg.bg, color: circleCfg.color, border: circleCfg.border,
        transition: 'all 300ms ease',
      }}>
        {s === 'completed' ? '✓' : index + 1}
      </div>
      <span style={{ fontSize: 11, color: titleColor, fontWeight: s === 'active' ? 500 : 400, lineHeight: 1.4, transition: 'color 300ms ease' }}>
        {step.title}
      </span>
    </div>
  )
}

/* ── Control button ──────────────────────────────────────────────── */
function CtrlBtn({ icon: Icon, label, active, onClick, title: tipTitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tipTitle}
      aria-label={tipTitle}
      style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        height: 32, borderRadius: 6, fontSize: 11,
        border: `0.5px solid ${active ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
        background: active ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.05)',
        color: active ? '#4ADE80' : '#888888',
        boxShadow: active ? '0 0 8px rgba(34,197,94,0.2)' : 'none',
        cursor: 'pointer',
        transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
      }}
      onMouseEnter={(e) => {
        if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#CCCCCC' }
      }}
      onMouseLeave={(e) => {
        if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#888888' }
      }}
    >
      <Icon size={11} />
      {label}
    </button>
  )
}

/* ── Main AvatarPanel ────────────────────────────────────────────── */
export default function AvatarSidebar({
  emotion = 'idle',
  isSpeaking = false,
  isMuted = false,
  speed = '1x',
  onMuteToggle,
  onSpeedChange,
  steps = [],
}) {
  const state = isSpeaking ? 'speaking' : (EMOTION_TO_STATE[emotion] ?? 'idle')
  const { dotColor, badgeText, badgeFg, badgeBg, leftLabel } = STATE_CFG[state]

  const completedCount = steps.filter(s => s.state === 'completed').length
  const progressPct    = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  return (
    <aside
      aria-label="AI Tutor"
      style={{
        width: '40%',
        minWidth: 320,
        maxWidth: 560,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #13131a 0%, #0f0f14 100%)',
        borderRadius: 14,
        overflow: 'hidden',
        padding: 14,
        gap: 12,
        boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 0 0 0.5px rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Avatar card wrapper with ambient glow ─────────────────── */}
      <div style={{ position: 'relative', flex: '0 0 auto', aspectRatio: '3/4', maxHeight: 'calc(100% - 180px)' }}>
        {/* Ambient glow behind avatar */}
        <div
          style={{
            position: 'absolute',
            inset: '-20px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 50% 40%, rgba(94,106,210,0.12) 0%, transparent 65%)',
            filter: 'blur(20px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* ── Avatar card — matches the screenshot ──────────────────── */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%',
            borderRadius: 16,
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #1a1a20 0%, #101014 100%)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.6), inset 0 0 0 0.5px rgba(255,255,255,0.07)',
          }}
        >
          {/* Three.js canvas */}
          <Canvas
            camera={{ position: [0, 0.24, 1.6], fov: 46 }}
            style={{ width: '100%', height: '100%', display: 'block' }}
            gl={{ antialias: true }}
          >
            <ambientLight intensity={1.0} />
            <directionalLight position={[2, 4, 3]} intensity={1.4} />
            <directionalLight position={[-1.5, 1, 1]} intensity={0.35} color="#5E6AD2" />
            <directionalLight position={[0, 2, -1]} intensity={0.2} color="#818CF8" />
            <Suspense fallback={<FallbackSphere />}>
              <RPMModel isSpeaking={isSpeaking} />
              <Environment preset="city" />
            </Suspense>
          </Canvas>

          {/* Vignette — darker edges, lighter center (draws eye to face) */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 50% 38%, transparent 35%, rgba(0,0,0,0.52) 100%)',
            borderRadius: 'inherit',
          }} />

          {/* ── Top-left: status indicator (like screenshot) ─────── */}
          <Badge style={{ top: 10, left: 10, background: 'rgba(0,0,0,0.52)' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: dotColor,
              boxShadow: `0 0 6px ${dotColor}`,
              transition: 'background 300ms ease, box-shadow 300ms ease',
            }} />
            <span style={{ fontSize: 11, color: '#AAAAAA', lineHeight: 1 }}>{leftLabel}</span>
          </Badge>

          {/* ── Top-right: state badge (like screenshot) ──────────── */}
          <Badge style={{ top: 10, right: 10, background: badgeBg, border: `0.5px solid ${badgeFg}33` }}>
            <span style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.05em',
              textTransform: 'uppercase', color: badgeFg,
              transition: 'color 300ms ease',
            }}>
              {badgeText}
            </span>
          </Badge>

          {/* ── Bottom-right: emotion label (like screenshot) ─────── */}
          <Badge style={{ bottom: 10, right: 10, background: 'rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 11, color: '#999999' }}>{emotion}</span>
          </Badge>
        </div>
      </div>

      {/* ── Voice controls ────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555555', marginBottom: 6 }}>
          Controls
        </p>
        {/* Row 1 */}
        <div style={{ display: 'flex', gap: 4 }}>
          <CtrlBtn
            icon={isMuted ? VolumeX : Volume2}
            label={isMuted ? 'Voice Off' : 'Voice On'}
            active={!isMuted}
            onClick={() => {
              if (onMuteToggle) onMuteToggle();
              // Add a small audible feedback or visual signal if needed
            }}
            title={isMuted ? 'Turn voice on' : 'Turn voice off'}
          />
          <div style={{ flex: 1 }}>
            <select
              value={speed}
              onChange={(e) => onSpeedChange?.(e.target.value)}
              aria-label="Playback speed"
              style={{
                width: '100%', height: 32, appearance: 'none',
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 6, color: '#888888', fontSize: 10,
                cursor: 'pointer', padding: '0 8px', outline: 'none',
                fontFamily: 'inherit',
                transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
              }}
              onFocus={(e)     => { e.currentTarget.style.borderColor = 'rgba(94,106,210,0.4)' }}
              onBlur={(e)      => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              onMouseEnter={(e)=> { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#CCCCCC' }}
              onMouseLeave={(e)=> { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#888888' }}
            >
              {['0.75x', '1x', '1.25x', '1.5x', '2x'].map(s => (
                <option key={s} value={s} style={{ background: '#111115' }}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Row 2 */}
        <div style={{ display: 'flex', gap: 4 }}>
          <CtrlBtn icon={PanelLeftClose} label="Collapse"  onClick={() => {}} title="Collapse panel" />
          <CtrlBtn icon={ExternalLink}   label="Pop out"   onClick={() => {}} title="Pop out avatar" />
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

      {/* ── Step tracker ──────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden auto', display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, flexShrink: 0 }}>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555555' }}>
            Steps
          </p>
          {steps.length > 0 && (
            <span style={{ fontSize: 9, color: '#444444' }}>
              {completedCount}/{steps.length}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {steps.length > 0 && (
          <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 99, marginBottom: 8, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #5E6AD2, #60A5FA)',
              transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
        )}

        {steps.length > 0 ? (
          steps.map((step, i) => <StepItem key={i} step={step} index={i} />)
        ) : (
          /* Skeleton */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[75, 60, 68, 50].map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div className="skeleton" style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0 }} />
                <div className="skeleton" style={{ height: 9, width: `${w}%`, borderRadius: 4, animationDelay: `${i * 0.1}s` }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Resize hint ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, paddingBottom: 2 }}>
        <div
          style={{ display: 'inline-flex', alignItems: 'center', cursor: 'col-resize' }}
          title="Drag to resize"
          onMouseEnter={(e) => {
            const bar = e.currentTarget.querySelector('[data-resizebar]')
            if (bar) bar.style.background = 'rgba(255,255,255,0.2)'
          }}
          onMouseLeave={(e) => {
            const bar = e.currentTarget.querySelector('[data-resizebar]')
            if (bar) bar.style.background = 'rgba(255,255,255,0.07)'
          }}
        >
          <div
            data-resizebar="1"
            style={{ width: 40, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', transition: 'background 150ms ease' }}
          />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', marginLeft: 6 }}>drag</span>
        </div>
      </div>
    </aside>
  )
}
