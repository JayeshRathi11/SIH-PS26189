import React from 'react';
import { X, Shield, Phone, Car, Building, User, MapPin, FileCheck, Layers } from 'lucide-react';
import { EntityNode, RelationshipEdge } from '../../types/graph';

interface NodeDetailPanelProps {
  node: EntityNode | null;
  edges: RelationshipEdge[];
  onClose: () => void;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, edges, onClose }) => {
  if (!node) return null;

  const nodeEdges = edges.filter(
    (e) => e.source_id === node.id || e.target_id === node.id
  );

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'PERSON': return <User className="w-5 h-5 text-cyan-400" />;
      case 'ORGANIZATION': return <Building className="w-5 h-5 text-purple-400" />;
      case 'PHONE_NUMBER': return <Phone className="w-5 h-5 text-emerald-400" />;
      case 'VEHICLE': return <Car className="w-5 h-5 text-amber-400" />;
      case 'LOCATION': return <MapPin className="w-5 h-5 text-rose-400" />;
      default: return <Shield className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="absolute top-4 right-4 w-96 max-h-[calc(100%-2rem)] z-20 glass-panel border border-slate-700/60 rounded-2xl p-5 shadow-2xl overflow-y-auto flex flex-col space-y-4 animate-in fade-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
            {getEntityIcon(node.type)}
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">{node.canonical_name}</h3>
            <span className="inline-block px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {node.type}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block">Hub Centrality</span>
          <span className="text-emerald-400 font-bold text-sm">
            {(node.hub_score || 0.05).toFixed(4)}
          </span>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block">Community Cluster</span>
          <span className="text-cyan-400 font-bold text-sm">
            Cluster #{node.community_cluster || 0}
          </span>
        </div>
      </div>

      {/* Merged Aliases */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
          <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Merged Resolved Aliases ({node.aliases.length})</span>
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {node.aliases.map((alias, i) => (
            <span
              key={i}
              className="px-2.5 py-1 text-xs bg-slate-850 text-slate-300 rounded-lg border border-slate-800 font-mono"
            >
              {alias}
            </span>
          ))}
        </div>
      </div>

      {/* Connected Crime Domains */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>Cross-Domain Connections ({node.domains.length})</span>
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {node.domains.map((d, i) => (
            <span
              key={i}
              className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-300 rounded-md border border-purple-500/20 font-mono"
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Relationships */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Evidence Network ({nodeEdges.length} Links)
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {nodeEdges.map((e, idx) => {
            const isSource = e.source_id === node.id;
            const otherName = isSource ? e.target : e.source;
            return (
              <div
                key={idx}
                className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="text-cyan-400 font-medium">{e.relationship_type}</span>
                  <span className="text-slate-500">{e.domain}</span>
                </div>
                <div className="text-slate-300">
                  {isSource ? '→ Linked to: ' : '← Linked from: '}
                  <span className="font-semibold text-white">{otherName}</span>
                </div>
                {e.evidence && (
                  <p className="text-[11px] text-slate-400 italic bg-slate-950 p-1.5 rounded border border-slate-900 mt-1">
                    "{e.evidence}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
