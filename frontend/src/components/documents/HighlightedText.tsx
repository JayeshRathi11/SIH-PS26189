import React from 'react';

interface HighlightedTextProps {
  text: string;
  onEntityClick?: (entityName: string) => void;
}

const HIGHLIGHT_KEYWORDS = [
  'Sethji', 'Bhai', 'Iqbal Ansari', 'Devendra Solanki', 'Bunty', 'Iliyas Khan',
  'Manoj Tiwari', 'Rina Das', 'Rohit Chaurasia', 'Farhan Qureshi', 'Harjeet Singh',
  'Waseem Akhtar', 'Rakesh Pawar', 'Rocky', 'Salim Sheikh', 'Sunil Yadav',
  'Ajay Bhonsle', 'Naseer Ahmed', 'Vikas Chopra', 'Deepak Malhotra', 'Rizwan Ali',
  'Anil Kamble', 'Ramesh Naidu', 'Prakash Jadhav', 'Rajendra Kulkarni',
  'MH12AB5678', 'KA05MN4321', 'TN09PQ7788', 'MH04XY2345', 'PB10GH4321', 'UP32XY9988',
  'Sunrise Placement Services', 'IA Digital Ventures Pvt Ltd', 'Chopra Fuel & Service Station', 'Shreeji Construction & Developers',
  '+91 99870 12345'
];

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, onEntityClick }) => {
  if (!text) return null;

  // Build regex pattern for all known entity mentions
  const pattern = new RegExp(`(${HIGHLIGHT_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <div className="font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-inner select-text">
      {parts.map((part, idx) => {
        const isMatch = HIGHLIGHT_KEYWORDS.some(k => k.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          const isHub = ['sethji', 'bhai', 'iqbal ansari'].includes(part.toLowerCase());
          return (
            <mark
              key={idx}
              onClick={() => onEntityClick && onEntityClick(part)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition font-bold ${
                isHub
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
              }`}
              title="Click to view entity details"
            >
              {part}
            </mark>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </div>
  );
};
