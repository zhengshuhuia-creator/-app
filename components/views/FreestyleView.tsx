import React, { useEffect, useRef } from 'react';
import ChatMessage from '../ChatMessage';
import { Message, UserProfile } from '../../types';

interface ViewProps {
  messages: Message[];
  isLoading: boolean;
  userProfile?: UserProfile;
}

const FreestyleView: React.FC<ViewProps> = ({ messages, isLoading, userProfile }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  return (
    <div className="h-full overflow-y-auto scrollbar-hide bg-[#BACEE0] pt-4 pb-32">
        <div className="max-w-xl mx-auto">
            {/* Date Separator Example */}
            <div className="flex justify-center mb-6">
                <span className="bg-black/10 text-white/90 text-[10px] px-3 py-1 rounded-full backdrop-blur-sm">
                    {new Date().toLocaleDateString()}
                </span>
            </div>

            {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} variant="kakao" userProfile={userProfile} />
            ))}
            
            {isLoading && (
                <div className="flex justify-start px-2 mb-4">
                     {/* Placeholder for Bot Avatar alignment */}
                     <div className="w-10 mr-3"></div> 
                     <div className="bg-white px-4 py-2.5 rounded-[18px] rounded-tl-none border border-slate-100/50 shadow-sm flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                       <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                       <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                    </div>
                </div>
            )}
            <div ref={bottomRef} />
        </div>
    </div>
  );
};

export default FreestyleView;