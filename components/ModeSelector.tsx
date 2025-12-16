import React from 'react';
import { Coffee, Car, ShoppingBag, Stethoscope, Gamepad2, MessageCircle, Mic } from 'lucide-react';

export type AppMode = 'freestyle' | 'quiz' | 'roleplay' | 'voice';

interface ModeSelectorProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode, cmd: string) => void;
  disabled: boolean;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onSelectMode, disabled }) => {
  
  return (
    <div className="bg-white px-4 pt-1 pb-0 relative z-30">
        <div className="flex items-center justify-around sm:justify-center sm:gap-10 border-b border-slate-50">
            
            <TabButton 
                active={currentMode === 'freestyle'}
                onClick={() => onSelectMode('freestyle', '我们回到散装对话模式吧。')}
                icon={MessageCircle}
                label="聊天"
                disabled={disabled}
                colorClass="text-k-primary"
            />

            <TabButton 
                active={currentMode === 'quiz'}
                onClick={() => onSelectMode('quiz', '考考我！开始词汇测验。')}
                icon={Gamepad2}
                label="刷题"
                disabled={disabled}
                colorClass="text-k-accent"
            />

            <TabButton 
                active={currentMode === 'roleplay'}
                onClick={() => onSelectMode('roleplay', '我想进行场景模拟对话，请给我推荐几个场景。')}
                icon={Coffee}
                label="剧本"
                disabled={disabled}
                colorClass="text-indigo-600"
            />

            <TabButton 
                active={currentMode === 'voice'}
                onClick={() => onSelectMode('voice', '')}
                icon={Mic}
                label="语音"
                disabled={disabled}
                colorClass="text-teal-500"
            />
        </div>

        {/* Sub-menu for Roleplay */}
        {currentMode === 'roleplay' && (
             <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide animate-in slide-in-from-top-2">
                <ScenarioChip label="弘大咖啡" icon={Coffee} onClick={() => onSelectMode('roleplay', '进入场景：在弘大咖啡厅点单。')} />
                <ScenarioChip label="出租车" icon={Car} onClick={() => onSelectMode('roleplay', '进入场景：给顽固的出租车司机指路。')} />
                <ScenarioChip label="东大门" icon={ShoppingBag} onClick={() => onSelectMode('roleplay', '进入场景：在东大门买衣服砍价。')} />
                <ScenarioChip label="药店" icon={Stethoscope} onClick={() => onSelectMode('roleplay', '进入场景：身体不舒服去药店买药。')} />
             </div>
        )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label, disabled, colorClass }: any) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex flex-col items-center gap-1 pb-3 px-4 transition-all relative ${
            active ? colorClass : 'text-slate-300 hover:text-slate-400'
        }`}
    >
        <Icon size={22} strokeWidth={active ? 2.5 : 2} />
        <span className={`text-[10px] font-bold ${active ? '' : 'font-medium'}`}>{label}</span>
        {active && (
            <span className={`absolute bottom-0 w-8 h-1 rounded-t-full bg-current opacity-80`} />
        )}
    </button>
);

const ScenarioChip = ({ label, icon: Icon, onClick }: { label: string, icon: any, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 font-medium whitespace-nowrap hover:bg-slate-100 hover:scale-105 transition-all shadow-sm"
    >
        <Icon size={12} className="opacity-70" />
        {label}
    </button>
)

export default ModeSelector;