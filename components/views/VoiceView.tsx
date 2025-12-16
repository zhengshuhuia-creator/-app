import React, { useEffect, useRef, useState } from 'react';
import { Mic, ArrowLeft } from 'lucide-react';
import { Message } from '../../types';

interface ViewProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (text: string, audioBlob?: Blob) => void;
}

// --- CONFIGURATION ---
// ⚠️ IMPORTANT: Replace this with your actual image path
// If you have a file named 'blue-heart.png' in your public folder, use '/blue-heart.png'
const HEART_IMAGE_SRC = "https://cdn.pixabay.com/photo/2024/02/22/03/10/heart-8589098_1280.jpg"; 

const BACKGROUND_COLOR = '#000000'; 

const VoiceView: React.FC<ViewProps> = ({ messages, isLoading, onSend }) => {
    const [visualState, setVisualState] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('idle');
    const [lastBotMessageId, setLastBotMessageId] = useState<string | null>(null);
    
    // Refs for Animation & Audio
    const imgRef = useRef<HTMLImageElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    // Animation Loop State
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number>(Date.now());
    const smoothVolumeRef = useRef<number>(0);

    // --- TTS Logic ---
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'model' && lastMsg.id !== lastBotMessageId && lastMsg.id !== 'welcome') {
            setLastBotMessageId(lastMsg.id);
            playTTS(lastMsg.content);
        }
    }, [messages, lastBotMessageId]);

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

    // --- Audio Recording ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; // Low bin count for broad volume detection
            analyser.smoothingTimeConstant = 0.8;
            
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

    // --- MAIN ANIMATION LOOP ---
    useEffect(() => {
        const update = () => {
            const time = (Date.now() - startTimeRef.current) / 1000;
            let currentVolume = 0;

            // 1. Get Volume
            if (visualState === 'listening' && analyserRef.current && dataArrayRef.current) {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                let sum = 0;
                for (let i = 0; i < dataArrayRef.current.length; i++) sum += dataArrayRef.current[i];
                currentVolume = sum / dataArrayRef.current.length / 255; // 0.0 to 1.0
            } 
            else if (visualState === 'speaking') {
                // Simulate volume for TTS
                currentVolume = (Math.sin(time * 15) * 0.5 + 0.5) * 0.4;
            }

            // Smooth volume
            smoothVolumeRef.current += (currentVolume - smoothVolumeRef.current) * 0.15;
            const vol = smoothVolumeRef.current;

            // 2. Calculate Effects
            if (imgRef.current) {
                // Heartbeat Logic (Base Idle Animation)
                // Pulse speed: 1.2s per beat approx
                const beat = Math.sin(time * 3); 
                // Map sine -1..1 to 1.0..1.1
                const baseScale = 1.05 + beat * 0.05; 
                
                // Add Audio Reactivity
                const audioScale = vol * 0.4; // Grows up to +40% with loud sound
                const totalScale = baseScale + audioScale;

                // Brightness Logic
                // Base brightness 1.0, increases with volume
                const brightness = 1.0 + (vol * 2.5); // Up to 3.5x brightness
                
                // Apply Styles
                imgRef.current.style.transform = `scale(${totalScale})`;
                imgRef.current.style.filter = `brightness(${brightness}) saturate(${1 + vol})`;
            }

            rafRef.current = requestAnimationFrame(update);
        };

        rafRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafRef.current);
    }, [visualState]);

    return (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-between pb-safe pt-safe overflow-hidden animate-in fade-in duration-500" style={{ backgroundColor: BACKGROUND_COLOR }}>
            
            {/* Visualizer Container */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-[350px] h-[350px] flex items-center justify-center">
                    
                    {/* The Blue Heart Image */}
                    <img 
                        ref={imgRef}
                        src={HEART_IMAGE_SRC}
                        alt="Blue Heart"
                        className="w-full h-full object-contain transition-transform duration-75 ease-linear will-change-transform"
                        style={{
                            mixBlendMode: 'screen', // Removes black background
                            filter: 'brightness(1)',
                        }}
                    />

                    {/* Ambient Glow Behind (Optional, enhances depth) */}
                    <div 
                        className="absolute inset-0 rounded-full bg-blue-500 blur-[80px] opacity-20"
                        style={{
                            transform: `scale(${visualState === 'speaking' || visualState === 'listening' ? 1.2 : 0.8})`,
                            transition: 'transform 1s ease-in-out'
                        }}
                    />
                </div>
            </div>

            {/* Status Pill */}
            <div className="relative z-50 mt-20">
                 <div className={`px-4 py-1.5 rounded-full border backdrop-blur-md transition-all duration-500 flex items-center gap-2 ${
                     visualState === 'listening' ? 'bg-blue-900/40 border-blue-500/50 text-blue-100' :
                     visualState === 'speaking' ? 'bg-white/10 border-white/30 text-white' :
                     'bg-white/5 border-white/10 text-white/50'
                 }`}>
                     <div className={`w-2 h-2 rounded-full ${visualState === 'listening' ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`} />
                     <span className="text-xs font-bold tracking-widest uppercase">
                        {visualState === 'idle' && 'Tap mic'}
                        {visualState === 'listening' && 'Listening...'}
                        {visualState === 'thinking' && 'Processing...'}
                        {visualState === 'speaking' && 'Speaking...'}
                     </span>
                 </div>
            </div>

            {/* Subtitles Area */}
            <div className="relative z-40 w-full px-8 mb-8 min-h-[120px] flex items-end justify-center pointer-events-none">
                 {(visualState === 'speaking' || visualState === 'thinking') && lastBotMessageId && (
                     <div className="bg-black/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 animate-in slide-in-from-bottom-4 fade-in duration-500 max-w-sm">
                        <p className="text-blue-50 text-center text-lg font-medium leading-relaxed drop-shadow-md">
                            {messages[messages.length - 1].content.split('---SEP---')[0]}
                        </p>
                     </div>
                 )}
            </div>

            {/* Interaction Controls */}
            <div className="relative z-50 mb-16">
                {visualState === 'listening' ? (
                    <button 
                        onClick={stopRecording}
                        className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 text-red-100 flex items-center justify-center animate-pulse hover:bg-red-500 hover:text-white transition-all"
                    >
                        <div className="w-8 h-8 rounded bg-current" />
                    </button>
                ) : (
                    <button 
                        onClick={startRecording}
                        disabled={isLoading || visualState === 'speaking'}
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 border border-white/10 backdrop-blur-md ${
                            isLoading 
                            ? 'bg-white/5 opacity-50 animate-pulse cursor-wait' 
                            : 'bg-white/10 hover:bg-blue-500 hover:scale-110 hover:border-transparent hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]'
                        }`}
                    >
                        <Mic size={32} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default VoiceView;