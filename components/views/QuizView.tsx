import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../../types';
import { Trophy, ArrowRight, Volume2, CheckCircle2 } from 'lucide-react';

interface ViewProps {
  messages: Message[];
  isLoading: boolean;
}

const QuizView: React.FC<ViewProps> = ({ messages, isLoading }) => {
  // We focus on the last message from the bot (Question or Result)
  const lastBotMessage = [...messages].reverse().find(m => m.role === 'model' && m.id !== 'welcome');
  
  const speak = (text: string) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    if (lastBotMessage && !isLoading) {
        speak(lastBotMessage.content);
    }
  }, [lastBotMessage?.id, isLoading]);

  return (
    <div className="h-full flex flex-col bg-white">
        {/* Progress Header */}
        <div className="px-6 py-4 flex items-center gap-4">
             <button className="text-slate-300 hover:text-slate-500"><ArrowRight className="rotate-180" /></button>
             <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                 <div className="h-full bg-green-500 w-[60%] rounded-full shadow-[0_2px_0_#16a34a]"></div>
             </div>
             <div className="text-green-600 font-bold flex items-center gap-1">
                 <Trophy size={18} />
                 <span>5</span>
             </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 pb-40 text-center max-w-lg mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
            
            {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                     <div className="w-20 h-20 border-4 border-slate-200 border-t-k-primary rounded-full animate-spin"></div>
                     <p className="text-slate-400 font-bold text-lg">思考中...</p>
                </div>
            ) : lastBotMessage ? (
                <>
                    <div className="mb-8">
                        <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Volume2 size={40} onClick={() => speak(lastBotMessage.content)} className="cursor-pointer hover:scale-110 transition-transform"/>
                        </div>
                        <div className="prose prose-xl prose-p:font-bold prose-p:text-slate-700 prose-headings:text-slate-900">
                            <ReactMarkdown>{lastBotMessage.content}</ReactMarkdown>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center">
                    <h2 className="text-3xl font-black text-slate-800 mb-4">准备开始</h2>
                    <p className="text-slate-500 text-lg">在下方输入“开始”即可进入挑战！</p>
                </div>
            )}

        </div>

        {/* Bottom Hint */}
        {!isLoading && lastBotMessage && (
            <div className="absolute bottom-28 left-0 w-full flex justify-center pointer-events-none">
                 <div className="bg-slate-900/80 text-white px-4 py-2 rounded-full backdrop-blur-sm text-sm font-medium animate-pulse">
                     请直接输入答案
                 </div>
            </div>
        )}
    </div>
  );
};

export default QuizView;