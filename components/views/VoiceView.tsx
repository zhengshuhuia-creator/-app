import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Mic } from 'lucide-react';
import { Message } from '../../types';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

interface ViewProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (text: string, audioBlob?: Blob) => void;
}

// --- 3D PARTICLE SYSTEM COMPONENT ---
const HeartParticles = ({ visualState, analyzer }: { visualState: string, analyzer: React.MutableRefObject<AnalyserNode | null> }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Generate Heart Shape Points
  const particlesPosition = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const t = Math.random() * Math.PI * 2;
      // Heart Equation
      // x = 16sin^3(t)
      // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
      
      // Add randomness to fill volume
      const r = Math.pow(Math.random(), 0.3); // Bias towards outer edge slightly
      
      let x = 16 * Math.pow(Math.sin(t), 3);
      let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      
      // Randomize Z for 3D depth
      const z = (Math.random() - 0.5) * 4; 

      // Scale down and add noise
      const scale = 0.15;
      positions[i * 3] = (x * scale) * r + (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 1] = (y * scale) * r + (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 2] = z * r;
    }
    return positions;
  }, []);

  const dataArray = useRef(new Uint8Array(64));

  useFrame((state) => {
    if (!pointsRef.current) return;

    const time = state.clock.getElapsedTime();
    let volume = 0;

    // Audio Analysis
    if (visualState === 'listening' && analyzer.current) {
        analyzer.current.getByteFrequencyData(dataArray.current);
        const avg = dataArray.current.reduce((a, b) => a + b) / dataArray.current.length;
        volume = avg / 255.0; // 0 to 1
    } else if (visualState === 'speaking') {
        // Simulated volume for TTS
        volume = (Math.sin(time * 15) * 0.5 + 0.5) * 0.5;
    } else if (visualState === 'thinking') {
        volume = 0.1 + Math.sin(time * 10) * 0.1;
    }

    // Heartbeat Animation
    const beat = Math.sin(time * 2.5) * 0.1 + 1; // 0.9 to 1.1 base pulse
    const audioScale = 1 + volume * 0.8; // Expands on volume
    
    const targetScale = beat * audioScale;
    
    // Smooth Lerp
    pointsRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    
    // Rotate slowly
    pointsRef.current.rotation.y += 0.002;
    pointsRef.current.rotation.z = Math.sin(time * 0.5) * 0.05;

    // Color Pulse (via Opacity or Color prop if using shader, here simplistic size/color)
    const material = pointsRef.current.material as THREE.PointsMaterial;
    if (visualState === 'listening') {
        material.color.setHSL(0.6, 1, 0.5 + volume * 0.5); // Blue glow
    } else if (visualState === 'speaking') {
        material.color.setHSL(0.85, 1, 0.5 + volume * 0.5); // Pink/Purple glow
    } else {
        material.color.setHSL(0.6, 0.8, 0.5); // Dim Blue
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#6366f1"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};


const VoiceView: React.FC<ViewProps> = ({ messages, isLoading, onSend }) => {
    const [visualState, setVisualState] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('idle');
    const [lastBotMessageId, setLastBotMessageId] = useState<string | null>(null);
    
    // Audio Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // --- TTS Logic ---
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'model' && lastMsg.id !== lastBotMessageId && lastMsg.id !== 'welcome') {
            setLastBotMessageId(lastMsg.id);
            setVisualState('speaking'); // Trigger visual state
            playTTS(lastMsg.content);
        }
    }, [messages, lastBotMessageId]);

    const playTTS = (text: string) => {
        const cleanText = text.replace(/\*\*/g, '').replace(/---SEP---/g, ' ').split('---SEP---')[0]; 
        const u = new SpeechSynthesisUtterance(cleanText);
        u.lang = 'ko-KR';
        u.rate = 0.9;
        u.onend = () => setVisualState('idle');
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    };

    // --- Audio Recording ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; 
            analyser.smoothingTimeConstant = 0.8;
            
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyserRef.current = analyser;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setVisualState('thinking');
                onSend('', audioBlob); 
                
                // Keep context alive for a moment or close it? 
                // We often close it to stop the mic indicator, but keeping it for 'thinking' viz is nice.
                // For now, let's close it when not needed.
                // setTimeout(() => audioCtx.close(), 100);
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

    return (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-between pb-safe pt-safe overflow-hidden animate-in fade-in duration-500 bg-black">
            
            {/* 3D Visualizer Layer */}
            <div className="absolute inset-0">
                <Canvas camera={{ position: [0, 0, 4], fov: 60 }}>
                    <color attach="background" args={['#050510']} />
                    <ambientLight intensity={0.5} />
                    
                    <HeartParticles visualState={visualState} analyzer={analyserRef} />
                    
                    <EffectComposer>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                    </EffectComposer>
                </Canvas>
            </div>

            {/* Subtitles Area (Top/Middle Overlay) */}
            <div className="relative z-50 w-full px-8 mt-20 min-h-[100px] flex justify-center pointer-events-none">
                 {(visualState === 'speaking' || visualState === 'thinking') && lastBotMessageId && (
                     <div className="bg-black/30 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 animate-in slide-in-from-top-4 fade-in duration-500 max-w-sm">
                        <p className="text-blue-50 text-center text-lg font-medium leading-relaxed drop-shadow-md">
                            {messages[messages.length - 1].content.split('---SEP---')[0]}
                        </p>
                     </div>
                 )}
            </div>

            {/* Status Indicator */}
            <div className="relative z-50 mb-8">
                 <div className={`px-5 py-2 rounded-full border backdrop-blur-md transition-all duration-500 flex items-center gap-3 ${
                     visualState === 'listening' ? 'bg-blue-900/60 border-blue-500 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.5)]' :
                     visualState === 'speaking' ? 'bg-purple-900/40 border-purple-400 text-purple-100 shadow-[0_0_20px_rgba(192,132,252,0.4)]' :
                     'bg-white/5 border-white/10 text-white/50'
                 }`}>
                     <div className={`w-2 h-2 rounded-full ${visualState === 'listening' ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`} />
                     <span className="text-sm font-bold tracking-widest uppercase">
                        {visualState === 'idle' && 'Tap mic to start'}
                        {visualState === 'listening' && 'Listening...'}
                        {visualState === 'thinking' && 'Processing...'}
                        {visualState === 'speaking' && 'Speaking...'}
                     </span>
                 </div>
            </div>

            {/* Interaction Controls */}
            <div className="relative z-50 mb-16">
                {visualState === 'listening' ? (
                    <button 
                        onClick={stopRecording}
                        className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500 text-red-100 flex items-center justify-center animate-pulse hover:bg-red-500 hover:text-white transition-all scale-100 hover:scale-110 active:scale-95"
                    >
                         <div className="w-8 h-8 rounded bg-current shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                    </button>
                ) : (
                    <button 
                        onClick={startRecording}
                        disabled={isLoading || visualState === 'speaking'}
                        className={`w-24 h-24 rounded-full flex items-center justify-center text-white transition-all duration-300 border border-white/10 backdrop-blur-md group ${
                            isLoading 
                            ? 'bg-white/5 opacity-50 animate-pulse cursor-wait' 
                            : 'bg-white/10 hover:bg-blue-600 hover:border-transparent hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] active:scale-95'
                        }`}
                    >
                        <Mic size={40} className="group-hover:scale-110 transition-transform" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default VoiceView;