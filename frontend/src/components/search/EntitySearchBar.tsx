import React from 'react';
import { Search } from 'lucide-react';

interface EntitySearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const EntitySearchBar: React.FC<EntitySearchBarProps> = ({ value, onChange, placeholder = 'Search entities, aliases, phones...' }) => {
  return (
    <div className="relative flex-1">
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition"
      />
    </div>
  );
};
