import React, { useState } from 'react'

export default function App() {
  const [tasks, setTasks] = useState([
    { id: 1, title: '하이엔드 디자인 완성하기', status: 'Doing' },
    { id: 2, title: '제미나이와 코드 짜기', status: 'Done' }
  ]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans antialiased selection:bg-cyan-500/30">
      
      {/* 몽환적인 배경 광원 효과 (클로드보다 화려한 포인트) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* 메인 카드 박스 */}
        <div className="bg-[#111111]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.7)]">
          
          <header className="flex flex-col items-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-6 rotate-3">
              <span className="text-3xl">💎</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">My Studio</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-2">v.2.0 Next Gen</p>
          </header>

          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="group flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 p-5 rounded-3xl transition-all duration-500 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${task.status === 'Done' ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-slate-600'}`}></div>
                  <span className={`font-medium tracking-tight transition-all ${task.status === 'Done' ? 'text-slate-500 line-through' : 'text-slate-200 group-hover:text-cyan-300'}`}>
                    {task.title}
                  </span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-12 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black rounded-[1.5rem] hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:scale-[1.02] transition-all duration-300 active:scale-[0.98]">
            + Add New Mission
          </button>
        </div>

        {/* 하단 장식 요소 */}
        <p className="text-center mt-8 text-slate-600 text-[10px] font-bold tracking-widest uppercase">
          Powered by Gemini Design System
        </p>
      </div>
    </div>
  )
}