import React, { useEffect, useRef } from 'react';
import ChatMessage from '../ChatMessage';
import { Message, UserProfile } from '../../types';

interface ViewProps {
  messages: Message[];
  isLoading: boolean;
  scenario?: string;
  userProfile?: UserProfile;
}

// THEME CONFIGURATION
// Maps keywords to visual styles
const SCENARIO_THEMES: Record<string, { bg: string, emoji: string, userBubble: string, name: string }> = {
    'coffee': { 
        name: 'Cafe Mode',
        bg: 'bg-gradient-to-br from-[#FFF8E1] to-[#FFECB3]', // Latte
        emoji: '☕️', 
        userBubble: 'bg-[#FFE082]' // Darker yellow
    },
    'cafe': { 
        name: 'Cafe Mode',
        bg: 'bg-gradient-to-br from-[#FFF8E1] to-[#FFECB3]', 
        emoji: '☕️', 
        userBubble: 'bg-[#FFE082]'
    },
    'taxi': { 
        name: 'Traffic Mode',
        bg: 'bg-gradient-to-br from-[#FEF9D7] to-[#FFF176]', // Lemon
        emoji: '🚕', 
        userBubble: 'bg-[#FFF59D]' 
    },
    'car': { 
        name: 'Traffic Mode',
        bg: 'bg-gradient-to-br from-[#FEF9D7] to-[#FFF176]', 
        emoji: '🚕', 
        userBubble: 'bg-[#FFF59D]' 
    },
    'shop': { 
        name: 'Shopping Mode',
        bg: 'bg-gradient-to-br from-[#FCE4EC] to-[#F8BBD0]', // Sakura
        emoji: '🛍️', 
        userBubble: 'bg-[#F48FB1]' 
    },
    'buy': { 
        name: 'Shopping Mode',
        bg: 'bg-gradient-to-br from-[#FCE4EC] to-[#F8BBD0]', 
        emoji: '🛍️', 
        userBubble: 'bg-[#F48FB1]' 
    },
    'pharmacy': { 
        name: 'Medical Mode',
        bg: 'bg-gradient-to-br from-[#E0F7FA] to-[#B2EBF2]', // Mint
        emoji: '💊', 
        userBubble: 'bg-[#80DEEA]' 
    },
    'drug': { 
        name: 'Medical Mode',
        bg: 'bg-gradient-to-br from-[#E0F7FA] to-[#B2EBF2]', 
        emoji: '💊', 
        userBubble: 'bg-[#80DEEA]' 
    },
    'default': { 
        name: 'Scenario Mode',
        bg: 'bg-gradient-to-br from-[#F3E5F5] to-[#E1BEE7]', // Lavender
        emoji: '🎭', 
        userBubble: 'bg-[#CE93D8]' 
    }
};

const getTheme = (scenario: string = '') => {
    const key = Object.keys(SCENARIO_THEMES).find(k => scenario.toLowerCase().includes(k));
    return SCENARIO_THEMES[key || 'default'];
};

const RoleplayView: React.FC<ViewProps> = ({ messages, isLoading, scenario, userProfile }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  // Filter out Welcome message for immersion
  const immersiveMessages = messages.filter(m => m.id !== 'welcome');
  const theme = getTheme(scenario);

  return (
    <div className={`h-full relative overflow-hidden transition-all duration-1000 ${theme.bg}`}>
        {/* Background Pattern Layer */}
        <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-50 z-0"></div>

        {/* Floating Visual Anchor (Giant Emoji) */}
        <div className="absolute top-10 right-4 z-0 opacity-20 transform rotate-12 pointer-events-none animate-float">
            <span className="text-[150px] filter drop-shadow-xl">{theme.emoji}</span>
        </div>

        {/* Content Container */}
        <div className="relative z-10 h-full overflow-y-auto scrollbar-hide pt-20 pb-32 flex flex-col">
            
            {/* Scenario Header Label */}
            <div className="fixed top-[5.5rem] left-0 right-0 flex justify-center z-20 pointer-events-none">
                <span className="bg-white/80 backdrop-blur-sm px-4 py-1 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-white/50 tracking-widest uppercase">
                    {theme.name}
                </span>
            </div>

            <div className="max-w-xl mx-auto w-full min-h-[50%] flex flex-col justify-end px-2">
                
                {immersiveMessages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500/50 p-8 text-center mt-20">
                        <span className="text-6xl mb-4 grayscale opacity-50">{theme.emoji}</span>
                        <p className="text-lg font-medium tracking-wide">场景加载完毕</p>
                        <p className="text-sm mt-2">请开始你的表演...</p>
                    </div>
                )}

                {immersiveMessages.map((msg) => (
                    <ChatMessage 
                        key={msg.id} 
                        message={msg} 
                        variant="cute" 
                        userProfile={userProfile}
                        userBubbleColor={theme.userBubble}
                    />
                ))}

                {isLoading && (
                    <div className="flex justify-start px-4 mb-4">
                        <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border-2 border-white shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-100"></span>
                            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                )}
                
                <div ref={bottomRef} />
            </div>
        </div>
    </div>
  );
};

export default RoleplayView;