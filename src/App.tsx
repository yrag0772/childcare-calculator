/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { toJpeg } from 'html-to-image';
import { 
  Calculator, 
  RotateCcw, 
  Moon, 
  Sun, 
  CheckCircle2, 
  AlertTriangle,
  User,
  Home as HomeIcon,
  Baby,
  Users,
  Plus,
  Minus,
  Table as TableIcon,
  ArrowUpDown,
  Star,
  Clock,
  Camera,
  X,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addMinutes, startOfDay, differenceInMinutes, isWithinInterval } from 'date-fns';

// --- 合法組合窮舉數據 (順序: [未2日, 2上日, 未2夜, 2上夜, 未2全, 2上全]) ---
const LEGAL_LIST = [
  ...[[1, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 1],
  [2, 0, 0, 0, 0, 0], [1, 1, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0], [1, 0, 1, 0, 0, 0], [0, 1, 1, 0, 0, 0], [0, 0, 2, 0, 0, 0],
  [1, 0, 0, 1, 0, 0], [0, 1, 0, 1, 0, 0], [0, 0, 1, 1, 0, 0], [0, 0, 0, 2, 0, 0], [1, 0, 0, 0, 1, 0], [0, 1, 0, 0, 1, 0],
  [0, 0, 1, 0, 1, 0], [0, 0, 0, 1, 1, 0], [0, 0, 0, 0, 2, 0], [1, 0, 0, 0, 0, 1], [0, 1, 0, 0, 0, 1], [0, 0, 1, 0, 0, 1],
  [0, 0, 0, 1, 0, 1], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 2], [0, 0, 2, 1, 0, 0], [0, 1, 1, 0, 1, 0], [0, 0, 2, 0, 1, 0],
  [0, 0, 1, 0, 2, 0], [1, 0, 1, 0, 0, 1], [0, 1, 1, 0, 0, 1], [0, 0, 2, 0, 0, 1], [0, 0, 1, 1, 0, 1], [0, 1, 0, 0, 1, 1],
  [0, 0, 0, 0, 2, 1], [1, 0, 0, 0, 0, 2], [0, 1, 0, 0, 0, 2], [0, 0, 1, 0, 0, 2], [0, 0, 0, 1, 0, 2], [0, 0, 0, 0, 1, 2],
  [0, 0, 0, 0, 0, 3], [0, 0, 2, 0, 2, 0], [0, 0, 1, 0, 2, 1], [0, 0, 2, 0, 0, 2], [0, 0, 0, 0, 2, 2], [0, 0, 1, 0, 0, 3],
  [0, 0, 0, 0, 0, 4]]
].map(row => [row[2], row[5], row[1], row[4], row[0], row[3]]);

// 自孩例外 1-4 (原始 mapping 轉換)
const SELF_EXCEPTIONS = [
  [0, 1, 0, 1, 0, 1], // 自孩1: 2上全1, 2上夜1, 2上日1
  [1, 0, 0, 1, 0, 1], // 自孩2: 未2日1, 2上全1, 2上夜1
  [1, 0, 0, 1, 1, 0], // 自孩3: 未2全1, 未2日1, 2上夜1
  [0, 1, 0, 1, 1, 0]  // 自孩4: 未2全1, 2上全1, 2上夜1
];

// --- 聯合托育 窮舉數據 (順序同上) ---
const JOINT_LIST = [
  [0,0,0,0,1,0], [0,0,0,0,0,1], [0,0,0,1,0,0], [0,0,1,0,0,0], [1,0,0,0,0,0], [0,1,0,0,0,0],
  [0,0,0,0,2,0], [0,0,0,0,0,2], [0,0,0,2,0,0], [0,0,2,0,0,0], [0,0,2,2,0,0], [2,0,0,0,0,0], [0,2,0,0,0,0],
  [1,0,1,0,0,0], [0,1,1,0,0,0], [1,0,0,1,0,0], [0,1,0,1,0,0], [0,0,1,1,0,0],
  [1,0,0,0,2,0], [0,1,0,0,2,0], [1,0,0,0,0,2], [0,1,0,0,0,2], 
  [0,0,1,0,2,0], [0,0,0,1,2,0], [0,0,1,0,0,2], [0,0,0,1,0,2],
  [1,1,1,1,0,0], [1,0,2,0,0,0], [0,1,2,0,0,0], [1,0,0,2,0,0], [0,1,0,2,0,0], [0,0,0,0,3,0], [0,0,0,0,0,3], [0,0,3,0,0,0], [0,0,0,3,0,0],
  [1,0,0,0,3,0], [0,1,0,0,3,0], [1,0,0,0,0,3], [0,1,0,0,0,3], [0,0,1,0,3,0], [0,0,0,1,3,0], [0,0,1,0,0,3], [0,0,0,1,0,3],
  [1,0,1,1,0,0], [0,1,1,1,0,0], [1,1,1,0,0,0], [1,1,0,1,0,0], [2,0,2,0,0,0], [0,2,2,0,0,0], [2,0,0,2,0,0], [0,2,0,2,0,0],
  [1,1,2,0,0,0], [1,1,0,2,0,0], [0,0,4,0,0,0], [0,0,0,4,0,0], [4,0,0,0,0,0], [0,4,0,0,0,0]
];
// 註：JOINT_LIST 的數據主要反應「總額度4位，且夜全合計上限2位」的原則。
// 使用者提供的數據：
// 全日1: [0,0,0,0,1,0] or [0,0,0,0,0,1]
// 夜間1: [0,0,1,0,0,0] or [0,0,0,1,0,0]
// 日間1: [1,0,0,0,0,0] or [0,1,0,0,0,0]
// ... 依此類推。

const CATEGORIES = [
  { id: 0, name: '未滿2歲日間', icon: <Sun size={20} className="text-[#F59E0B]"/> },
  { id: 1, name: '2歲以上日間', icon: <Sun size={20} className="text-[#F59E0B]"/> },
  { id: 2, name: '未滿2歲夜間', icon: <Moon size={20} className="text-[#6366F1]"/> },
  { id: 3, name: '2歲以上夜間', icon: <Moon size={20} className="text-[#6366F1]"/> },
  { id: 4, name: '未滿2歲全日', icon: <HomeIcon size={20} className="text-[#3B82F6]"/> },
  { id: 5, name: '2歲以上全日', icon: <HomeIcon size={20} className="text-[#3B82F6]"/> }
];

export default function App() {
  const [tab, setTab] = useState<'normal' | 'self' | 'joint' | 'list' | 'sim' | 'help'>('normal');
  
  // 獨立狀態管理：確保切換模式時數據不打架
  const [normalCounts, setNormalCounts] = useState([0, 0, 0, 0, 0, 0]);
  const [selfCareCounts, setSelfCareCounts] = useState([0, 0, 0, 0, 0, 0]);
  const [selfProfileCounts, setSelfProfileCounts] = useState([0, 0, 0]); // [未2, 2-3外, 2-3無]
  const [jointCounts, setJointCounts] = useState([0, 0, 0, 0, 0, 0]);

  // 時段模擬器狀態
  const [simEvents, setSimEvents] = useState<any[]>([]);
  const simScreenshotRef = useRef<HTMLDivElement>(null);

  const takeSimScreenshot = async () => {
    if (!simScreenshotRef.current) return;
    try {
      const dataUrl = await toJpeg(simScreenshotRef.current, { quality: 1, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      const now = new Date();
      const dateStr = format(now, 'yyyyMMddHHmmss');
      link.download = `收托人數時段模擬_${dateStr}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Screenshot failed:', err);
    }
  };

  // 根據當前模式選擇對應的數據集
  const currentCounts = tab === 'normal' ? normalCounts : tab === 'self' ? selfCareCounts : jointCounts;
  
  // 自孩模式連動邏輯之最小值
  const curMins = useMemo(() => {
    if (tab !== 'self') return [0, 0, 0, 0, 0, 0];
    // 未2自->未2夜(2), 2-3外自->2上夜(3), 2-3無自->2上全(5)
    return [0, 0, selfProfileCounts[0], selfProfileCounts[1], 0, selfProfileCounts[2]];
  }, [tab, selfProfileCounts]);

  // 自孩模式是否處於凍結狀態 (自孩總數為0)
  const isSelfFrozen = tab === 'self' && selfProfileCounts.reduce((a, b) => a + b, 0) === 0;

  const stats = useMemo(() => {
    let isValid = false;
    let suggestions: { name: string; extra: number; catIdx: number }[] = [];
    const totalInput = currentCounts.reduce((a, b) => a + b, 0);
    
    // 決定要比對的合法清單
    let fullList = LEGAL_LIST;
    if (tab === 'self') fullList = [...LEGAL_LIST, ...SELF_EXCEPTIONS];
    if (tab === 'joint') {
      // 聯合托育簡易規則：總量<=4，且 2,3,4,5 (夜/全) 合計 <= 2
      const fullNight = currentCounts[2] + currentCounts[3] + currentCounts[4] + currentCounts[5];
      isValid = (totalInput <= 4) && (fullNight <= 2);
    } else {
      isValid = fullList.some(row => currentCounts.every((v, i) => v <= row[i]));
    }

    if (isValid) {
      const maxPossible: Record<number, number> = {};
      
      if (tab === 'joint') {
        // 聯合托育建議方案：合併年齡區分
        const groupedPossible: Record<string, number> = { "日間托育": 0, "夜間托育": 0, "全日托育": 0 };
        
        // 0,1 -> 日間; 2,3 -> 夜間; 4,5 -> 全日
        [
          { range: [0, 1], label: "日間托育", iconIdx: 1 },
          { range: [2, 3], label: "夜間托育", iconIdx: 3 },
          { range: [4, 5], label: "全日托育", iconIdx: 5 }
        ].forEach(group => {
          let extra = 0;
          let temp = [...currentCounts];
          // 在該時段增加人數（優先增加2歲以上，以符合最大額度測試）
          while (true) {
            temp[group.range[1]]++; 
            const tempTotal = temp.reduce((a, b) => a + b, 0);
            const tempFullNight = temp[2] + temp[3] + temp[4] + temp[5];
            if (tempTotal <= 4 && tempFullNight <= 2) {
              extra++;
            } else {
              break;
            }
          }
          if (extra > 0) suggestions.push({ name: group.label, extra, catIdx: group.iconIdx });
        });
      } else {
        fullList.forEach(row => {
          if (currentCounts.every((v, i) => v <= row[i])) {
            row.forEach((limit, i) => {
              const extra = limit - currentCounts[i];
              if (extra > 0) maxPossible[i] = Math.max(maxPossible[i] || 0, extra);
            });
          }
        });

        suggestions = [0, 1, 2, 3, 4, 5]
          .filter(idx => maxPossible[idx])
          .map(idx => ({ name: CATEGORIES[idx].name, extra: maxPossible[idx], catIdx: idx }));
      }
    }

    return { isValid, totalInput, suggestions };
  }, [currentCounts, tab]);

  const update = (i: number, v: number) => {
    if (tab === 'normal') {
      const n = [...normalCounts];
      n[i] = Math.max(0, v);
      setNormalCounts(n);
    } else if (tab === 'self') {
      if (isSelfFrozen) return;
      const n = [...selfCareCounts];
      n[i] = Math.max(curMins[i], v);
      setSelfCareCounts(n);
    } else if (tab === 'joint') {
      const n = [...jointCounts];
      n[i] = Math.max(0, v);
      setJointCounts(n);
    }
  };

  const updateSelfProfile = (i: number, v: number) => {
    const oldMins = [...curMins];
    const n = [...selfProfileCounts];
    n[i] = Math.min(2, Math.max(0, v));
    setSelfProfileCounts(n);
    
    // 計算新的最小值
    const newMins = [0, 0, 0, 0, 0, 0];
    newMins[2] = n[0]; // 未2
    newMins[3] = n[1]; // 2-3外
    newMins[5] = n[2]; // 2-3無

    // 同步更新自孩收托人數的最小值連動
    const newCounts = [...selfCareCounts];
    [2, 3, 5].forEach(idx => {
      if (newCounts[idx] === oldMins[idx] || newCounts[idx] < newMins[idx]) {
        newCounts[idx] = newMins[idx];
      }
    });
    setSelfCareCounts(newCounts);
  };

  const reset = () => {
    setNormalCounts([0, 0, 0, 0, 0, 0]);
    setSelfCareCounts([0, 0, 0, 0, 0, 0]);
    setSelfProfileCounts([0, 0, 0]);
    setJointCounts([0, 0, 0, 0, 0, 0]);
    setSimEvents([]);
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] flex flex-col text-[#1E293B] overflow-hidden font-sans">
      
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .animate-blink {
          animation: blink 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      
      <header className="lg:h-16 h-14 bg-white lg:px-8 px-4 flex items-center justify-between border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 lg:gap-4 shrink-0">
          <Calculator className="text-[#E34B87] lg:w-6 lg:h-6 w-5 h-5 shrink-0" />
          <h1 className="lg:text-xl text-base font-black tracking-tight whitespace-nowrap">收托人數計算機</h1>
        </div>
        {(tab !== 'list' && tab !== 'help') && (
          <div className="flex gap-1.5 lg:gap-2 shrink-0">
            {tab === 'sim' && (
              <button 
                onClick={takeSimScreenshot} 
                className="flex items-center gap-1.5 lg:gap-2 bg-slate-900 px-3 lg:px-5 py-1.5 rounded-xl text-[10px] lg:text-xs font-bold hover:bg-slate-800 transition-all text-white shadow-lg active:scale-95 shrink-0"
              >
                <Camera size={12} className="lg:w-3.5 lg:h-3.5" /> 截圖
              </button>
            )}
            <button onClick={reset} className="flex items-center gap-1.5 lg:gap-2 bg-slate-100 px-3 lg:px-5 py-1.5 rounded-xl text-[10px] lg:text-xs font-bold hover:bg-slate-200 transition-all text-slate-600 shrink-0">
               <RotateCcw size={12} className="lg:w-3.5 lg:h-3.5" /> 
               <span className="hidden xs:inline">重置所有數據</span>
               <span className="xs:hidden">重置</span>
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden lg:flex-row flex-col relative">
        
        {/* 左側導覽 (電腦版顯示) */}
        <aside className="w-64 bg-white border-r border-slate-200 lg:flex flex-col p-4 shrink-0 overflow-y-auto custom-scrollbar hidden">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4">作業模式</h2>
           <nav className="space-y-1 mb-8">
             <NavBtn active={tab === 'normal'} icon={<User size={18}/>} label="一般模式" onClick={()=> setTab('normal')} />
             <NavBtn active={tab === 'self'} icon={<HomeIcon size={18}/>} label="自孩模式" onClick={()=> setTab('self')} />
             <NavBtn active={tab === 'joint'} icon={<Users size={18}/>} label="聯合托育" onClick={()=> setTab('joint')} />
             <NavBtn active={tab === 'sim'} icon={<Clock size={18}/>} label="時段模擬器" onClick={()=> setTab('sim')} />
             <NavBtn active={tab === 'list'} icon={<TableIcon size={18}/>} label="收托組合表" onClick={()=> setTab('list')} />
             <NavBtn active={tab === 'help'} icon={<Info size={18}/>} label="系統說明" onClick={()=> setTab('help')} />
           </nav>

           {/* 自孩條件設定 (僅在自孩模式顯示於左側) */}
           {tab === 'self' && (
             <div className="mt-auto pt-8 border-t-2 border-slate-100 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="px-3">
                  <h3 className={`text-xl font-black text-[#E34B87] uppercase tracking-widest mb-3 flex items-center gap-3 ${isSelfFrozen ? 'animate-blink' : ''}`}>
                    <Star size={24} fill="currentColor"/> 自孩條件設定
                  </h3>
                  <p className="text-sm font-bold text-slate-500 leading-relaxed mb-4">
                    ※ 未滿2歲、2-3歲家外送托視作夜間；2-3歲未家外送托視作全日
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <SidebarSelfInput label="未滿2歲" value={selfProfileCounts[0]} onChange={(v)=>updateSelfProfile(0, v)} />
                  <SidebarSelfInput label="2-3歲家外送托" value={selfProfileCounts[1]} onChange={(v)=>updateSelfProfile(1, v)} />
                  <SidebarSelfInput label="2-3歲未家外送托" value={selfProfileCounts[2]} onChange={(v)=>updateSelfProfile(2, v)} />
                </div>
             </div>
           )}
        </aside>

        {/* 中間面板 */}
        <main className={`flex-1 lg:p-8 p-4 flex flex-col overflow-hidden ${['list', 'sim', 'help'].includes(tab) ? 'bg-white' : ''}`}>
           {tab === 'list' ? <ExhaustiveTable /> : tab === 'sim' ? <ScheduleSimulator events={simEvents} setEvents={setSimEvents} screenshotRef={simScreenshotRef}/> : tab === 'help' ? <HelpContent /> : (
             <div className="max-w-5xl mx-auto w-full h-full flex flex-col lg:space-y-6 space-y-4 overflow-hidden relative">
                
                {/* 手機版專屬：自孩設定區 (固定在最上方) */}
                <div className="lg:hidden shrink-0 z-[60]">
                  {tab === 'self' && (
                    <div className="bg-white border-2 border-[#E34B87] rounded-3xl p-3 shadow-xl mb-2">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className={`text-sm font-black text-[#E34B87] flex items-center gap-2 ${isSelfFrozen ? 'animate-blink' : ''}`}>
                          <Star size={16} fill="currentColor"/> 自孩條件設定
                        </h3>
                        <span className="text-[9px] font-bold text-slate-400 italic">※ 連動收托最小值</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <CompactSelfInput label="未滿2歲" value={selfProfileCounts[0]} onChange={(v)=>updateSelfProfile(0, v)} />
                        <CompactSelfInput label="2-3歲送托" value={selfProfileCounts[1]} onChange={(v)=>updateSelfProfile(1, v)} />
                        <CompactSelfInput label="2-3歲未送托" value={selfProfileCounts[2]} onChange={(v)=>updateSelfProfile(2, v)} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 relative overflow-hidden min-h-0">
                  <div className={`h-full overflow-y-auto pr-1 custom-scrollbar transition-all duration-500 pb-24 lg:pb-0 ${isSelfFrozen ? 'opacity-10 grayscale-[50%] blur-[2px] pointer-events-none' : 'opacity-100'}`}>
                    <div className="lg:space-y-12 space-y-8 py-4 px-1">
                      
                      {tab === 'joint' ? (
                        <div className="flex flex-col lg:gap-12 gap-8">
                           <InputGroup title="日間托育" color="bg-amber-100 text-amber-700" fullWidth>
                              <InputTile cat={CATEGORIES[1]} labelOverride="收托名額" value={currentCounts[1]} min={0} onChange={(v)=>update(1, v)} />
                           </InputGroup>
                           <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-12 gap-8">
                              <InputGroup 
                                title="夜間托育" 
                                color="bg-indigo-100 text-indigo-700" 
                                fullWidth
                              >
                                 <InputTile cat={CATEGORIES[3]} labelOverride="收托名額" value={currentCounts[3]} min={0} onChange={(v)=>update(3, v)} />
                              </InputGroup>
                              <InputGroup title="全日托育" color="bg-blue-100 text-blue-700" fullWidth>
                                 <InputTile cat={CATEGORIES[5]} labelOverride="收托名額" value={currentCounts[5]} min={0} onChange={(v)=>update(5, v)} />
                              </InputGroup>
                           </div>
                        </div>
                      ) : (
                        <>
                          <InputGroup title="日間托育" color="bg-amber-100 text-amber-700">
                            {[0, 1].map(i => <InputTile key={i} cat={CATEGORIES[i]} value={currentCounts[i]} min={curMins[i]} onChange={(v)=>update(i, v)} />)}
                          </InputGroup>

                          <InputGroup 
                            title="夜間托育" 
                            color="bg-indigo-100 text-indigo-700"
                            notice={tab === 'self' ? "※ 未滿2歲自孩依有無家外送托分成全日或夜間，但是人數計算上都是套用夜間托育的算法" : undefined}
                          >
                            {[2, 3].map(i => <InputTile key={i} cat={CATEGORIES[i]} value={currentCounts[i]} min={curMins[i]} onChange={(v)=>update(i, v)} />)}
                          </InputGroup>

                          <InputGroup title="全日托育" color="bg-blue-100 text-blue-700">
                            {[4, 5].map(i => <InputTile key={i} cat={CATEGORIES[i]} value={currentCounts[i]} min={curMins[i]} onChange={(v)=>update(i, v)} />)}
                          </InputGroup>
                        </>
                      )}
                    </div>
                  </div>

                  {isSelfFrozen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/5 backdrop-blur-[2px]">
                      <div className="bg-white px-8 py-8 lg:px-12 lg:py-12 rounded-[32px] lg:rounded-[48px] border-4 border-[#E34B87] shadow-[0_40px_80px_-15px_rgba(227,75,135,0.3)] scale-100 lg:scale-110 flex flex-col items-center gap-6 lg:gap-8 animate-in zoom-in slide-in-from-top-8 duration-500">
                        <div className="w-16 h-16 lg:w-24 lg:h-24 bg-[#E34B87] rounded-full flex items-center justify-center shadow-xl shadow-[#E34B87]/30">
                          <AlertTriangle className="text-white lg:w-12 lg:h-12" size={32} />
                        </div>
                        <div className="text-center space-y-2 lg:space-y-3">
                          <p className="text-xl lg:text-4xl font-black text-slate-900 tracking-tight">啟用計算機</p>
                          <p className="text-sm lg:hidden font-bold text-slate-500">請先於上方增加「自孩條件」</p>
                          <p className="text-xl hidden lg:block font-bold text-slate-500">請先於左側增加「自孩條件」</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
             </div>
           )}
        </main>

        {/* 右側監控 (電腦版顯示) */}
        {!['list', 'sim', 'help'].includes(tab) && (
          <aside className="w-[400px] bg-white border-l border-slate-200 lg:flex flex-col h-full shrink-0 shadow-[-10px_0_30px_rgba(30,41,59,0.02)] hidden">
            <div className={`h-[18%] flex flex-col items-center justify-center border-b border-slate-100 transition-colors shrink-0 ${
                 stats.isValid ? 'bg-emerald-50' : 'bg-rose-50'
               }`}>
                <div className={`mb-1 ${stats.isValid ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stats.isValid ? <CheckCircle2 size={40} /> : <AlertTriangle size={40} className="animate-pulse" />}
                </div>
                <div className={`text-4xl font-black tracking-tighter ${stats.isValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stats.isValid ? '符合規範' : '超收！'}
                </div>
            </div>

            <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
              <div className="bg-slate-50 p-4 rounded-[28px] border border-slate-100 flex items-center justify-between shrink-0">
                <div className="space-y-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目前收托人數</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black italic text-[#1E293B]">{stats.totalInput}</span>
                    <span className="text-lg font-bold text-slate-400">位</span>
                  </div>
                </div>
                <div className="flex gap-1.5 h-12 w-20 items-end">
                  {[1,2,3,4].map(v => (
                    <div key={v} className={`flex-1 rounded-t-lg transition-all duration-300 ${
                      v <= stats.totalInput ? 'bg-[#E34B87] h-full shadow-[0_-5px_10px_rgba(227,75,135,0.15)]' : 'bg-slate-200 h-2'
                    }`} />
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden text-center">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">仍可收托建議</h4>
                 <div className="flex-1 bg-slate-50 p-4 rounded-[32px] border border-slate-100 overflow-y-auto relative flex flex-col custom-scrollbar">
                    {stats.isValid && stats.suggestions.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {stats.suggestions.map((s, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm hover:border-[#E34B87]/40 hover:shadow-md transition-all group scale-100 active:scale-95">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
                                  {CATEGORIES[s.catIdx].icon}
                                </div>
                                <span className="text-sm font-black text-slate-700 text-left leading-tight">{s.name}</span>
                              </div>
                              <span className="bg-[#E34B87] text-white px-3 py-1.5 rounded-xl text-xs font-black shrink-0 shadow-[0_4px_10px_rgba(227,75,135,0.15)]">+{s.extra} 位</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-2">
                        {stats.totalInput > 0 && stats.isValid ? (
                          <div className="bg-amber-100 text-amber-700 px-6 py-5 rounded-[32px] border-2 border-amber-200 shadow-xl flex flex-col items-center gap-2 animate-bounce">
                             <Star size={32} fill="currentColor"/>
                             <span className="text-lg font-black whitespace-nowrap tracking-tight">✨ 人數已達上限</span>
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-slate-300 italic">尚無數據可用</p>
                        )}
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </aside>
        )}

        {/* 手機版底部：狀態與總人數 Sticky Bar */}
        {!['list', 'sim', 'help'].includes(tab) && (
          <div className="lg:hidden fixed bottom-[72px] left-0 right-0 z-40 px-4 pointer-events-none">
            <div className={`p-4 rounded-[32px] border-2 shadow-2xl flex items-center justify-between pointer-events-auto transition-colors ${
              stats.isValid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={stats.isValid ? 'text-emerald-500' : 'text-rose-500'}>
                  {stats.isValid ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} className="animate-pulse" />}
                </div>
                <div className="flex flex-col">
                  <span className={`text-lg font-black ${stats.isValid ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {stats.isValid ? '符合規範' : '超收！'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">目前收托：{stats.totalInput} 位</span>
                </div>
              </div>
              
              {/* 快速查看建議按鈕 */}
              {stats.isValid && (
                <div className="flex flex-col items-end gap-1">
                  {stats.suggestions.length > 0 ? (
                    <>
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shadow-sm">仍可收托</span>
                      <div className="flex -space-x-2">
                        {stats.suggestions.slice(0, 3).map((s, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-white border-2 border-emerald-100 flex items-center justify-center text-[#E34B87] shadow-sm">
                            {React.cloneElement(CATEGORIES[s.catIdx].icon as React.ReactElement, { size: 14 })}
                          </div>
                        ))}
                        {stats.suggestions.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-black">
                            +{stats.suggestions.length - 3}
                          </div>
                        )}
                      </div>
                    </>
                  ) : stats.totalInput > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                      <Star size={12} fill="currentColor"/>
                      <span className="text-[11px] font-black whitespace-nowrap">人數已達上限</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 手機版底部導覽列 */}
        <nav className="lg:hidden h-[72px] bg-white border-t border-slate-200 flex items-center justify-around px-2 shrink-0 z-50">
           <MobileNavBtn active={tab === 'normal'} icon={<User size={20}/>} label="一般" onClick={()=> setTab('normal')} />
           <MobileNavBtn active={tab === 'self'} icon={<HomeIcon size={20}/>} label="自孩" onClick={()=> setTab('self')} />
           <MobileNavBtn active={tab === 'joint'} icon={<Users size={20}/>} label="聯合" onClick={()=> setTab('joint')} />
           <MobileNavBtn active={tab === 'sim'} icon={<Clock size={20}/>} label="模擬" onClick={()=> setTab('sim')} />
           <MobileNavBtn active={tab === 'help'} icon={<Info size={20}/>} label="說明" onClick={()=> setTab('help')} />
        </nav>
      </div>
    </div>
  );
}

function HelpContent() {
  const sections = [
    {
      title: "系統使用說明",
      items: [
        "半日托育（課後托）以日間托育的類型來計算",
        "時段模擬器無法處理兩個托兒同一天都有送托，但兩位時間交接，不重疊的認定問題（例如托兒1：08:00-16:00，托兒2：16:30-20:30），此類情境依各地方主管機就判定",
        "本工具僅提供參考，確切判斷仍以主管機關為主",
        "自孩模式請先設定自孩的條件"
      ]
    },
    {
      title: "一般托育規則",
      items: [
        "總共人數至多4名",
        "未滿二歲至多2名",
        "日間托育每人佔1人名額",
        "全日托育每人佔2人名額",
        "夜間托育原則上佔2人名額，但是當「收托2名夜間托育和1名日間托育」或是「收托2名夜間托育和2名日間托育」時，夜間托育中2歲以上者每人佔1人名額（例外規則）"
      ]
    },
    {
      title: "自孩規則",
      items: [
        "自孩滿三歲後就不算收托人數",
        "有一位未滿二歲自孩，雖然有送托者視作夜間托育，無送托者視作全日托育，但是在人數計算上都是比照「有一名未滿二歲夜間托育」計算",
        "有一名2-3歲的自孩，有家外送托者視作2歲以上夜間托育，無家外送托者視作2歲以上全日托育，此狀態的額度屬於例外，總額至多能收托一位全日、一位夜間2歲以上、一位日間（例外規則）",
        "有二位未滿二歲自孩，比照有二名未滿二歲夜間托育計算（額滿）",
        "有一位未滿二歲自孩加上一位2-3歲自孩沒有家外送托，比照有一名未滿二歲夜間托育加上二歲以上全日托育計算（額滿）",
        "有一位未滿二歲自孩加上一位2-3歲自孩有送家外送托，比照有一名未滿二歲夜間托育加上二歲以上夜間托育（仍可收托一名日間托育）",
        "有二名2-3歲自孩家外送托，比照兩名兩歲以上夜間托育計算（仍可收托兩名日間托育）",
        "有二名2-3歲自孩沒有家外送托，比照兩名兩歲以上全日托育計算（額滿）"
      ]
    },
    {
      title: "聯合收托規則",
      items: [
        "總共人數至多四名",
        "日間托育每人佔1人名額",
        "全日托育和夜間托育每人佔1人名額，但是兩者加總起來至多2名"
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 lg:px-8 px-4 h-full overflow-y-auto custom-scrollbar">
      <div className="space-y-12 pb-24 lg:pb-12">
        {sections.map((sec, i) => (
          <section key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
            <h2 className="lg:text-2xl text-xl font-black text-slate-800 border-l-8 border-[#E34B87] pl-4 mb-6">{sec.title}</h2>
            <div className="grid grid-cols-1 gap-3">
              {sec.items.map((item, j) => (
                <div key={j} className="flex gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E34B87]/10 text-[#E34B87] flex items-center justify-center font-black text-sm">{j + 1}</span>
                  <p className="text-slate-600 font-bold leading-relaxed lg:text-base text-sm">{item}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function MobileNavBtn({ active, icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all ${
        active ? 'text-[#E34B87]' : 'text-slate-400'
      }`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-[#E34B87]/10' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-black">{label}</span>
    </button>
  );
}

function NavBtn({ active, icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-black transition-all ${
        active ? 'bg-[#E34B87] text-white shadow-lg shadow-[#E34B87]/20' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function InputTile({ cat, value, min, onChange, labelOverride }: any) {
  return (
    <div className={`bg-white border-2 rounded-[32px] lg:p-6 p-4 flex flex-col justify-between transition-all shadow-sm ${
      value > min ? 'border-[#E34B87]/20' : 'border-slate-50'
    }`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="lg:p-3 p-2 rounded-2xl bg-slate-50">
          {React.cloneElement(cat.icon as React.ReactElement, { size: 20 })}
        </div>
        <div className="flex flex-col">
          <span className="lg:text-lg text-base font-black text-slate-800 leading-tight">{labelOverride || cat.name}</span>
          {min > 0 && <span className="text-[10px] font-bold text-[#E34B87]">自孩連動中 (+{min})</span>}
        </div>
      </div>
      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl">
         <button disabled={value <= min} onClick={() => onChange(value - 1)} className={`lg:w-12 lg:h-12 w-10 h-10 flex items-center justify-center rounded-xl transition-all ${value <= min ? 'text-slate-300 bg-transparent' : 'bg-white shadow-sm text-slate-600 hover:bg-white'}`}>
           <Minus size={18}/>
         </button>
         <div className={`lg:text-4xl text-3xl font-black tracking-tighter ${value > min ? 'text-[#E34B87]' : 'text-slate-800'}`}>
            {value}
         </div>
         <button onClick={() => onChange(value + 1)} className="lg:w-12 lg:h-12 w-10 h-10 flex items-center justify-center bg-white shadow-sm text-slate-600 hover:bg-white rounded-xl transition-all">
           <Plus size={18}/>
         </button>
      </div>
    </div>
  );
}

function CompactSelfInput({ label, value, onChange }: any) {
  return (
    <div className="bg-slate-50 p-2 rounded-2xl flex flex-col items-center gap-1 border border-slate-100">
      <span className="text-[10px] font-black text-slate-500 text-center leading-tight whitespace-nowrap">{label}</span>
      <div className="flex items-center justify-between bg-white w-full px-1 py-1 rounded-xl border border-slate-200 shadow-sm">
        <button onClick={()=>onChange(value-1)} className={`p-0.5 rounded transition-all ${value<=0?'text-slate-200':'text-[#E34B87]'}`}><Minus size={14}/></button>
        <span className="text-base font-black text-slate-900 tabular-nums">{value}</span>
        <button onClick={()=>onChange(value+1)} className={`p-0.5 rounded transition-all ${value>=2?'text-slate-200':'text-[#E34B87]'}`}><Plus size={14}/></button>
      </div>
    </div>
  );
}

function SidebarSelfInput({ label, value, onChange }: any) {
  return (
    <div className="bg-slate-50 lg:p-4 p-3 rounded-2xl flex lg:flex-col flex-row items-center lg:items-start lg:gap-3 gap-2 border border-slate-100 hover:border-[#E34B87]/40 hover:bg-white transition-all group shadow-sm">
      <span className="lg:text-base text-xs font-black text-slate-700 leading-tight lg:flex-1">{label}</span>
      <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-2xl shadow-inner border border-slate-200 shrink-0">
        <button onClick={()=>onChange(value-1)} className={`p-1 rounded-lg transition-all ${value<=0?'text-slate-200':'text-[#E34B87] hover:bg-[#E34B87]/10'}`}><Minus size={16}/></button>
        <span className="lg:text-3xl text-xl font-black text-slate-900 lg:w-10 w-8 text-center tabular-nums">{value}</span>
        <button onClick={()=>onChange(value+1)} className={`p-1 rounded-lg transition-all ${value>=2?'text-slate-200':'text-[#E34B87] hover:bg-[#E34B87]/10'}`}><Plus size={16}/></button>
      </div>
    </div>
  );
}

function SelfInput({ label, value, onChange }: any) {
  return (
    <div className="bg-slate-50 p-2.5 rounded-2xl flex flex-col items-center border border-slate-100">
      <span className="text-xs font-black text-slate-500 mb-1">{label}</span>
      <div className="flex items-center gap-6">
        <button onClick={()=>onChange(value-1)} className={`p-1 rounded-md transition-all ${value<=0?'text-slate-300':'text-[#E34B87] hover:bg-white'}`}><Minus size={18}/></button>
        <span className="text-3xl font-black text-slate-800 w-8 text-center tabular-nums">{value}</span>
        <button onClick={()=>onChange(value+1)} className={`p-1 rounded-md transition-all ${value>=2?'text-slate-300':'text-[#E34B87] hover:bg-white'}`}><Plus size={18}/></button>
      </div>
    </div>
  );
}

function InputGroup({ title, color, children, className, fullWidth, notice }: any) {
  return (
    <div className={`relative lg:pt-10 pt-8 mt-2 ${className || ''}`}>
      <div className="absolute -top-3 lg:left-6 left-2 z-10 flex items-center lg:gap-4 gap-2 w-full pr-4">
        <div className={`shrink-0 lg:px-6 px-4 py-1.5 rounded-2xl lg:text-xl text-base font-black uppercase tracking-widest shadow-lg border-2 border-white ${color}`}>
          {title}
        </div>
        {notice && (
          <span className="text-[9px] lg:text-[11px] font-bold text-slate-400 italic leading-tight pt-1 max-w-[50%] lg:max-w-none">
            {notice}
          </span>
        )}
      </div>
      <div className={`grid grid-cols-1 ${fullWidth ? '' : 'md:grid-cols-2'} lg:gap-6 gap-4`}>
        {children}
      </div>
    </div>
  );
}

function ExhaustiveTable() {
  const [listType, setListType] = useState<'general' | 'joint'>('general');
  const [sortKey, setSortKey] = useState<number | 'total' | 'id' | 'status'>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterTotal, setFilterTotal] = useState<number | null>(null);

  const lists = useMemo(() => {
    if (listType === 'general') {
      const findMaximal = (val: number[], list: number[][]) => {
        const currentSum = val.reduce((a, b) => a + b, 0);
        if (currentSum === 4) return true;
        return !list.some(other => 
          val.every((v, i) => v <= other[i]) && other.reduce((a, b) => a + b, 0) > currentSum
        );
      };

      let generalRows = LEGAL_LIST.map((val, idx) => ({ 
        id: idx + 1, 
        val, 
        total: val.reduce((a,b)=>a+b, 0),
        isFull: findMaximal(val, LEGAL_LIST),
        category: '一般收托',
        desc: '',
        statusText: findMaximal(val, LEGAL_LIST) ? '已達上限' : '可再收托'
      }));

      const exceptionDescs = [
        "1位2-3歲自孩(家外送托) 視作夜間",
        "1位2-3歲自孩(家外送托) 視作夜間",
        "1位2-3歲自孩(未送外托) 視作全日",
        "1位2-3歲自孩(未送外托) 視作全日"
      ];

      let selfRows = SELF_EXCEPTIONS.map((val, idx) => ({ 
        id: 900 + idx + 1, 
        val, 
        total: val.reduce((a,b)=>a+b, 0),
        isFull: true,
        category: '自孩例外',
        desc: exceptionDescs[idx],
        statusText: '符合例外規範'
      }));

      let rows = [...generalRows, ...selfRows];
      if (filterTotal !== null) rows = rows.filter(r => r.total === filterTotal);
      
      rows.sort((a, b) => {
        let vA: any, vB: any;
        if (sortKey === 'id') { vA = a.id; vB = b.id; }
        else if (sortKey === 'total') { vA = a.total; vB = b.total; }
        else if (sortKey === 'status') { vA = a.statusText; vB = b.statusText; }
        else { vA = a.val[sortKey]; vB = b.val[sortKey]; }
        
        if (vA === vB) return 0;
        return sortDir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
      });
      return rows;
    } else {
      // 聯合托育清單：總量<=4，夜全<=2
      // 根據使用者提供的窮舉數據
      const rawJoint = [
        [1,0,0,1],[0,1,0,1],[0,0,1,1],[2,0,0,2],[0,2,0,2],[0,0,2,2],[1,1,0,2],[0,1,1,2],[1,0,1,2],
        [2,0,1,3],[0,2,1,3],[1,1,1,3],[1,0,2,3],[0,1,2,3],[0,0,3,3],[2,0,2,4],[0,2,2,4],
        [1,1,2,4],[0,1,3,4],[1,0,3,4],[0,0,4,4]
      ];
      
      let rows = rawJoint.map((row, idx) => {
        const val = [0, row[2], 0, row[1], 0, row[0]]; // 轉換為正確對應格式 [未2日, 2上日, 未2夜, 2上夜, 未2全, 2上全]
        return {
          id: idx + 1,
          val,
          total: row[3],
          category: '聯合收托',
          statusText: row[3] >= 4 ? '已達上限' : '可再收托'
        }
      });
      
      if (filterTotal !== null) rows = rows.filter(r => r.total === filterTotal);
      rows.sort((a, b) => {
        let vA: any, vB: any;
        if (sortKey === 'id') { vA = a.id; vB = b.id; }
        else if (sortKey === 'total') { vA = a.total; vB = b.total; }
        else if (sortKey === 'status') { vA = a.statusText; vB = b.statusText; }
        else { vA = a.val[sortKey]; vB = b.val[sortKey]; }
        if (vA === vB) return 0;
        return sortDir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
      });
      return rows;
    }
  }, [listType, sortKey, sortDir, filterTotal]);

  const toggleSort = (k: any) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
       <div className="flex lg:items-center lg:justify-between justify-start flex-col lg:flex-row gap-6 shrink-0">
          <div className="flex lg:items-center items-start gap-6 flex-col lg:flex-row w-full">
            <h2 className="lg:text-4xl text-2xl font-black text-slate-900 tracking-tight shrink-0">收托組合表</h2>
            
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200 shrink-0">
               <button onClick={()=>setListType('general')} className={`px-5 py-2 rounded-xl text-sm font-black transition-all ${listType === 'general' ? 'bg-white shadow-sm text-[#E34B87]' : 'text-slate-400'}`}>一般/自孩</button>
               <button onClick={()=>setListType('joint')} className={`px-5 py-2 rounded-xl text-sm font-black transition-all ${listType === 'joint' ? 'bg-white shadow-sm text-[#6366F1]' : 'text-slate-400'}`}>聯合托育</button>
            </div>

            <div className="flex-1 lg:pl-6 border-l-0 lg:border-l border-slate-200">
              <p className="lg:text-sm text-[10px] font-bold text-slate-500 leading-tight mb-1">
                {listType === 'general' 
                  ? '※ 自孩例外：1位2-3歲自孩家外送托(夜間)或未家外送托(全日)' 
                  : '※ 聯合規則：總人數不超過4位，且夜間與全日合計不超過2位'
                }
              </p>
              <p className="lg:text-sm text-[10px] font-bold text-slate-400 leading-tight">
                ※ 點選標題欄位可切換排序
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 lg:items-end items-start mt-2 lg:mt-0">
            <div className="bg-slate-100 lg:p-3 p-2 rounded-[24px] lg:rounded-[32px] border border-slate-200 shadow-inner flex flex-col gap-2 items-center w-full lg:w-auto">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 border-b border-slate-200 pb-1 w-full text-center">總人數篩選器</span>
               <div className="flex gap-2">
                 {[1,2,3,4].map(n => (
                   <button key={n} onClick={()=>setFilterTotal(filterTotal === n ? null : n)} className={`lg:w-12 lg:h-12 w-10 h-10 rounded-xl lg:rounded-2xl lg:text-lg text-base font-black transition-all ${filterTotal === n ? 'bg-[#E34B87] text-white shadow-lg' : 'hover:bg-white text-slate-500'}`}>{n}</button>
                 ))}
               </div>
            </div>
          </div>
        </div>
       <div className="flex-1 overflow-auto rounded-[32px] lg:rounded-[48px] border-[3px] border-slate-200 shadow-2xl bg-white custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[320px] lg:min-w-[1100px]">
             <thead className="sticky top-0 z-20">
               <tr className="bg-slate-100 text-[10px] lg:text-sm font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                 <th rowSpan={listType === 'general' ? 2 : 1} className="lg:p-6 p-3 lg:pl-12 pl-4 border-r border-slate-200 cursor-pointer hover:bg-slate-200 group" onClick={()=>toggleSort('id')}>
                    <div className="flex items-center gap-2">
                       編號 <ArrowUpDown size={12} className="lg:w-3.5 lg:h-3.5" />
                    </div>
                 </th>
                 <th colSpan={listType === 'general' ? 2 : 1} className={`lg:p-5 p-2 text-center border-r border-slate-200 text-amber-700 bg-amber-50/70 lg:text-xl text-[10px] font-black ${listType === 'joint' ? 'cursor-pointer hover:bg-amber-100/80 transition-colors' : ''}`} onClick={listType === 'joint' ? ()=>toggleSort(1) : undefined}>日間</th>
                 <th colSpan={listType === 'general' ? 2 : 1} className={`lg:p-5 p-2 text-center border-r border-slate-200 text-indigo-700 bg-indigo-50/70 lg:text-xl text-[10px] font-black ${listType === 'joint' ? 'cursor-pointer hover:bg-indigo-100/80 transition-colors' : ''}`} onClick={listType === 'joint' ? ()=>toggleSort(3) : undefined}>夜間</th>
                 <th colSpan={listType === 'general' ? 2 : 1} className={`lg:p-5 p-2 text-center border-r border-slate-200 text-blue-700 bg-blue-50/70 lg:text-xl text-[10px] font-black ${listType === 'joint' ? 'cursor-pointer hover:bg-blue-100/80 transition-colors' : ''}`} onClick={listType === 'joint' ? ()=>toggleSort(5) : undefined}>全日</th>
                 <th rowSpan={listType === 'general' ? 2 : 1} className="lg:p-6 p-2 text-center border-r border-slate-200 lg:w-44 w-12 lg:text-xl text-[10px] cursor-pointer hover:bg-slate-200 group" onClick={()=>toggleSort('total')}>
                    <div className="flex items-center justify-center gap-1">
                       <span className="hidden lg:inline">總人數</span><span className="lg:hidden text-center">總<br/>人</span> <ArrowUpDown size={12} />
                    </div>
                 </th>
                 <th rowSpan={listType === 'general' ? 2 : 1} className="lg:p-6 p-2 lg:pr-12 pr-4 text-center lg:text-xl text-[10px] cursor-pointer hover:bg-slate-200 group" onClick={()=>toggleSort('status')}>
                    <div className="flex items-center justify-center gap-1">
                       <span className="hidden lg:inline">收托狀態說明</span><span className="lg:hidden">狀態</span> <ArrowUpDown size={12} />
                    </div>
                 </th>
               </tr>
               {listType === 'general' && (
                 <tr className="bg-slate-50 text-slate-400 text-[8px] lg:text-xs font-black tracking-widest border-b-2 border-slate-200">
                   <th className="lg:p-5 p-2 text-center border-r border-slate-100 cursor-pointer hover:text-[#E34B87] lg:text-sm text-[8px]" onClick={()=>toggleSort(0)}>未滿2歲</th>
                   <th className="lg:p-5 p-2 text-center border-r border-slate-200 cursor-pointer hover:text-[#E34B87] lg:text-sm text-[8px]" onClick={()=>toggleSort(1)}>2歲以上</th>
                   <th className="lg:p-5 p-2 text-center border-r border-slate-100 cursor-pointer hover:text-[#E34B87] lg:text-sm text-[8px]" onClick={()=>toggleSort(2)}>未滿2歲</th>
                   <th className="lg:p-5 p-2 text-center border-r border-slate-200 cursor-pointer hover:text-[#E34B87] lg:text-sm text-[8px]" onClick={()=>toggleSort(3)}>2歲以上</th>
                   <th className="lg:p-5 p-2 text-center border-r border-slate-100 cursor-pointer hover:text-[#E34B87] lg:text-sm text-[8px]" onClick={()=>toggleSort(4)}>未滿2歲</th>
                   <th className="lg:p-5 p-2 text-center border-r border-slate-200 cursor-pointer hover:text-[#E34B87] lg:text-sm text-[8px]" onClick={()=>toggleSort(5)}>2歲以上</th>
                 </tr>
               )}
             </thead>
             <tbody className="lg:text-xl text-xs">
               {lists.map((row, idx) => (
                 <tr key={row.id} className={`border-b border-slate-100 hover:bg-[#E34B87]/5 transition-colors group ${
                   row.category === '自孩例外' ? 'bg-[#E34B87]/5' : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20')
                 }`}>
                   <td className="p-6 pl-12 text-slate-300 font-bold tabular-nums">
                     <div className="flex flex-col gap-1">
                       <span>#{String(row.id > 900 ? row.id - 900 : row.id).padStart(2, '0')}</span>
                       {row.category === '自孩例外' && <span className="text-[10px] bg-[#E34B87] text-white px-2 py-0.5 rounded-lg italic shrink-0 text-center font-black">自孩例外</span>}
                     </div>
                   </td>
                   {listType === 'general' ? (
                     [0,1,2,3,4,5].map(i => (
                       <td key={i} className={`lg:p-6 p-2 text-center border-r border-slate-100 font-black transition-all lg:text-2xl text-lg tabular-nums ${row.val[i] > 0 ? 'text-[#E34B87]' : 'text-slate-100'}`}>{row.val[i]}</td>
                     ))
                   ) : (
                     [0,2,4].map(base => {
                       const sum = row.val[base] + row.val[base+1];
                       return (
                         <td key={base} className={`lg:p-6 p-2 text-center border-r border-slate-200 font-black transition-all lg:text-2xl text-lg tabular-nums ${sum > 0 ? 'text-[#6366F1]' : 'text-slate-100'}`}>{sum}</td>
                       );
                     })
                   )}
                   <td className={`p-6 text-center font-black tabular-nums border-l border-r border-slate-100 text-4xl ${(listType === 'joint' ? row.total >= 4 : row.isFull) ? 'text-slate-900 bg-slate-100/50' : 'text-emerald-500 bg-emerald-50/10'}`}>
                     {row.total}
                   </td>
                   <td className="p-6 pr-12 text-center min-w-[200px]">
                      {row.category === '自孩例外' ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#E34B87] text-white rounded-full text-xs font-black shadow-lg shadow-[#E34B87]/20 transition-transform active:scale-95">
                            <CheckCircle2 size={12}/> 符合例外規範
                          </span>
                        </div>
                      ) : (listType === 'joint' ? row.total >= 4 : row.isFull) ? (
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-full text-xs font-black shadow-lg shadow-slate-300">
                          <Star size={12} fill="currentColor"/> 已達上限
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black border-2 border-emerald-200">
                          <Plus size={12}/> 可再收托
                        </span>
                      )}
                   </td>
                 </tr>
               ))}
               {lists.length === 0 && (
                 <tr>
                    <td colSpan={10} className="p-32 text-center text-slate-300 font-bold italic text-2xl tracking-widest">目前篩選條件下查無組合</td>
                 </tr>
               )}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function ScheduleSimulator({ events, setEvents, screenshotRef }: any) {
  const MINUTES_IN_DAY = 1440;
  const TOTAL_MINUTES = MINUTES_IN_DAY * 3;
  
  const SIM_TYPES = [
    { id: 'u2_day', name: '未滿2歲日間', color: 'bg-amber-100 border-amber-400 text-amber-800', catIdx: 0, isSelf: false, defaultH: 10, maxH: 16 },
    { id: 'a2_day', name: '2歲以上日間', color: 'bg-orange-100 border-orange-400 text-orange-800', catIdx: 1, isSelf: false, defaultH: 10, maxH: 16 },
    { id: 'u2_night', name: '未滿2歲夜間', color: 'bg-purple-100 border-purple-400 text-purple-800', catIdx: 2, isSelf: false, defaultH: 8, maxH: 16 },
    { id: 'a2_night', name: '2歲以上夜間', color: 'bg-violet-100 border-violet-400 text-violet-800', catIdx: 3, isSelf: false, defaultH: 8, maxH: 16 },
    { id: 'u2_full', name: '未滿2歲全日', color: 'bg-blue-100 border-blue-400 text-blue-800', catIdx: 4, isSelf: false, defaultH: 16, minH: 16 },
    { id: 'a2_full', name: '2歲以上全日', color: 'bg-sky-100 border-sky-400 text-sky-800', catIdx: 5, isSelf: false, defaultH: 16, minH: 16 },
    { id: 'u2_self', name: '未滿2歲自孩', color: 'bg-[#E34B87]/10 border-[#E34B87]/40 text-[#E34B87]', selfIdx: 0, isSelf: true, defaultH: 12 },
    { id: 'a2_self_sent', name: '2-3歲送托自孩', color: 'bg-[#E34B87]/5 border-[#E34B87]/30 text-[#E34B87]', selfIdx: 1, isSelf: true, defaultH: 12 },
    { id: 'a2_self_unsent', name: '2-3歲未送托自孩', color: 'bg-[#E34B87]/20 border-[#E34B87]/50 text-[#E34B87]', selfIdx: 2, isSelf: true, defaultH: 12 },
  ];

  const addEvent = (typeId: string) => {
    const type = SIM_TYPES.find(t => t.id === typeId);
    if (!type) return;
    const newEvent = {
      id: Math.random().toString(36).substr(2, 9),
      typeId,
      startMin: 480, // Default 8:00 AM Day 1
      duration: type.defaultH * 60,
    };
    setEvents([...events, newEvent]);
  };

  const updateEvent = (id: string, updates: any) => {
    setEvents(events.map((e: any) => e.id === id ? { ...e, ...updates } : e));
  };

  const removeEvent = (id: string) => {
    setEvents(events.filter((e: any) => e.id !== id));
  };

  // 額度檢核邏輯
  const dayStats = useMemo(() => {
    return [0, 1, 2].map(dayIdx => {
      const dayStart = dayIdx * MINUTES_IN_DAY;
      const dayEnd = (dayIdx + 1) * MINUTES_IN_DAY;
      
      const dayEvents = events.filter((e: any) => {
        const eventEnd = e.startMin + e.duration;
        return e.startMin < dayEnd && eventEnd > dayStart;
      });

      const counts = [0, 0, 0, 0, 0, 0];
      const selfProfile = [0, 0, 0];
      
      dayEvents.forEach((e: any) => {
        const type = SIM_TYPES.find(t => t.id === e.typeId);
        if (!type) return;
        if (type.isSelf) {
          selfProfile[type.selfIdx!]++;
        } else {
          counts[type.catIdx!]++;
        }
      });

      // 轉換自孩為收托兒童統計樣式 (比照自孩模式同步逻辑)
      const fullCounts = [...counts];
      fullCounts[2] += selfProfile[0]; // 未2自->未2夜
      fullCounts[3] += selfProfile[1]; // 2-3外自->2上夜
      fullCounts[5] += selfProfile[2]; // 2-3無自->2上全

      const hasSelfChild = dayEvents.some(e => {
        const t = SIM_TYPES.find(type => type.id === e.typeId);
        return t?.isSelf;
      });

      // 額度計算
      // 只有當該時段確實包含自孩時，才允許使用自孩特例組合表
      let fullList = hasSelfChild ? [...LEGAL_LIST, ...SELF_EXCEPTIONS] : LEGAL_LIST;
      
      // 基本額度檢查 (基於組合表)
      const isListValid = fullList.some(row => fullCounts.every((v, i) => v <= row[i]));
      
      // 未滿2歲檢查 (總量<=2)
      const u2Total = fullCounts[0] + fullCounts[2] + fullCounts[4];
      const isU2Valid = u2Total <= 2;

      // 權重計算與特例處理
      // 特例：當出現兩個(含以上)一般夜間/全日托育時，二歲以上的一般夜間算1人額度
      // 注意：自孩在此計算中計為 1 點，且「不觸發」一般夜間的點數調降，以符合 4人上限之判定
      const normalNightEvents = dayEvents.filter(e => {
        const t = SIM_TYPES.find(type => type.id === e.typeId);
        return !t?.isSelf && (e.typeId.includes('night') || e.typeId.includes('full'));
      });
      const normalNightCount = normalNightEvents.length;
      
      let totalPoints = 0;
      dayEvents.forEach((e: any) => {
        const type = SIM_TYPES.find(t => t.id === e.typeId);
        if (!type) return;
        
        let weight = 1;
        if (type.id.includes('full') || type.id.includes('night') || type.isSelf) {
          if (type.isSelf) {
            weight = 1; 
          } else {
            // 一般全日與夜間通常是 2
            // 特例：2歲以上一般夜間，若總共有 2個以上一般夜間時，變回 1
            if (normalNightCount >= 2 && type.id === 'a2_night') {
              weight = 1;
            } else {
              weight = 2;
            }
          }
        } else {
          weight = 1; // 日間就是 1
        }
        totalPoints += weight;
      });

      const isValid = isListValid && isU2Valid && totalPoints <= 4;
      const childCount = dayEvents.length;

      // 計算建議收托 (比照其他模式)
      const suggestions: { name: string; extra: number; catIdx: number }[] = [];
      if (isValid && totalPoints < 4) {
        [0, 1, 2, 3, 4, 5].forEach(idx => {
          let tempCounts = [...counts];
          let extra = 0;
          while (true) {
            tempCounts[idx]++;
            
            // 重新計算全數
            const tempFull = [...tempCounts];
            tempFull[2] += selfProfile[0];
            tempFull[3] += selfProfile[1];
            tempFull[5] += selfProfile[2];

            const tempU2 = tempFull[0] + tempFull[2] + tempFull[4];
            
            // 重新計算點數 (考慮特例)
            // 這裡簡化模擬：假想新增的是日間/夜間/全日事件
            // 夜間點數計算需要知道總夜間數
            const tempNightCount = normalNightCount + (idx === 2 || idx === 3 || idx === 4 || idx === 5 ? 1 : 0);
            
            let tempPoints = 0;
            // 原本的點數
            tempPoints = totalPoints;
            // 新增者的點數
            if (idx === 0 || idx === 1) tempPoints += 1;
            else if (idx === 2 || idx === 4 || idx === 5) tempPoints += 2;
            else if (idx === 3) {
              // 如果新增的是 2歲以上夜間，且總夜間 >= 2，則算 1
              if (tempNightCount >= 2) tempPoints += 1;
              else tempPoints += 2;
            }

            const tempValid = fullList.some(r => tempFull.every((v, i) => v <= r[i])) && tempU2 <= 2 && tempPoints <= 4;
            
            if (tempValid) {
              extra++;
            } else {
              break;
            }
          }
          if (extra > 0) {
            suggestions.push({
              name: CATEGORIES[idx].name,
              extra,
              catIdx: idx
            });
          }
        });
      }

      return {
        isValid,
        total: totalPoints,
        childCount,
        isFull: isValid && suggestions.length === 0,
        suggestions
      };
    });
  }, [events]);

  // 自動軌道計算 (包裝在 useMemo 避免重算)
  const tracks = useMemo(() => {
    const sortedEvents = [...events].sort((a, b) => a.startMin - b.startMin);
    const result: number[] = [];
    const eventTracks: Record<string, number> = {};

    sortedEvents.forEach(e => {
      let trackIdx = 0;
      while (true) {
        const lastEventInTrack = sortedEvents.find(prev => 
          eventTracks[prev.id] === trackIdx && (prev.startMin + prev.duration) > e.startMin
        );
        if (!lastEventInTrack) {
          eventTracks[e.id] = trackIdx;
          break;
        }
        trackIdx++;
      }
    });
    return eventTracks;
  }, [events]);

  return (
    <div className="h-full flex flex-col space-y-2 lg:space-y-6 overflow-hidden select-none">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center shrink-0 px-1 gap-2">
        <h2 className="lg:text-4xl text-xl font-black text-slate-900 tracking-tight whitespace-nowrap">時段模擬器</h2>
        <div className="flex gap-2 overflow-x-auto lg:flex-wrap lg:justify-end pb-2 lg:pb-0 custom-scrollbar touch-pan-x no-scrollbar">
          {SIM_TYPES.map(t => (
            <button 
              key={t.id} 
              onClick={() => addEvent(t.id)}
              className={`px-2 py-1 lg:px-3 lg:py-1.5 rounded-xl border text-[9px] lg:text-[10px] font-black transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1.5 shrink-0 ${t.color}`}
            >
              <span className="opacity-60 scale-90">
                {t.id.includes('day') ? <Sun size={12} /> : t.id.includes('night') ? <Moon size={12} /> : t.isSelf ? <Baby size={12} /> : <HomeIcon size={12} />}
              </span>
              + {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* 時間軸區域 - 手機版滾動層 */}
      <div className="flex-1 overflow-x-auto custom-scrollbar touch-pan-x relative rounded-2xl lg:rounded-[32px] border-2 border-slate-200" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div ref={screenshotRef} className="min-w-[1024px] lg:w-full min-h-full bg-slate-50 relative flex flex-col p-4 lg:p-6 shadow-inner">
          {/* 時間軸刻度 */}
          <div className="h-10 flex relative border-b-2 border-slate-200 mb-6 shrink-0 bg-white/50 rounded-t-xl sticky top-0 z-20">
            {[0, 1, 2].map(day => (
              <div key={day} className="flex-1 relative flex">
                <div className="absolute top-0 left-0 right-0 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest pt-1 border-l-2 border-slate-300 bg-slate-100/50 h-6">
                  Day {day + 1}
                </div>
                <div className="flex w-full mt-6 h-full">
                  {Array.from({ length: 24 }).map((_, hr) => (
                    <div key={hr} className={`flex-1 border-l border-slate-200 flex items-end pb-1 relative ${hr % 6 === 0 ? 'border-l-4 border-slate-400' : ''}`}>
                      {hr % 6 === 0 && <span className="text-[11px] font-black text-slate-600 absolute bottom-1 left-1 z-30 bg-white/80 px-1 rounded shadow-sm">{String(hr).padStart(2, '0')}:00</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 軌道內容 */}
          <div className="flex-1 relative pb-12 min-h-[400px]">
            {/* 背景輔助線 */}
            <div className="absolute inset-0 flex pointer-events-none">
              {[0, 1, 2].map(day => (
                <div key={day} className={`flex-1 flex border-slate-400 ${day > 0 ? 'border-l-4' : ''}`}>
                  {Array.from({ length: 24 }).map((_, hr) => (
                    <div key={hr} className={`flex-1 border-l border-slate-200/50 ${hr % 6 === 0 ? 'border-l-2 border-slate-300/30' : ''}`} />
                  ))}
                </div>
              ))}
            </div>

            <div className="relative z-10 flex flex-col min-h-[300px]">
              {events.map((e: any) => {
                const type = SIM_TYPES.find(t => t.id === e.typeId);
                return (
                  <TimelineEvent 
                    key={e.id} 
                    event={e} 
                    type={type} 
                    trackIdx={tracks[e.id]}
                    onUpdate={(updates: any) => updateEvent(e.id, updates)}
                    onRemove={() => removeEvent(e.id)}
                    MINUTES_IN_DAY={MINUTES_IN_DAY}
                    TOTAL_MINUTES={TOTAL_MINUTES}
                  />
                );
              })}
            </div>
            
            {events.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                 <p className="text-2xl font-black italic text-slate-400 tracking-widest uppercase">請點選上方按鈕新增收托兒童長條</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部摘要卡片 - 手機版獨立滾動 */}
      <div className="shrink-0 overflow-x-auto touch-pan-x custom-scrollbar pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-3 min-w-fit px-1">
          {dayStats.map((stat, i) => (
            <div key={i} className={`w-[280px] lg:flex-1 h-20 lg:h-28 lg:p-4 p-3 rounded-2xl lg:rounded-[2rem] border-2 shadow-2xl flex items-center transition-all ${
              stat.isValid ? 'bg-white border-slate-100' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center gap-4 w-full">
                {/* 左側：核心數據 */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col shrink-0">
                    <span className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-tighter">Day {i+1}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 whitespace-nowrap">目前</span>
                      <span className={`text-xl lg:text-2xl font-black ${stat.isValid ? 'text-slate-900' : 'text-rose-600'}`}>{stat.childCount}</span>
                      <span className="text-[8px] lg:text-[10px] font-bold text-slate-300">人</span>
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex items-center">
                    {stat.isValid ? (
                      <span className="px-2 py-1 lg:px-3 lg:py-2 bg-emerald-500 text-white rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black shadow-md border-b-2 border-emerald-700 whitespace-nowrap">符合</span>
                    ) : (
                      <span className="px-2 py-1 lg:px-3 lg:py-2 bg-rose-500 text-white rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black shadow-md border-b-2 border-rose-700 animate-pulse whitespace-nowrap">超收</span>
                    )}
                  </div>
                </div>

                {/* 右側：收托建議 */}
                <div className="flex-1 flex items-center gap-1 lg:gap-2 border-l border-slate-100 pl-2 lg:pl-4 h-full overflow-visible min-w-0">
                  <span className="text-[8px] lg:text-[9px] font-black text-slate-400 uppercase vertical-text whitespace-nowrap shrink-0">仍可收托</span>
                  <div className="flex-1 flex items-center justify-center overflow-visible px-1">
                    {stat.isFull ? (
                      <div className="px-2 py-1 lg:px-3 lg:py-2 bg-slate-900 text-white rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                        <Star size={10} fill="currentColor"/> 上限
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-1 lg:gap-x-1.5 gap-y-0.5 lg:gap-y-1 w-full max-w-[160px] lg:max-w-[240px] mx-auto overflow-visible">
                        {stat.suggestions.map((s, idx) => {
                          const isU2 = s.catIdx % 2 === 0;
                          return (
                            <div key={idx} className="flex items-center justify-center gap-0.5 lg:gap-1 bg-slate-100 border border-slate-200 px-1 lg:px-1.5 py-0.5 lg:py-1 rounded-md lg:rounded-lg shrink-0 shadow-sm min-w-0 overflow-hidden">
                              <span className="opacity-80 scale-[0.65] lg:scale-90 shrink-0 origin-center">{CATEGORIES[s.catIdx].icon}</span>
                              <span className="text-[7px] lg:text-[10px] font-black text-slate-600 flex items-center gap-0.5 whitespace-nowrap">
                                2{isU2 ? '↓' : '↑'}<span className="text-[#E34B87] ml-0.5">{s.extra}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineEvent({ event, type, onUpdate, onRemove, MINUTES_IN_DAY, TOTAL_MINUTES, trackIdx }: any) {
  const leftPct = (event.startMin / TOTAL_MINUTES) * 100;
  const widthPct = (event.duration / TOTAL_MINUTES) * 100;

  const displayDuration = useMemo(() => {
    const totalHours = event.duration / 60;
    if (totalHours >= 24) {
      const d = Math.floor(totalHours / 24);
      const h = Math.round(totalHours % 24);
      return h > 0 ? `${d}d ${h}h` : `${d}d`;
    }
    return `${Math.round(totalHours * 10) / 10}h`;
  }, [event.duration]);

  const handlePointerDown = (e: React.PointerEvent, action: 'drag' | 'resize-left' | 'resize-right') => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
    
    const container = e.currentTarget.closest('.custom-scrollbar') as HTMLElement;
    if (!container) return;
    const totalWidth = container.scrollWidth;
    const pxPerMin = totalWidth / TOTAL_MINUTES;
    const startX = e.clientX;
    const initialStart = event.startMin;
    const initialDuration = event.duration;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaMin = deltaX / pxPerMin;
      
      if (action === 'drag') {
        const newStart = Math.max(0, Math.min(TOTAL_MINUTES - event.duration, initialStart + deltaMin));
        onUpdate({ startMin: newStart });
      } else if (action === 'resize-right') {
        let newDuration = initialDuration + deltaMin;
        if (type.maxH) newDuration = Math.min(newDuration, type.maxH * 60);
        if (type.minH) newDuration = Math.max(newDuration, type.minH * 60);
        newDuration = Math.max(30, Math.min(TOTAL_MINUTES - event.startMin, newDuration));
        onUpdate({ duration: newDuration });
      } else if (action === 'resize-left') {
        let newStart = initialStart + deltaMin;
        let newDuration = initialDuration - deltaMin;
        
        // 限制移動與長度
        if (newDuration < 30) {
           const diff = 30 - newDuration;
           newDuration = 30;
           newStart -= diff;
        }
        if (type.maxH && newDuration > type.maxH * 60) {
           const diff = newDuration - (type.maxH * 60);
           newDuration = type.maxH * 60;
           newStart += diff;
        }
        if (type.minH && newDuration < type.minH * 60) {
           const diff = (type.minH * 60) - newDuration;
           newDuration = type.minH * 60;
           newStart -= diff;
        }

        newStart = Math.max(0, newStart);
        onUpdate({ startMin: newStart, duration: newDuration });
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div 
      className="absolute flex items-center group h-12 transition-all duration-300"
      style={{ 
        left: `${leftPct}%`, 
        width: `${widthPct}%`,
        top: `${trackIdx * 56}px`,
        touchAction: 'pan-y'
      }}
    >
      <div 
        onPointerDown={(e) => handlePointerDown(e, 'drag')}
        className={`w-full h-full rounded-xl border-2 shadow-sm flex items-center justify-between px-3 cursor-grab active:cursor-grabbing select-none overflow-hidden hover:brightness-95 transition-all ${type.color}`}
      >
        {/* 左側調整手把 */}
        <div 
          onPointerDown={(e) => handlePointerDown(e, 'resize-left')}
          className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-black/10 flex items-center justify-center z-10"
        >
          <div className="w-1 h-4 bg-current opacity-30 rounded-full" />
        </div>

        <div className="flex items-center gap-2 min-w-0 overflow-hidden mx-auto px-1">
          <span className="opacity-60 shrink-0 scale-110">
            {type.id.includes('day') ? <Sun size={14} /> : type.id.includes('night') ? <Moon size={14} /> : type.isSelf ? <Baby size={14} /> : <HomeIcon size={14} />}
          </span>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[11px] font-black truncate leading-none">{type.name}</span>
            <span className="text-[9px] font-bold opacity-60 leading-none mt-0.5">{displayDuration}</span>
          </div>
        </div>
        
        <button 
          onPointerDown={(e)=>e.stopPropagation()} 
          onClick={onRemove} 
          className="p-1 hover:bg-black/5 rounded text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 absolute right-4"
        >
          <X size={14} />
        </button>

        {/* 右側調整手把 */}
        <div 
          onPointerDown={(e) => handlePointerDown(e, 'resize-right')}
          className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-black/10 flex items-center justify-center z-10"
        >
          <div className="w-1 h-4 bg-current opacity-30 rounded-full" />
        </div>
      </div>
    </div>
  );
}
