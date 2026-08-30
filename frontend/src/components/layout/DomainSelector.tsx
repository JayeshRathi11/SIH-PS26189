import React from 'react';
import { Layers } from 'lucide-react';

interface DomainSelectorProps {
  selectedDomain: string;
  onSelectDomain: (domain: string) => void;
}

export const DOMAIN_LIST = [
  { id: '', name: 'ALL DOMAINS (Merged Master Graph)' },
  { id: '01_narcotics_trafficking', name: '01. Narcotics Trafficking' },
  { id: '02_human_trafficking', name: '02. Human Trafficking' },
  { id: '03_cyber_financial_fraud', name: '03. Cyber Financial Fraud' },
  { id: '04_arms_smuggling', name: '04. Arms Smuggling' },
  { id: '05_organized_extortion', name: '05. Organized Extortion' },
  { id: '06_kidnapping_for_ransom', name: '06. Kidnapping for Ransom' },
  { id: '07_counterfeit_currency', name: '07. Counterfeit Currency' },
  { id: '08_illegal_betting_hawala', name: '08. Illegal Betting & Hawala' },
  { id: '09_vehicle_theft_ring', name: '09. Vehicle Theft & Re-Registration' },
  { id: '10_land_grabbing_fraud', name: '10. Land Grabbing & Property Fraud' },
];

export const DomainSelector: React.FC<DomainSelectorProps> = ({ selectedDomain, onSelectDomain }) => {
  return (
    <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 shadow-sm">
      <Layers className="w-4 h-4 text-cyan-400" />
      <select
        value={selectedDomain}
        onChange={(e) => onSelectDomain(e.target.value)}
        className="bg-transparent text-sm text-slate-200 font-medium focus:outline-none cursor-pointer pr-4"
      >
        {DOMAIN_LIST.map((d) => (
          <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
            {d.name}
          </option>
        ))}
      </select>
    </div>
  );
};
