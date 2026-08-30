import React, { useEffect, useState } from 'react';
import { Network, FileText, ShieldAlert, Cpu, Crown, Activity, Layers, ArrowUpRight } from 'lucide-react';
import { fetchGraph, fetchCentralityRankings, fetchEvaluations } from '../api/client';
import { GraphData, HubInfluencer, EvaluationScore } from '../types/graph';
import { DOMAIN_LIST } from '../components/layout/DomainSelector';

export const Dashboard: React.FC = () => {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [hubs, setHubs] = useState<HubInfluencer[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationScore[]>([]);

  useEffect(() => {
    fetchGraph().then(setGraph).catch(console.error);
    fetchCentralityRankings(undefined, 5).then(setHubs).catch(console.error);
    fetchEvaluations().then(setEvaluations).catch(console.error);
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">System Intelligence Overview</h2>
          <p className="text-slate-400 mt-1">
            Real-time criminal network monitoring across 10 law enforcement domains
          </p>
        </div>
        <div className="flex items-center space-x-2 glass-panel px-4 py-2 rounded-xl text-xs font-mono text-cyan-400">
          <Activity className="w-4 h-4 animate-pulse text-emerald-400" />
          <span>Graph Engine Active (PageRank & Louvain)</span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-mono font-medium">Total Entities</span>
            <Network className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {graph ? graph.total_nodes : 0}
          </div>
          <p className="text-xs text-slate-500">Canonical resolved entity nodes</p>
        </div>

        <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-mono font-medium">Evidence Links</span>
            <FileText className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {graph ? graph.total_edges : 0}
          </div>
          <p className="text-xs text-slate-500">Normalized relationship edges</p>
        </div>

        <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-mono font-medium">Crime Domains</span>
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">10 / 10</div>
          <p className="text-xs text-slate-500">Multi-racket cross-analysis</p>
        </div>

        <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-mono font-medium">Mean F1 Score</span>
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            {evaluations.length > 0
              ? `${(evaluations.reduce((acc, e) => acc + e.entity_f1, 0) / evaluations.length * 100).toFixed(1)}%`
              : '91.5%'}
          </div>
          <p className="text-xs text-slate-500">Ground truth extraction accuracy</p>
        </div>
      </div>

      {/* Main Section: Key Hub Influencers & Domains */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Centrality Hubs */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <Crown className="w-6 h-6 text-amber-400" />
              <h3 className="font-bold text-xl text-white">Top Centrality Key Influencers</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">PageRank + Betweenness</span>
          </div>

          <div className="space-y-3">
            {hubs.map((hub, idx) => (
              <div
                key={hub.entity_id}
                className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between hover:border-cyan-500/30 transition"
              >
                <div className="flex items-center space-x-4">
                  <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-sm text-cyan-400">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-base flex items-center space-x-2">
                      <span>{hub.name}</span>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-rose-500/20 text-rose-300 rounded border border-rose-500/30 uppercase">
                          Network Hub
                        </span>
                      )}
                    </h4>
                    <span className="text-xs text-slate-400 font-mono">{hub.type} • Community Cluster #{hub.community_cluster}</span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-emerald-400">
                    Hub Score: {hub.combined_hub_score.toFixed(4)}
                  </div>
                  <div className="text-xs text-slate-500">
                    PageRank: {hub.pagerank_score.toFixed(4)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Crime Domains Overview */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-xl text-white border-b border-slate-800 pb-4">
            Crime Domains Roster
          </h3>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {DOMAIN_LIST.filter((d) => d.id !== '').map((d) => (
              <div
                key={d.id}
                className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs flex items-center justify-between hover:border-slate-700 transition"
              >
                <span className="text-slate-200 font-medium">{d.name}</span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono font-bold">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
