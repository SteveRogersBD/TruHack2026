import React from 'react';

const App = () => {
  return (
    <div className="bg-surface text-on-surface font-body h-screen overflow-hidden selection:bg-primary/30 flex flex-col">
      {/* TopAppBar */}
      <header className="bg-surface flex justify-between items-center px-6 py-3 w-full border-b border-outline-variant/10 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <span className="text-xl font-black tracking-tighter text-primary">Scholar IDE</span>
          <nav className="hidden md:flex gap-6 items-center">
            <a className="text-primary font-bold border-b-2 border-primary pb-1 font-sans text-sm tracking-tight" href="#">Workspace</a>
            <a className="text-outline font-medium hover:text-on-surface transition-colors duration-200 font-sans text-sm tracking-tight" href="#">Documentation</a>
            <a className="text-outline font-medium hover:text-on-surface transition-colors duration-200 font-sans text-sm tracking-tight" href="#">Community</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-surface-bright/50 rounded-lg px-3 py-1.5 gap-2 border border-outline-variant/15">
            <span className="material-symbols-outlined text-sm text-outline">search</span>
            <input className="bg-transparent border-none outline-none text-xs text-on-surface-variant w-48 placeholder:text-outline" placeholder="Quick search (⌘K)" type="text"/>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-outline hover:bg-surface-bright/50 transition-colors duration-200 rounded">
              <span className="material-symbols-outlined">terminal</span>
            </button>
            <button className="p-2 text-outline hover:bg-surface-bright/50 transition-colors duration-200 rounded relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-tertiary rounded-full"></span>
            </button>
            <button className="bg-primary hover:bg-primary-container text-on-primary-container font-bold text-xs px-4 py-2 rounded-lg transition-all active:scale-95 duration-150">
              Deploy
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full overflow-hidden">
        {/* Left Pane: SideNavBar */}
        <aside className="bg-surface-container-low flex flex-col h-full border-r border-outline-variant/10 w-64 shrink-0 overflow-y-auto">
          {/* User Profile Header */}
          <div className="p-6 border-b border-outline-variant/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <img alt="User Profile" className="w-10 h-10 rounded-lg border-2 border-primary/20" src="/screenshot.webp"/>
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-surface-container-low rounded-full"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Arch Scholar</h3>
                <p className="text-[10px] uppercase tracking-widest text-primary font-mono">Pro Plan</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-container p-2 rounded border border-outline-variant/10">
                <p className="text-[9px] text-outline uppercase tracking-wider mb-1">Streak</p>
                <p className="text-xs font-mono font-bold text-tertiary">14 Days</p>
              </div>
              <div className="bg-surface-container p-2 rounded border border-outline-variant/10">
                <p className="text-[9px] text-outline uppercase tracking-wider mb-1">Rank</p>
                <p className="text-xs font-mono font-bold text-secondary">Lvl 42</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 py-4">
            <div className="px-4 mb-2">
              <button className="w-full bg-primary/10 text-primary border border-primary/20 py-2.5 px-4 rounded text-xs font-mono uppercase tracking-widest text-left flex items-center gap-3 transition-all">
                <span className="material-symbols-outlined text-sm">add_box</span>
                New Project
              </button>
            </div>
            <div className="space-y-1 mt-4">
              <a className="bg-primary/10 text-primary border-l-2 border-primary py-3 px-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest" href="#">
                <span className="material-symbols-outlined text-lg">folder_copy</span>
                Explorer
              </a>
              <a className="text-outline py-3 px-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest hover:bg-surface-bright hover:text-on-surface" href="#">
                <span className="material-symbols-outlined text-lg">menu_book</span>
                Curriculum
              </a>
              <a className="text-outline py-3 px-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest hover:bg-surface-bright hover:text-on-surface" href="#">
                <span className="material-symbols-outlined text-lg">local_library</span>
                Library
              </a>
              <a className="text-outline py-3 px-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest hover:bg-surface-bright hover:text-on-surface" href="#">
                <span className="material-symbols-outlined text-lg">bug_report</span>
                Debugger
              </a>
              <a className="text-outline py-3 px-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest hover:bg-surface-bright hover:text-on-surface" href="#">
                <span className="material-symbols-outlined text-lg">settings</span>
                Settings
              </a>
            </div>

            <div className="mt-8 px-6">
              <h4 className="text-[10px] text-outline font-bold uppercase tracking-[0.2em] mb-4">Current Module</h4>
              <div className="relative p-4 bg-surface-container-high rounded-lg overflow-hidden border border-outline-variant/10">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8"></div>
                <p className="text-[11px] font-medium text-on-surface mb-2">Advanced State Patterns</p>
                <div className="w-full bg-surface-dim h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[65%] shadow-[0_0_8px_rgba(59,191,250,0.5)]"></div>
                </div>
                <p className="text-[9px] text-outline mt-2 font-mono">65% Completed</p>
              </div>
            </div>
          </nav>
        </aside>

        {/* Middle Pane: Code Editor */}
        <main className="flex-1 bg-surface flex flex-col relative overflow-hidden">
          <div className="flex bg-surface-container-low border-b border-outline-variant/10">
            <div className="bg-surface border-r border-outline-variant/10 px-4 py-2.5 flex items-center gap-2 border-t-2 border-primary cursor-pointer">
              <span className="material-symbols-outlined text-amber-400 text-sm">javascript</span>
              <span className="text-xs font-mono text-on-surface">useDataHook.ts</span>
              <span className="material-symbols-outlined text-[10px] text-outline">close</span>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-2 border-r border-outline-variant/10 hover:bg-surface-container transition-colors cursor-pointer text-outline">
              <span className="material-symbols-outlined text-sky-400 text-sm">css</span>
              <span className="text-xs font-mono">Layout.module.css</span>
            </div>
          </div>

          <div className="flex-1 p-6 font-mono text-sm leading-relaxed overflow-y-auto bg-surface relative">
            <div className="flex gap-6">
              <div className="text-outline/40 text-right select-none pr-4 border-r border-outline-variant/5">
                1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7<br/>8<br/>9<br/>10<br/>11<br/>12<br/>13<br/>14<br/>15<br/>16
              </div>
              <div className="flex-1">
                <p><span className="text-tertiary">import</span> {'{'} <span className="text-secondary">useState</span>, <span className="text-secondary">useEffect</span> {'}'} <span className="text-tertiary">from</span> <span className="text-secondary-dim">'react'</span>;</p>
                <p>&nbsp;</p>
                <p><span className="text-outline italic">// Custom hook for architectural state management</span></p>
                <p><span className="text-tertiary">export const</span> <span className="text-primary">useDataHook</span> = (entityId: <span className="text-primary-dim">string</span>) =&gt; {'{'}</p>
                <p>&nbsp;&nbsp;<span className="text-tertiary">const</span> [data, setData] = <span className="text-secondary">useState</span>&lt;<span className="text-primary-dim">any</span>&gt;(<span className="text-secondary-dim">null</span>);</p>
                <p>&nbsp;&nbsp;<span className="text-tertiary">const</span> [loading, setLoading] = <span className="text-secondary">useState</span>(<span className="text-secondary-dim">true</span>);</p>
                <p>&nbsp;</p>
                <p>&nbsp;&nbsp;<span className="text-secondary">useEffect</span>(() =&gt; {'{'}</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-tertiary">const</span> <span className="text-primary">fetchData</span> = <span className="text-tertiary">async</span> () =&gt; {'{'}</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-tertiary">try</span> {'{'}</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-tertiary">const</span> response = <span className="text-tertiary">await</span> <span className="text-secondary">fetch</span>(<span className="text-secondary-dim">`/api/v1/data/{"$"}{'{'}entityId{'}'}`</span>);</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-tertiary">const</span> json = <span className="text-tertiary">await</span> response.<span class="text-secondary">json</span>();</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-secondary">setData</span>(json);</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'} <span className="text-tertiary">catch</span> (err) {'{'}</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;console.<span className="text-secondary">error</span>(<span className="text-secondary-dim">'Error fetching data'</span>, err);</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'} <span className="text-tertiary">finally</span> {'{'}</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-secondary">setLoading</span>(<span className="text-secondary-dim">false</span>);</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'}</p>
              </div>
            </div>
            
            <div className="absolute bottom-4 left-6 flex items-center gap-2 text-[10px] uppercase tracking-widest text-outline bg-surface/80 backdrop-blur-md px-3 py-1 rounded-full border border-outline-variant/10">
              <span>src</span>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span>hooks</span>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span className="text-primary">useDataHook.ts</span>
            </div>
          </div>

          <div className="bg-surface-container-high border-t border-outline-variant/15 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-1.5 rounded">
                <span className="material-symbols-outlined text-primary text-sm">schema</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Architectural Diagram</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-outline">expand_less</span>
            </div>
          </div>
        </main>

        {/* Right Pane: AI Assistant */}
        <aside className="bg-surface-container-low flex flex-col h-full border-l border-outline-variant/10 w-80 shrink-0 relative">
          <div className="p-6 border-b border-outline-variant/10">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-sans font-bold text-tertiary">Teaching Assistant</h3>
              <span className="bg-tertiary/10 text-tertiary text-[9px] px-2 py-0.5 rounded-full font-mono border border-tertiary/20">GPT-4 Turbo</span>
            </div>
            <p className="text-xs text-outline">Context: useDataHook.ts</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-lg">psychology</span>
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Scholar AI</span>
              </div>
              <div className="bg-surface-container p-4 rounded-xl rounded-tl-none border border-outline-variant/10">
                <p className="text-xs leading-relaxed text-on-surface">
                  I see you're implementing a data hook. To make this more robust, consider adding a **cleanup function** to your `useEffect`.
                </p>
              </div>
            </div>

            <div className="space-y-3 flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest text-right">You</span>
                <span className="material-symbols-outlined text-primary text-lg">person</span>
              </div>
              <div className="bg-primary/5 p-4 rounded-xl rounded-tr-none border border-primary/10 max-w-[90%]">
                <p className="text-xs text-on-surface">Can you help me integrate AbortController?</p>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-outline-variant/10 space-y-4">
            <div className="relative">
              <textarea className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-xs text-on-surface focus:border-primary outline-none resize-none" placeholder="Ask your tutor..." rows="3"></textarea>
              <button className="absolute bottom-3 right-3 p-1.5 bg-primary text-on-primary-container rounded-lg">
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default App;
