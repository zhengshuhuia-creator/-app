import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, UserProfile } from '../types';
import { Volume2, ChevronDown, ChevronUp, BookOpen, Sparkles } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  userProfile?: UserProfile;
  variant?: 'kakao' | 'glass' | 'quiz' | 'cute';
  userBubbleColor?: string; // For 'cute' mode tone-on-tone effect
}

// Bot Avatar Configuration (Friendly 3D Style)
const BOT_AVATAR_URL = "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=c7d2fe&clothing=collarAndSweater&clothingColor=3c4f76";

const ChatMessage: React.FC<ChatMessageProps> = ({ message, userProfile, variant = 'kakao', userBubbleColor = 'bg-slate-100' }) => {
  const isBot = message.role === 'model';
  const [isExpanded, setIsExpanded] = useState(false);

  // User Avatar (Use the one from profile or fallback)
  const userAvatarUrl = userProfile 
    ? `https://api.dicebear.com/7.x/notionists/svg?seed=${userProfile.avatarId}&backgroundColor=e0e7ff`
    : `https://api.dicebear.com/7.x/notionists/svg?seed=User&backgroundColor=ffedd5`;

  const speak = (text: string) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  // --- CONTENT SPLITTING LOGIC (For Kakao Mode) ---
  const parts = message.content.split('---SEP---');
  const naturalReply = parts[0];
  const educationalContent = parts.length > 1 ? parts[1] : null;

  // 1. KAKAO STYLE (Freestyle Default)
  if (variant === 'kakao') {
    return (
      <div className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'} mb-5 px-2 animate-in slide-in-from-bottom-2`}>
        {/* Avatar Area */}
        <div className={`flex-shrink-0 flex flex-col items-center ${isBot ? 'mr-3' : 'ml-3 order-last'}`}>
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-100">
                <img 
                    src={isBot ? BOT_AVATAR_URL : userAvatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                />
            </div>
            {isBot && <span className="text-[10px] text-slate-400 mt-1 font-medium">Felix</span>}
        </div>
        
        <div className={`max-w-[75%] flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
            {/* The Main Bubble */}
            <div className={`relative px-4 py-3 text-[15px] shadow-sm leading-snug break-words ${
                isBot 
                ? 'bg-white text-slate-800 rounded-[20px] rounded-tl-none border border-slate-100' 
                : 'bg-[#FEE500] text-slate-900 rounded-[20px] rounded-tr-none border border-yellow-300/20'
            }`}>
                <ReactMarkdown components={{ p: ({node, ...props}) => <p className="mb-0" {...props} /> }}>
                    {naturalReply}
                </ReactMarkdown>
                
                {isBot && (
                    <button onClick={() => speak(naturalReply)} className="absolute -right-8 top-2 text-slate-300 hover:text-k-primary p-1 transition-colors">
                        <Volume2 size={16} />
                    </button>
                )}
            </div>

            {/* Collapsible Educational Note (Only for Bot & if SEP exists) */}
            {isBot && educationalContent && (
                <div className="mt-2 ml-1">
                    {!isExpanded ? (
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 hover:bg-white rounded-full border border-slate-200/50 shadow-sm transition-all text-xs font-medium text-slate-500"
                        >
                            <BookOpen size={12} className="text-k-primary" />
                            <span>点击看修正</span>
                            <ChevronDown size={12} />
                        </button>
                    ) : (
                        <div className="bg-[#fffde7] border border-yellow-100 rounded-xl p-4 mt-1 text-sm shadow-sm animate-in zoom-in-95 origin-top-left relative">
                            <div className="flex justify-between items-start mb-2 border-b border-yellow-200/50 pb-2">
                                <span className="text-xs font-bold text-yellow-800 uppercase tracking-wide flex items-center gap-1">
                                    <Sparkles size={10} /> 纠错笔记
                                </span>
                                <button onClick={() => setIsExpanded(false)} className="text-yellow-600 hover:text-yellow-800 p-1">
                                    <ChevronUp size={14} />
                                </button>
                            </div>
                            <div className="prose prose-sm prose-yellow max-w-none prose-p:my-1 prose-headings:text-xs prose-headings:font-bold prose-headings:text-yellow-900">
                                <ReactMarkdown>{educationalContent}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    );
  }

  // 2. CUTE STYLE (Scenario/Roleplay - Pastel Flat)
  if (variant === 'cute') {
      return (
        <div className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'} mb-4 px-4`}>
             <div className={`flex-shrink-0 -mt-2 ${isBot ? 'mr-3' : 'ml-3 order-last'}`}>
                 <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden border-2 border-white">
                     <img 
                        src={isBot ? BOT_AVATAR_URL : userAvatarUrl} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                    />
                 </div>
             </div>
             
             <div className={`relative px-5 py-3.5 rounded-3xl shadow-sm max-w-[80%] border-2 ${
                 isBot 
                 ? 'bg-white text-slate-700 rounded-tl-none border-white' 
                 : `${userBubbleColor} text-slate-800 rounded-tr-none border-transparent`
             }`}>
                <div className="markdown-content text-[15px] font-medium leading-relaxed">
                    <ReactMarkdown components={{ p: ({node, ...props}) => <p className="mb-0" {...props} /> }}>
                        {message.content}
                    </ReactMarkdown>
                </div>
             </div>
        </div>
      );
  }

  // 3. GLASS STYLE (Legacy or Specific use)
  if (variant === 'glass') {
      return (
        <div className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'} mb-4 px-4`}>
             <div className={`relative px-5 py-3 rounded-2xl backdrop-blur-md shadow-lg max-w-[85%] border ${
                 isBot 
                 ? 'bg-white/80 text-slate-900 rounded-tl-none border-white/50' 
                 : 'bg-black/60 text-white rounded-tr-none border-white/10'
             }`}>
                <div className="markdown-content text-[15px] font-medium leading-relaxed">
                    <ReactMarkdown components={{ p: ({node, ...props}) => <p className="mb-0" {...props} /> }}>
                        {message.content}
                    </ReactMarkdown>
                </div>
             </div>
        </div>
      );
  }

  // 4. QUIZ STYLE
  return (
    <div className="p-4 bg-white rounded-xl shadow-sm mb-4">
        <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>
  );
};

export default ChatMessage;