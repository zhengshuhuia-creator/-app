import React, { useState, useEffect, useRef } from 'react';
import { initializeChat, sendMessageToGemini, AudioInput } from './services/gemini';
import InputArea from './components/InputArea';
import ModeSelector, { AppMode } from './components/ModeSelector';
import FreestyleView from './components/views/FreestyleView';
import QuizView from './components/views/QuizView';
import RoleplayView from './components/views/RoleplayView';
import VoiceView from './components/views/VoiceView'; 
import LoginScreen from './components/LoginScreen'; // Import Login
import { Message, UserProfile } from './types';
import { MessageCircleHeart } from 'lucide-react';

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'model',
  content: `### 💬 안녕하세요! 你好呀。
我是你的韩语补全计划 (**K-Completer**)。

**不管你想怎么聊，我都能接住：**
1.  **散装对话**: 你说中文夹杂单词，我教你地道说法。
2.  **词汇测验**: 玩游戏记单词（猜词、填空）。
3.  **场景模拟**: 变身店员或司机，实战演练。

试试对我说：**"明天我想吃 bulgogi"**，或者点击上方**“词汇测验”**开始游戏！`,
  timestamp: Date.now()
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

function App() {
  // Auth State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Data State
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<AppMode>('freestyle');
  const [activeScenario, setActiveScenario] = useState<string>('default');
  
  // Load Persistence on Mount
  useEffect(() => {
    const storedUser = localStorage.getItem('k-completer-user');
    const storedMessages = localStorage.getItem('k-completer-messages');

    if (storedUser) {
        setUserProfile(JSON.parse(storedUser));
    }
    if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
    }
    
    // Always init chat
    const historyToUse = storedMessages ? JSON.parse(storedMessages) : [WELCOME_MESSAGE];
    
    const init = async () => {
        try {
            await initializeChat(historyToUse);
        } catch (e) {
            console.error("Failed to init chat", e);
        }
    }
    init();
  }, []);

  // Save persistence on update
  useEffect(() => {
    if (messages.length > 1) { // Don't save if only welcome message exists initially
        localStorage.setItem('k-completer-messages', JSON.stringify(messages));
    }
  }, [messages]);

  const handleLogin = (profile: UserProfile) => {
      setUserProfile(profile);
      localStorage.setItem('k-completer-user', JSON.stringify(profile));
  };

  const handleSendMessage = async (text: string, audioBlob?: Blob) => {
    let userMessageContent = text;
    let audioUrl: string | undefined;
    let audioInput: AudioInput | undefined;

    if (audioBlob) {
        audioUrl = URL.createObjectURL(audioBlob);
        userMessageContent = text || "(语音消息)";
        
        try {
            const base64 = await blobToBase64(audioBlob);
            audioInput = {
                base64: base64,
                mimeType: audioBlob.type || 'audio/webm'
            };
        } catch (e) {
            console.error("Failed to process audio", e);
            return;
        }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      audioUrl: audioUrl,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(text, messages, audioInput);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "### ⚠️ 连接错误\n抱歉，网络开小差了，请检查网络或 API Key。",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSelect = (mode: AppMode, cmd: string) => {
    setCurrentMode(mode);
    if (mode === 'roleplay' && cmd) {
        setActiveScenario(cmd);
    }
    if (cmd) {
        handleSendMessage(cmd);
    }
  };

  // If not logged in, show Login Screen
  if (!userProfile) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentMode) {
      case 'voice':
         return <VoiceView messages={messages} isLoading={isLoading} onSend={handleSendMessage} />;
      case 'quiz':
        return <QuizView messages={messages} isLoading={isLoading} />;
      case 'roleplay':
        return <RoleplayView messages={messages} isLoading={isLoading} scenario={activeScenario} userProfile={userProfile} />;
      case 'freestyle':
      default:
        return <FreestyleView messages={messages} isLoading={isLoading} userProfile={userProfile} />;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-white shadow-2xl relative overflow-hidden pt-safe">
      
      {/* Header */}
      <header className="flex-shrink-0 bg-white z-20 shadow-sm relative transition-all duration-300">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Bot Avatar in Header */}
            <div className="w-9 h-9 rounded-full border border-slate-200 overflow-hidden shadow-sm">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=c7d2fe&clothing=collarAndSweater&clothingColor=3c4f76" alt="Bot" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight tracking-tight">K-Completer</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">AI Language Companion</p>
            </div>
          </div>
          
          {/* User Mini Profile */}
          <div className="flex items-center gap-2">
               <span className="text-xs font-semibold text-slate-600 hidden sm:block">Hi, {userProfile.name}</span>
               <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    <img 
                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${userProfile.avatarId}&backgroundColor=e0e7ff`} 
                        alt="User" 
                        className="w-full h-full object-cover" 
                    />
               </div>
          </div>
        </div>
        
        <ModeSelector 
            currentMode={currentMode} 
            onSelectMode={handleModeSelect} 
            disabled={isLoading} 
        />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {renderContent()}
      </main>

      {/* Input Area (Hidden in Voice Mode) */}
      {currentMode !== 'voice' && (
         <InputArea onSend={handleSendMessage} isLoading={isLoading} />
      )}
    </div>
  );
}

export default App;