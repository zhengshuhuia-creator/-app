import React, { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { Message } from '../../types';

interface ViewProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (text: string, audioBlob?: Blob) => void;
}

// Configuration
const BACKGROUND_COLOR = '#020410'; // Deep Midnight Void
const PARTICLE_COUNT = 1500; // Increased density for "Solid" look
const HEART_SCALE_BASE = 11; // Size

// Galaxy Blue Palette (Ice & Stardust)
// We use a mix of colors to create depth
const PALETTE = [
    { r: 255, g: 255, b: 255, a: 0.9 }, // Pure White (Sparkles) - 20%
    { r: 165, g: 243, b: 252, a: 0.6 }, // Cyan 200 (Glow) - 40%
    { r: 59, g: 130, b: 246, a: 0.4 },  // Blue 500 (Body) - 30%
    { r: 30, g: 58, b: 138, a: 0.3 },   // Blue 900 (Depth) - 10%
];

class HeartParticle {
    x: number = 0;
    y: number = 0;
    
    // Target position (Heart shape)
    originX: number;
    originY: number;
    
    // Dynamics
    color: string;
    size: number;
    jitterPhase: number;
    baseAlpha: number;

    constructor(canvasWidth: number, canvasHeight: number) {
        // 1. Generate a point on/in the heart
        const t = Math.random() * Math.PI * 2;
        
        // Parametric Heart Equation
        // x = 16 sin^3(t)
        // y = -(13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t))
        let hx = 16 * Math.pow(Math.sin(t), 3);
        let hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        
        // Add "Stardust" spread (Volume)
        // Concentrate more points near the shell (r ~ 1.0) for definition, 
        // but fill the inside (r < 1.0) for density.
        // The image shows a very solid shape with fuzzy edges.
        let r = Math.random();
        // Use sqrt to distribute area evenly, but bias slightly outwards for sharp edge
        r = Math.pow(r, 0.3) * 1.2; 
        
        this.originX = hx * HEART_SCALE_BASE * r;
        this.originY = hy * HEART_SCALE_BASE * r;

        // Add some random scatter dust outside
        if (Math.random() < 0.1) {
             this.originX *= 1.2;
             this.originY *= 1.2;
        }

        // Start at center
        this.x = 0;
        this.y = 0;

        // Color Assignment based on "Brightness" (random mix)
        const rand = Math.random();
        let colorConfig;
        if (rand > 0.8) colorConfig = PALETTE[0]; // White sparkles
        else if (rand > 0.4) colorConfig = PALETTE[1]; // Cyan glow
        else if (rand > 0.15) colorConfig = PALETTE[2]; // Blue body
        else colorConfig = PALETTE[3]; // Deep blue

        // Edge brightening: Particles further out are brighter (Rim light)
        const dist = Math.sqrt(hx*hx + hy*hy);
        if (dist > 15 && Math.random() > 0.5) {
            colorConfig = PALETTE[0]; // Make edges white
        }

        this.baseAlpha = colorConfig.a;
        this.color = `rgba(${colorConfig.r}, ${colorConfig.g}, ${colorConfig.b}`; // Alpha added in draw
        
        // Tiny particles for high-res look
        this.size = Math.random() * 1.5 + 0.3; 
        this.jitterPhase = Math.random() * Math.PI * 2;
    }

    update(
        centerX: number, 
        centerY: number, 
        scaleFactor: number, 
        audioLevel: number, 
        time: number
    ) {
        // Calculate Target
        const targetX = centerX + this.originX * scaleFactor;
        const targetY = centerY + this.originY * scaleFactor;

        // Audio Jitter (Shimmering effect)
        // High frequency vibration for "electric" feel
        const jitter = audioLevel * 8; 
        const jx = Math.sin(time * 0.5 + this.jitterPhase) * jitter;
        const jy = Math.cos(time * 0.5 + this.jitterPhase) * jitter;

        // Smooth Movement (Lerp) - Snappier than before
        this.x += (targetX + jx - this.x) * 0.15;
        this.y += (targetY + jy - this.y) * 0.15;
    }

    draw(ctx: CanvasRenderingContext2D, globalAlphaMod: number) {
        // Dynamic Alpha for twinkling effect
        const twinkle = 0.8 + Math.sin(this.jitterPhase) * 0.2; 
        ctx.fillStyle = `${this.color}, ${this.baseAlpha * globalAlphaMod * twinkle})`;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

const VoiceView: React.FC<ViewProps> = ({ messages, isLoading, onSend }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [visualState, setVisualState] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('idle');
    const [lastBotMessageId, setLastBotMessageId] = useState<string | null>(null);
    
    // Audio Logic
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const smoothVolumeRef = useRef<number>(0);
    
    // Animation Logic
    const particlesRef = useRef<HeartParticle[]>([]);
    const animationFrameRef = useRef<number>(0);
    const timeRef = useRef<number>(0);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    // Initialize Particles
    useEffect(() => {
        if (canvasRef.current) {
            const { width, height } = canvasRef.current.getBoundingClientRect();
            particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => new HeartParticle(width, height));
        }

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        };
    }, []);

    // Monitor Chat for TTS
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'model' && lastMsg.id !== lastBotMessageId && lastMsg.id !== 'welcome') {
            setLastBotMessageId(lastMsg.id);
            playTTS(lastMsg.content);
        }
    }, [messages, lastBotMessageId]);

    // Monitor Loading State
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

    // Render Loop
    useEffect(() => {
        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            // Get Canvas Size dynamically
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // 1. Clear with Trail effect? No, clean clear for crisp particles
            ctx.clearRect(0, 0, width, height);

            // 2. Audio Processing
            let audioFactor = 0;
            if (visualState === 'listening' && analyserRef.current && dataArrayRef.current) {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                let sum = 0;
                for (let i = 0; i < dataArrayRef.current.length; i++) {
                    sum += dataArrayRef.current[i];
                }
                const instantVolume = sum / dataArrayRef.current.length / 255;
                smoothVolumeRef.current += (instantVolume - smoothVolumeRef.current) * 0.2;
                audioFactor = smoothVolumeRef.current;
            } else if (visualState === 'speaking') {
                smoothVolumeRef.current = (Math.sin(timeRef.current * 0.2) + 1) * 0.25; 
                audioFactor = smoothVolumeRef.current;
            } else {
                smoothVolumeRef.current *= 0.9;
                audioFactor = smoothVolumeRef.current;
            }

            timeRef.current += 1;

            // 3. Heartbeat Dynamics
            const beatCycle = timeRef.current % 90; // Slower, deeper heartbeat
            let beatScale = 1.0;
            
            if (visualState === 'idle' || visualState === 'listening') {
                // Classic "Lub-Dub"
                if (beatCycle < 10) {
                    beatScale = 1.0 + Math.sin((beatCycle / 10) * Math.PI) * 0.08;
                } else if (beatCycle > 12 && beatCycle < 20) {
                    beatScale = 1.0 + Math.sin(((beatCycle - 12) / 8) * Math.PI) * 0.04;
                }
            } else if (visualState === 'speaking') {
                beatScale = 1.0 + audioFactor * 0.6;
            } else if (visualState === 'thinking') {
                beatScale = 1.0 + Math.sin(timeRef.current * 0.3) * 0.05; // Gentle breathing
            }

            if (visualState === 'listening') {
                beatScale += audioFactor * 0.4;
            }

            // 4. Draw Particles
            // Use 'lighter' to make overlapping particles glow intensely white
            ctx.globalCompositeOperation = 'lighter';
            
            const centerX = width / 2;
            const centerY = height / 2 - 40;

            particlesRef.current.forEach(p => {
                p.update(centerX, centerY, beatScale, audioFactor, timeRef.current);
                p.draw(ctx, 1.0);
            });

            ctx.globalCompositeOperation = 'source-over';

            animationFrameRef.current = requestAnimationFrame(render);
        };

        render();
    }, [visualState]);

    return (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-between pb-safe pt-safe overflow-hidden animate-in fade-in duration-500" style={{ backgroundColor: BACKGROUND_COLOR }}>
            
            {/* Ambient Blue Glow Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            {/* Canvas Layer */}
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ width: '100%', height: '100%' }}
            />

            {/* Top Hint Text */}
            <div className="relative z-50 mt-16 flex flex-col items-center gap-2 mix-blend-screen opacity-80">
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
                        <div className="w-full h-full rounded-full bg-[#020410] flex items-center justify-center">
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