/**
 * Avatar — Ready Player Me .glb rendered via React Three Fiber.
 * Cinema-dark aesthetic: accent glow ring, emotion-mapped color.
 * Exports `useSpeech` hook.
 */
import { Canvas } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useState, useRef, useCallback, useEffect, useMemo } from 'react'

const RPM_AVATAR_URL = '/avatar.glb'

const EMOTION_COLORS = {
  explaining:  '#5E6AD2',
  thinking:    '#A78BFA',
  encouraging: '#34D399',
  correcting:  '#FB923C',
  idle:        '#8A8F98',
}

function RPMModel({ url, isSpeaking }) {
  const { scene } = useGLTF(url)
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
      // Stronger tilt while speaking
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

  return <primitive ref={primitiveRef} object={scene} position={[0, -1.55, 0]} scale={2.1} />
}

function FallbackSphere({ color }) {
  return (
    <mesh>
      <sphereGeometry args={[0.42, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.2} metalness={0.3} />
    </mesh>
  )
}

export default function Avatar({ emotion = 'idle', isSpeaking = false, size = 120 }) {
  const color = EMOTION_COLORS[emotion] ?? EMOTION_COLORS.idle

  return (
    <div className="flex flex-col items-center select-none gap-2">
      {/* Glow halo */}
      <div style={{ position: 'relative', width: size, height: Math.round(size * 1.15) }}>
        {/* Outer glow */}
        {isSpeaking && (
          <div
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50% 50% 46% 46%',
              background: `radial-gradient(ellipse, ${color}33 0%, transparent 70%)`,
              animation: 'pulseGlow 1.2s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* 3D canvas — oval bust crop */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50% 50% 46% 46%',
            overflow: 'hidden',
            boxShadow: isSpeaking
              ? `0 0 0 2px ${color}88, 0 0 32px ${color}44`
              : `0 0 0 1px ${color}44`,
            transition: 'box-shadow 400ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <Canvas
            camera={{ position: [0, 0.18, 1.05], fov: 42 }}
            style={{ width: '100%', height: '100%' }}
            gl={{ antialias: true }}
          >
            <ambientLight intensity={0.9} />
            <directionalLight position={[2, 4, 3]} intensity={1.3} />
            <directionalLight position={[-1, 0, 1]} intensity={0.4} color="#5E6AD2" />
            <Suspense fallback={<FallbackSphere color={color} />}>
              <RPMModel url={RPM_AVATAR_URL} isSpeaking={isSpeaking} />
              <Environment preset="city" />
            </Suspense>
          </Canvas>
        </div>
      </div>

      {/* Emotion badge */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
        style={{
          background: `${color}18`,
          border: `1px solid ${color}33`,
        }}
      >
        {isSpeaking && (
          <div className="flex items-end gap-0.5 h-3" aria-label="Speaking">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: 'block',
                  width: 2,
                  height: '100%',
                  borderRadius: 99,
                  background: color,
                  animation: `speakBar 0.7s ease-in-out infinite`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}
        <span className="text-xs font-medium capitalize" style={{ color }}>
          {emotion}
        </span>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.06); }
        }
      `}</style>
    </div>
  )
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef(null)

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }, [])

  const getFemaleVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices()
    // Prioritize high-quality female voices
    const preferred = ['Google US English', 'Samantha', 'Microsoft Zira', 'Vicky', 'Victoria']
    for (const name of preferred) {
      const v = voices.find(v => v.name.includes(name))
      if (v) return v
    }
    // Fallback to any voice that sounds female or marked as female
    return voices.find(v => v.name.toLowerCase().includes('female') || v.lang.includes('en-US'))
  }, [])

  const speak = useCallback((text) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return
    stop()
    
    const utterance = new SpeechSynthesisUtterance(text)
    
    // Set female voice
    const femaleVoice = getFemaleVoice()
    if (femaleVoice) utterance.voice = femaleVoice
    
    utterance.rate = 1.0
    utterance.pitch = 1.1 // Slightly higher pitch for a friendly female tone
    utterance.volume = 1
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend   = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    utteranceRef.current = utterance
    
    window.speechSynthesis.speak(utterance)
  }, [stop, getFemaleVoice])

  useEffect(() => {
    // Some browsers need this to trigger voice loading
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices()
    }
  }, [])

  useEffect(() => () => stop(), [stop])

  return { speak, stop, isSpeaking }
}
