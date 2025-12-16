import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Mic, X, ChevronRight } from 'lucide-react';

interface InputAreaProps {
  onSend: (text: string, audioBlob?: Blob) => void;
  isLoading: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '24px'; // Reset
      textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("无法访问麦克风，请检查权限。");
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.onstop = () => {
        if (shouldSend) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          onSend(input, audioBlob);
          setInput('');
        }
        
        // Cleanup
        const tracks = mediaRecorder.stream.getTracks();
        tracks.forEach(track => track.stop());
        setIsRecording(false);
        setRecordingDuration(0);
        audioChunksRef.current = [];
      };
    } else {
        setIsRecording(false);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 px-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        {isRecording ? (
            // Recording State
            <div className="bg-slate-900 text-white rounded-full shadow-2xl p-2 pl-6 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="font-mono font-medium tracking-widest">{formatTime(recordingDuration)}</span>
                    <span className="text-xs text-slate-400 ml-2">松手发送</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => stopRecording(false)} className="p-3 rounded-full hover:bg-white/10 text-slate-300">
                        <X size={20} />
                    </button>
                    <button onClick={() => stopRecording(true)} className="p-3 rounded-full bg-k-primary text-white shadow-lg">
                        <Send size={20} />
                    </button>
                </div>
            </div>
        ) : (
            // Input State
            <form 
                onSubmit={handleSubmit}
                className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[32px] p-2 pr-2 pl-4 flex items-end gap-2 transition-all focus-within:ring-2 focus-within:ring-k-primary/20 focus-within:scale-[1.01]"
            >
                <button
                    type="button"
                    onClick={startRecording}
                    disabled={isLoading}
                    className="mb-1.5 p-2 text-slate-400 hover:text-k-primary hover:bg-indigo-50 rounded-full transition-colors flex-shrink-0"
                >
                    <Mic size={22} />
                </button>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入中文或韩语..."
                    className="w-full bg-transparent border-none focus:ring-0 resize-none py-3.5 text-slate-700 placeholder:text-slate-400 text-base leading-6 max-h-[100px]"
                    rows={1}
                    disabled={isLoading}
                />

                <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={`mb-1 p-3 rounded-full flex-shrink-0 transition-all duration-300 ${
                        input.trim() 
                        ? 'bg-slate-900 text-white shadow-lg rotate-0' 
                        : 'bg-slate-100 text-slate-300 rotate-90 scale-75'
                    }`}
                >
                    {isLoading ? <Sparkles className="animate-spin" size={18} /> : <ChevronRight size={22} />}
                </button>
            </form>
        )}
      </div>
    </div>
  );
};

export default InputArea;