import React from 'react';
import { NavLink } from 'react-router-dom';
import { Network, FileText, BarChart3, ShieldAlert, Cpu, Search } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { path: '/', label: 'Overview', icon: BarChart3 },
    { path: '/graph', label: 'Graph Explorer', icon: Network },
    { path: '/documents', label: 'Document Viewer', icon: FileText },
    { path: '/evaluation', label: 'Ground-Truth Eval', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col justify-between flex-shrink-0 z-30">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wide">NexusTrace</h1>
            <p className="text-xs text-cyan-400 font-mono">MHA / NCRB Intelligence</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800">
        <div className="glass-panel p-3 rounded-xl text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>Crime Domains:</span>
            <span className="text-cyan-400 font-bold font-mono">10 Active</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Canonical Hub:</span>
            <span className="text-emerald-400 font-bold font-mono">Iqbal Ansari</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
