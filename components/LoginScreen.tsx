import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ArrowRight, Sparkles } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (profile: UserProfile) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState(Math.random().toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onLogin({
      name: name.trim(),
      avatarId: avatarSeed,
      isLoggedIn: true
    });
  };

  const regenerateAvatar = () => {
    setAvatarSeed(Math.random().toString());
  };

  // Using Dicebear Notion style for a clean, friendly look
  const avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=e0e7ff`;

  return (
    <div className="h-full w-full bg-white flex flex-col items-center justify-center p-8 animate-in fade-in duration-700">
      
      {/* Logo Area */}
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-k-primary to-k-accent rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 mx-auto mb-6 rotate-3">
          <span className="text-4xl">🇰🇷</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">K-Completer</h1>
        <p className="text-slate-500 font-medium">你的 AI 韩语口语私教</p>
      </div>

      {/* Login Card */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-6">
        
        {/* Avatar Selector */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group cursor-pointer" onClick={regenerateAvatar}>
             <div className="w-28 h-28 rounded-full border-4 border-slate-50 shadow-lg overflow-hidden bg-indigo-50 relative">
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
             </div>
             <div className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-slate-100 text-slate-600">
                <Sparkles size={16} />
             </div>
          </div>
          <p className="text-xs text-slate-400">点击头像随机切换</p>
        </div>

        {/* Input */}
        <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">怎么称呼你?</label>
            <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入你的昵称..."
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-medium outline-none focus:ring-2 focus:ring-k-primary/50 focus:bg-white transition-all placeholder:text-slate-300"
                autoFocus
            />
        </div>

        {/* Button */}
        <button 
            type="submit"
            disabled={!name.trim()}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            开始旅程
            <ArrowRight size={20} />
        </button>
      </form>

      <p className="fixed bottom-8 text-[10px] text-slate-300 text-center max-w-[200px]">
        数据将存储在本地设备中
      </p>
    </div>
  );
};

export default LoginScreen;