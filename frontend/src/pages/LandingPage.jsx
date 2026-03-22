import React from 'react';

export default function LandingPage() {
  return (
    <div className="bg-[#060e20] text-[#dee5ff] w-full h-screen overflow-hidden">
      {/* The converted output from screen.html */}


      <header className="bg-[#060e20] dark:bg-[#060e20] flex justify-between items-center px-6 py-3 w-full border-b border-slate-800/50 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <span className="text-xl font-black tracking-tighter text-sky-400">Scholar IDE</span>
          <nav className="hidden md:flex gap-6 items-center">
            <a className="text-sky-400 font-bold border-b-2 border-sky-400 pb-1 font-sans text-sm tracking-tight" href="#">Workspace</a>
            <a className="text-slate-400 font-medium hover:text-slate-200 transition-colors duration-200 font-sans text-sm tracking-tight" href="#">Documentation</a>
            <a className="text-slate-400 font-medium hover:text-slate-200 transition-colors duration-200 font-sans text-sm tracking-tight" href="#">Community</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#1f2b49]/50 rounded-lg px-3 py-1.5 gap-2 border border-landing-outline-variant/15">
            <span className="material-symbols-outlined text-sm text-landing-outline">search</span>
            <input className="bg-transparent border-none outline-none text-xs text-landing-on-surface-variant w-48 placeholder:text-landing-outline" placeholder="Quick search (⌘K)" type="text" />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:bg-[#1f2b49]/50 transition-colors duration-200 rounded">
              <span className="material-symbols-outlined">terminal</span>
            </button>
            <button className="p-2 text-slate-400 hover:bg-[#1f2b49]/50 transition-colors duration-200 rounded relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-landing-tertiary rounded-full"></span>
            </button>
            <button className="bg-landing-primary hover:bg-landing-primary-container text-landing-on-primary-container font-bold text-xs px-4 py-2 rounded-lg transition-all active:scale-95 duration-150">
              Deploy
            </button>
          </div>
        </div>
      </header>
      <div className="flex h-[calc(100vh-57px)] w-full overflow-hidden">

        <aside className="bg-[#091328] dark:bg-[#091328] flex flex-col h-full border-r border-slate-800/30 w-64 shrink-0 overflow-y-auto">

          <div className="p-6 border-b border-landing-outline-variant/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <img alt="User Profile" className="w-10 h-10 rounded-lg border-2 border-landing-primary/20" data-alt="Cyberpunk style user profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCI-WViP3_Jgzmq0UJI4BPvvB_of960giODb_m39BJ4rwayyV9BqIcXgKi_g2Rrdw3NsDemnMkbk0ZG1JBulnPNHJUzvgTEbx9Xl0B-vtt5UyWQcCUVlkDthQza_Pqj9TRUYyiOklCjzArNnNCoYxwJH2OjwwL5-thaEOvNAYvU6BMKMJ1AehTCMy2jQ9nYdHQow8jan0qVRjRXIfNcjuHhLIZTHSaEqq810D950HGzammdD9QcD3Hl7C0LLdX64WIlVADT6ztqKS-b" />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#091328] rounded-full"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-landing-on-surface">Arch Scholar</h3>
                <p className="text-[10px] uppercase tracking-widest text-landing-primary font-mono">Pro Plan</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-landing-surface-container p-2 rounded border border-landing-outline-variant/10">
                <p className="text-[9px] text-landing-outline uppercase tracking-wider mb-1">Streak</p>
                <p className="text-xs font-mono font-bold text-landing-tertiary">14 Days</p>
              </div>
              <div className="bg-landing-surface-container p-2 rounded border border-landing-outline-variant/10">
                <p className="text-[9px] text-landing-outline uppercase tracking-wider mb-1">Rank</p>
                <p className="text-xs font-mono font-bold text-landing-secondary">Lvl 42</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-4">
            <div className="px-4 mb-2">
              <button className="w-full bg-sky-500/10 text-sky-400 border border-sky-400/20 py-2.5 px-4 rounded text-xs font-mono uppercase tracking-widest text-left flex items-center gap-3 transition-all">
                <span className="material-symbols-outlined text-sm">add_box</span>
                New Project
              </button>
            </div>
            <div className="space-y-1 mt-4">
              <a className="bg-sky-500/10 text-sky-400 border-l-2 border-sky-400 py-3 px-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest transition-all" href="#">
                <span className="material-symbols-outlined text-lg">folder_copy</span>
                Explorer
              </a>
              <a className="text-slate-500 py-3 px-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest hover:bg-[#1f2b49] hover:text-slate-200 transition-all" href="#">
                <span className="material-symbols-outlined text-lg">menu_book</span>
                Curriculum
              </a>
              <a className="text-slate-500 py-3 px-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest hover:bg-[#1f2b49] hover:text-slate-200 transition-all" href="#">
                <span className="material-symbols-outlined text-lg">local_library</span>
                Library
              </a>
              <a className="text-slate-500 py-3 px-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest hover:bg-[#1f2b49] hover:text-slate-200 transition-all" href="#">
                <span className="material-symbols-outlined text-lg">bug_report</span>
                Debugger
              </a>
              <a className="text-slate-500 py-3 px-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest hover:bg-[#1f2b49] hover:text-slate-200 transition-all" href="#">
                <span className="material-symbols-outlined text-lg">settings</span>
                Settings
              </a>
            </div>

            <div className="mt-8 px-6">
              <h4 className="text-[10px] text-landing-outline font-bold uppercase tracking-[0.2em] mb-4">Current Module</h4>
              <div className="relative p-4 bg-landing-surface-container-high rounded-lg overflow-hidden border border-landing-outline-variant/10">
                <div className="absolute top-0 right-0 w-16 h-16 bg-landing-primary/5 rounded-full -mr-8 -mt-8"></div>
                <p className="text-[11px] font-medium text-landing-on-surface mb-2">Advanced State Patterns</p>
                <div className="w-full bg-landing-surface-dim h-1 rounded-full overflow-hidden">
                  <div className="bg-landing-primary h-full w-[65%] shadow-[0_0_8px_rgba(59,191,250,0.5)]"></div>
                </div>
                <p className="text-[9px] text-landing-outline mt-2 font-mono">65% Completed</p>
              </div>
            </div>
          </nav>
        </aside>

        <main className="flex-1 bg-landing-surface flex flex-col relative overflow-hidden">

          <div className="flex bg-landing-surface-container-low border-b border-landing-outline-variant/10">
            <div className="bg-landing-surface border-r border-landing-outline-variant/10 px-4 py-2.5 flex items-center gap-2 border-t-2 border-landing-primary group cursor-pointer">
              <span className="material-symbols-outlined text-amber-400 text-sm">javascript</span>
              <span className="text-xs font-mono text-landing-on-surface">useDataHook.ts</span>
              <span className="material-symbols-outlined text-[10px] text-landing-outline opacity-0 group-hover:opacity-100">close</span>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-2 border-r border-landing-outline-variant/10 hover:bg-landing-surface-container transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-sky-400 text-sm">css</span>
              <span className="text-xs font-mono text-landing-outline">Layout.module.css</span>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-2 border-r border-landing-outline-variant/10 hover:bg-landing-surface-container transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-orange-400 text-sm">html</span>
              <span className="text-xs font-mono text-landing-outline">index.html</span>
            </div>
          </div>

          <div className="flex-1 p-6 font-mono text-sm leading-relaxed overflow-y-auto bg-landing-surface relative">
            <div className="flex gap-6">
              <div className="text-landing-outline/40 text-right select-none pr-4 border-r border-landing-outline-variant/5">
                1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9<br />10<br />11<br />12<br />13<br />14<br />15<br />16
              </div>
              <div className="flex-1">
                <p><span className="text-landing-tertiary">import</span> {"{"} <span className="text-landing-secondary">useState</span>, <span className="text-landing-secondary">useEffect</span> {"}"} <span className="text-landing-tertiary">from</span> <span className="text-landing-secondary-dim">'react'</span>;</p>
                <p> </p>
                <p><span className="text-landing-outline italic">// Custom hook for architectural state management</span></p>
                <p><span className="text-landing-tertiary">export const</span> <span className="text-landing-primary">useDataHook</span> = (entityId: <span className="text-landing-primary-dim">string</span>) =&gt; {"{"}</p>
                <p>  <span className="text-landing-tertiary">const</span> [data, setData] = <span className="text-landing-secondary">useState</span>&lt;<span className="text-landing-primary-dim">any</span>&gt;(<span className="text-landing-secondary-dim">null</span>);</p>
                <p>  <span className="text-landing-tertiary">const</span> [loading, setLoading] = <span className="text-landing-secondary">useState</span>(<span className="text-landing-secondary-dim">true</span>);</p>
                <p> </p>
                <p>  <span className="text-landing-secondary">useEffect</span>(() =&gt; {"{"}</p>
                <p>    <span className="text-landing-tertiary">const</span> <span className="text-landing-primary">fetchData</span> = <span className="text-landing-tertiary">async</span> () =&gt; {"{"}</p>
                <p>      <span className="text-landing-tertiary">try</span> {"{"}</p>
                <p>        <span className="text-landing-tertiary">const</span> response = <span className="text-landing-tertiary">await</span> <span className="text-landing-secondary">fetch</span>(<span className="text-landing-secondary-dim">`/api/v1/data/{"${"}entityId{"}"}`</span>);</p>
                <p>        <span className="text-landing-tertiary">const</span> json = <span className="text-landing-tertiary">await</span> response.<span className="text-landing-secondary">json</span>();</p>
                <p>        <span className="text-landing-secondary">setData</span>(json);</p>
                <p>      {"}"} <span className="text-landing-tertiary">catch</span> (err) {"{"}</p>
                <p>        console.<span className="text-landing-secondary">error</span>(<span className="text-landing-secondary-dim">'Error fetching data'</span>, err);</p>
                <p>      {"}"} <span className="text-landing-tertiary">finally</span> {"{"}</p>
                <p>        <span className="text-landing-secondary">setLoading</span>(<span className="text-landing-secondary-dim">false</span>);</p>
                <p>      {"}"}</p>
              </div>
            </div>

            <div className="absolute bottom-4 left-6 flex items-center gap-2 text-[10px] uppercase tracking-widest text-landing-outline bg-landing-surface/80 backdrop-blur-md px-3 py-1 rounded-full border border-landing-outline-variant/10">
              <span>src</span>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span>hooks</span>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span className="text-landing-primary">useDataHook.ts</span>
            </div>
          </div>

          <div className="bg-landing-surface-container-high border-t border-landing-outline-variant/15 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-landing-primary/20 p-1.5 rounded">
                <span className="material-symbols-outlined text-landing-primary text-sm">schema</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-landing-on-surface">Architectural Diagram</span>
            </div>
            <div className="flex items-center gap-4">
              <img alt="Architectural Diagram Preview" className="h-8 rounded grayscale opacity-50 border border-landing-outline-variant/20" data-alt="Abstract structural diagram representation" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBo3rEoB71lovlfXc2nyBuUXs7ryo6ZHbdeJyEXEeXpJv_1HjjQf7TDpHM_ZPH8ktwd1NclNUTg1cYibq_hM2_XJTCpi1K_8v4HCXRxqRIhM7UbZqt8xE7ByJn21TQZ7-OuwR67m78SzPgT4_1-IQ36yf1-vORnwd3cELJMbV4FXb_aez3piKs24NIl3KcxGWBqLuHeBAysKUHFbCLWPsn1juAUw6wjR-bT3ZW97QAvLcHW7tRw5SjRMVfpJhCPshjrXLWYjcgH0ZJ_" />
              <button className="text-landing-outline hover:text-landing-on-surface">
                <span className="material-symbols-outlined">expand_less</span>
              </button>
            </div>
          </div>
        </main>

        <aside className="bg-[#091328] dark:bg-[#091328] flex flex-col h-full border-l border-slate-800/30 w-80 shrink-0 shadow-[-24px_0_48px_rgba(6,14,32,0.4)] relative">

          <div className="p-6 border-b border-slate-800/30">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-sans font-bold text-[#ff86c3]">Teaching Assistant</h3>
              <span className="bg-[#ff86c3]/10 text-[#ff86c3] text-[9px] px-2 py-0.5 rounded-full font-mono border border-[#ff86c3]/20">GPT-4 Turbo</span>
            </div>
            <p className="text-xs text-slate-400">Context: useDataHook.ts</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff86c3] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scholar AI</span>
              </div>
              <div className="bg-landing-surface-container p-4 rounded-xl rounded-tl-none border border-landing-outline-variant/5">
                <p className="text-xs leading-relaxed text-landing-on-surface">
                  I see you're implementing a data hook. To make this more robust, consider adding a **cleanup function** to your `useEffect` to prevent memory leaks if the component unmounts.
                </p>
                <div className="mt-4 bg-landing-surface-container-lowest p-3 rounded-lg border border-landing-outline-variant/10 font-mono text-[10px]">
                  <p className="text-landing-outline">// Suggestion:</p>
                  <p><span className="text-landing-tertiary">return</span> () =&gt; controller.<span className="text-landing-secondary">abort</span>();</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">You</span>
                <span className="material-symbols-outlined text-landing-primary text-lg">person</span>
              </div>
              <div className="bg-landing-primary/5 p-4 rounded-xl rounded-tr-none border border-landing-primary/10 max-w-[90%]">
                <p className="text-xs text-landing-on-surface">That's a good point! Can you help me integrate AbortController into the fetch call?</p>
              </div>
            </div>

            <div className="flex justify-center py-4">
              <div className="flex items-center gap-1.5 opacity-30">
                <div className="w-1.5 h-1.5 bg-landing-outline rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-landing-outline rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-landing-outline rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-800/30 space-y-4">
            <div className="flex gap-2">
              <button className="flex-1 text-[#ff86c3] font-bold border-b border-[#ff86c3]/30 py-2 text-center text-xs transition-all active:opacity-80">History</button>
              <button className="flex-1 text-slate-400 py-2 text-center text-xs hover:bg-[#1f2b49] transition-all">Saved</button>
            </div>
            <div className="relative">
              <textarea className="w-full bg-landing-surface-container-low border border-landing-outline-variant/20 rounded-xl px-4 py-3 pb-10 text-xs text-landing-on-surface focus:border-landing-primary focus:ring-2 focus:ring-landing-primary/10 outline-none resize-none transition-all" placeholder="Ask your tutor... (Paste URLs or drop PDFs)" rows="3"></textarea>
              <input type="file" id="file-upload" className="hidden" accept=".pdf,image/*" />
              <label htmlFor="file-upload" className="absolute bottom-3 left-3 p-1.5 text-landing-outline hover:text-landing-primary cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-sm">attach_file</span>
              </label>
              <button className="absolute bottom-3 right-3 p-1.5 bg-landing-primary text-landing-on-primary-container rounded-lg shadow-lg">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-landing-outline px-1">
              <div className="flex items-center gap-3">
                <button className="hover:text-landing-on-surface flex items-center gap-1 transition-all">
                  <span className="material-symbols-outlined text-sm">history</span>
                  Recent
                </button>
                <button className="hover:text-landing-on-surface flex items-center gap-1 transition-all">
                  <span className="material-symbols-outlined text-sm">chat_bubble_outline</span>
                  Feedback
                </button>
              </div>
              <span className="font-mono">CTRL + ENTER to send</span>
            </div>
          </div>
        </aside>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#091328] border-t border-slate-800/30 flex justify-around items-center py-3 z-50">
        <a className="flex flex-col items-center gap-1 text-sky-400" href="#">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>folder_copy</span>
          <span className="text-[9px] uppercase tracking-tighter font-mono">Files</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-slate-500" href="#">
          <span className="material-symbols-outlined">menu_book</span>
          <span className="text-[9px] uppercase tracking-tighter font-mono">Learning</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-slate-500" href="#">
          <span className="material-symbols-outlined">psychology</span>
          <span className="text-[9px] uppercase tracking-tighter font-mono">AI Tutor</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-slate-500" href="#">
          <span className="material-symbols-outlined">settings</span>
          <span className="text-[9px] uppercase tracking-tighter font-mono">Config</span>
        </a>
      </nav>

    </div>
  );
}
