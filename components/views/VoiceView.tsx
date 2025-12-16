import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Mic } from 'lucide-react';
import { Message } from '../../types';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Center } from '@react-three/drei';

// Fix: Add global JSX type definitions for Three.js elements to resolve IntrinsicElements errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      pointsMaterial: any;
    }
  }
}

interface ViewProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (text: string, audioBlob?: Blob) => void;
}

// --- CONFIGURATION ---
const BACKGROUND_COLOR = '#020410'; // Deepest Midnight Blue
const PARTICLE_COUNT = 4000; // Ultra Dense
const HEART_SIZE = 1.3;

// --- UTILS ---
// Generate a soft glow texture on the fly
const getGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; // Higher res texture
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Super soft radial gradient for "gas" look
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');       // Hot Core
    gradient.addColorStop(0.15, 'rgba(220, 240, 255, 0.9)');  // White-Blue Halo
    gradient.addColorStop(0.4, 'rgba(100, 200, 255, 0.3)');   // Blue Haze
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');             // Fade out
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    return texture;
};

// --- R3F COMPONENTS ---

const HeartParticles = ({ visualState, audioLevelRef }: { visualState: string, audioLevelRef: React.MutableRefObject<number> }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const texture = useMemo(() => getGlowTexture(), []);
    
    // Generate Heart Shape Data
    const { positions, colors } = useMemo(() => {
        const pos = new Float32Array(PARTICLE_COUNT * 3);
        const col = new Float32Array(PARTICLE_COUNT * 3);
        const colorObj = new THREE.Color();

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const t = Math.random() * Math.PI * 2;
            
            // Heart Formula
            // x = 16 sin^3(t)
            // y = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
            let x = 16 * Math.pow(Math.sin(t), 3);
            let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            
            // Normalize scale (approx 32 units high -> scale down)
            x *= 0.1;
            y *= 0.1;

            // Volume/Spread (Thicker heart shell)
            // Use pow to bias points towards the outer shell for definition
            const r = Math.pow(Math.random(), 0.2); 
            const spread = 0.02 + Math.random() * 0.18; 
            
            // Apply volume
            x *= (0.9 + spread);
            y *= (0.9 + spread);
            
            // Z-depth for 3D volume
            const z = (Math.random() - 0.5) * 1.0 * r;

            pos[i * 3] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = z;

            // Color Gradient logic
            // Center = White/Cyan, Edge = Deep Blue/Purple
            const dist = Math.sqrt(x*x + y*y);
            const normalizedDist = Math.min(dist / 2.2, 1.0); // 0 (center) to 1 (edge)

            if (normalizedDist < 0.3) {
                 // Core: Pure Hot White -> Electric Cyan
                 colorObj.setHSL(0.55, 1.0, 0.95 - normalizedDist * 0.5); 
            } else {
                 // Edge: Cyan -> Deep Royal Blue -> Violet
                 // Hue shifts from 0.55 (Cyan) to 0.7 (Purple)
                 colorObj.setHSL(0.55 + normalizedDist * 0.15, 0.9, 0.7 - normalizedDist * 0.5);
            }

            col[i * 3] = colorObj.r;
            col[i * 3 + 1] = colorObj.g;
            col[i * 3 + 2] = colorObj.b;
        }
        return { positions: pos, colors: col };
    }, []);

    useFrame((state) => {
        if (!pointsRef.current) return;
        
        const time = state.clock.getElapsedTime();
        const audio = audioLevelRef.current;
        
        // --- 1. Heartbeat Animation (Lub-Dub) ---
        // Cycle is roughly 1.2 seconds (50 BPM approx)
        const beatCycle = time % 1.2;
        let scale = 1.0;
        
        if (visualState === 'idle' || visualState === 'listening') {
             // Lub (Sharp expand)
            if (beatCycle < 0.15) {
                scale = 1.0 + Math.sin(beatCycle / 0.15 * Math.PI) * 0.12;
            } 
            // Dub (Smaller expand)
            else if (beatCycle > 0.25 && beatCycle < 0.4) {
                scale = 1.0 + Math.sin((beatCycle - 0.25) / 0.15 * Math.PI) * 0.06;
            }
        } 
        else if (visualState === 'speaking') {
            // Rapid speaking vibration
            scale = 1.05 + audio * 0.5 + Math.sin(time * 20) * 0.02;
        } 
        else if (visualState === 'thinking') {
             // Fast flutter
             scale = 1.0 + Math.sin(time * 10) * 0.03;
        }
        
        // Add Audio Reactivity to Scale
        if (visualState === 'listening') {
            scale += audio * 0.3;
        }

        pointsRef.current.scale.setScalar(scale * HEART_SIZE);

        // --- 2. Particle "Drift" ---
        // Gentle rotation
        pointsRef.current.rotation.y = Math.sin(time * 0.15) * 0.15;
        pointsRef.current.rotation.z = Math.cos(time * 0.1) * 0.08;
    });

    return (
        <Center>
            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={positions.length / 3}
                        array={positions}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        count={colors.length / 3}
                        array={colors}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    map={texture}
                    size={0.15} // Slightly larger particles
                    sizeAttenuation={true}
                    depthWrite={false}
                    vertexColors={true}
                    blending={THREE.AdditiveBlending}
                    transparent={true}
                    opacity={0.8}
                    toneMapped={false} // CRITICAL: Allow colors to blow out into white via Bloom
                />
            </points>
        </Center>
    );
};

// --- MAIN VIEW COMPONENT ---

const VoiceView: React.FC<ViewProps> = ({ messages, isLoading, onSend }) => {
    const [visualState, setVisualState] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('idle');
    const [lastBotMessageId, setLastBotMessageId] = useState<string | null>(null);
    
    // Audio Logic Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const smoothVolumeRef = useRef<number>(0);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    // Monitor Chat for TTS
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'model' && lastMsg.id !== lastBotMessageId && lastMsg.id !== 'welcome') {
            setLastBotMessageId(lastMsg.id);
            playTTS(lastMsg.content);
        }
    }, [messages, lastBotMessageId]);

    useEffect(() => {
        if (isLoading) {
            setVisualState('thinking');
        } else if (visualState === 'thinking') {
            setVisualState('idle'); 
        }
    }, [isLoading]);

    const playTTS = (text: string) => {
        const cleanText = text.replace(/\*\*/g, '').replace(/---SEP---/g, ' ').split('---SEP---')[0]; 
        const u = new SpeechSynthesisUtterance(cleanText);
        u.lang = 'ko-KR';
        u.rate = 0.9;
        u.onstart = () => setVisualState('speaking');
        u.onend = () => setVisualState('idle');
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; 
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyserRef.current = analyser;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                onSend('', audioBlob); 
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }
            };

            mediaRecorder.start();
            setVisualState('listening');
        } catch (e) {
            console.error("Mic Error", e);
            alert("无法访问麦克风");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    // Audio Analysis Loop (Runs outside of React Three Fiber loop to feed data into it)
    useEffect(() => {
        const updateAudio = () => {
            let audioFactor = 0;
            
            if (visualState === 'listening' && analyserRef.current && dataArrayRef.current) {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                let sum = 0;
                for (let i = 0; i < dataArrayRef.current.length; i++) sum += dataArrayRef.current[i];
                const instantVolume = sum / dataArrayRef.current.length / 255;
                smoothVolumeRef.current += (instantVolume - smoothVolumeRef.current) * 0.2;
                audioFactor = smoothVolumeRef.current;
            } 
            else if (visualState === 'speaking') {
                // Simulate TTS volume using sine wave
                const time = (Date.now() - startTimeRef.current) / 1000;
                smoothVolumeRef.current = (Math.sin(time * 10) + 1) * 0.25; 
                audioFactor = smoothVolumeRef.current;
            } 
            else {
                smoothVolumeRef.current *= 0.9;
                audioFactor = smoothVolumeRef.current;
            }
            
            rafRef.current = requestAnimationFrame(updateAudio);
        };
        
        startTimeRef.current = Date.now();
        updateAudio();
        
        return () => cancelAnimationFrame(rafRef.current);
    }, [visualState]);

    return (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-between pb-safe pt-safe overflow-hidden animate-in fade-in duration-500" style={{ backgroundColor: BACKGROUND_COLOR }}>
            
            {/* 3D Scene Layer */}
            <div className="absolute inset-0 w-full h-full">
                <Canvas camera={{ position: [0, 0, 6], fov: 45 }} gl={{ antialias: false }}>
                    {/* Add Bloom Effect for Glow */}
                    <EffectComposer enableNormalPass={false}>
                        <Bloom 
                            luminanceThreshold={0.2} 
                            luminanceSmoothing={0.9} 
                            intensity={2.0} // High intensity for Neon look
                            mipmapBlur={true}
                        />
                    </EffectComposer>
                    
                    <HeartParticles visualState={visualState} audioLevelRef={smoothVolumeRef} />
                </Canvas>
            </div>

            {/* UI Overlay - Top Hint Text */}
            <div className="relative z-50 mt-20 flex flex-col items-center gap-2 mix-blend-screen opacity-90 pointer-events-none">
                 <div className={`px-4 py-1.5 rounded-full border backdrop-blur-md transition-all duration-500 ${
                     visualState === 'listening' ? 'bg-blue-900/40 border-blue-500/50 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.4)]' :
                     visualState === 'speaking' ? 'bg-white/10 border-white/30 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' :
                     'bg-white/5 border-white/10 text-white/50'
                 }`}>
                     <span className="text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-2">
                        {visualState === 'listening' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                        {visualState === 'speaking' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        {visualState === 'idle' && 'Tap mic to start'}
                        {visualState === 'listening' && 'Listening'}
                        {visualState === 'thinking' && 'Thinking'}
                        {visualState === 'speaking' && 'Speaking'}
                     </span>
                 </div>
            </div>

            {/* Subtitles */}
            <div className="relative z-40 w-full px-8 mb-8 min-h-[100px] flex items-end justify-center pointer-events-none">
                 {visualState === 'speaking' && lastBotMessageId && (
                     <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xs">
                        <p className="text-blue-50 text-center text-lg font-medium leading-relaxed drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                            {messages[messages.length - 1].content.split('---SEP---')[0]}
                        </p>
                     </div>
                 )}
            </div>

            {/* Controls */}
            <div className="relative z-50 mb-16">
                {visualState === 'listening' ? (
                    <button 
                        onClick={stopRecording}
                        className="group w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 p-[2px] shadow-[0_0_40px_rgba(59,130,246,0.6)] hover:scale-105 transition-all duration-300"
                    >
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                             <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-cyan-500 animate-pulse group-hover:bg-red-500 transition-colors"></div>
                        </div>
                    </button>
                ) : (
                    <button 
                        onClick={startRecording}
                        disabled={isLoading || visualState === 'speaking'}
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-500 border border-white/10 backdrop-blur-md ${
                            isLoading || visualState === 'speaking'
                            ? 'bg-white/5 opacity-30 cursor-not-allowed' 
                            : 'bg-white/5 hover:bg-blue-500/20 hover:border-blue-500/50 hover:scale-105 shadow-[0_0_30px_rgba(59,130,246,0.15)]'
                        }`}
                    >
                        <Mic size={28} className="text-blue-100 opacity-90 group-hover:opacity-100" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default VoiceView;