import React, { useEffect, useState } from 'react';
import { DomainSelector } from '../components/layout/DomainSelector';
import { EntitySearchBar } from '../components/search/EntitySearchBar';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { NodeDetailPanel } from '../components/graph/NodeDetailPanel';
import { fetchGraph } from '../api/client';
import { GraphData, EntityNode } from '../types/graph';
import { RefreshCw, Filter } from 'lucide-react';

export const GraphExplorer: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [], total_nodes: 0, total_edges: 0 });
  const [selectedNode, setSelectedNode] = useState<EntityNode | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadGraph = () => {
    setLoading(true);
    fetchGraph(selectedDomain, selectedEntityType)
      .then((data) => {
        setGraphData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadGraph();
  }, [selectedDomain, selectedEntityType]);

  // Client side search filter
  const filteredNodes = graphData.nodes.filter((n) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.canonical_name.toLowerCase().includes(q) ||
      n.aliases.some((a) => a.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 h-screen flex flex-col space-y-4 relative overflow-hidden">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800 z-10">
        <div className="flex items-center space-x-3 flex-1 min-w-[300px]">
          <DomainSelector selectedDomain={selectedDomain} onSelectDomain={setSelectedDomain} />
          <EntitySearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Entity Type Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-purple-400" />
          <select
            value={selectedEntityType}
            onChange={(e) => setSelectedEntityType(e.target.value)}
            className="bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            <option value="">All Entity Types</option>
            <option value="PERSON">Persons</option>
            <option value="ORGANIZATION">Organizations</option>
            <option value="PHONE_NUMBER">Phone Numbers</option>
            <option value="VEHICLE">Vehicles</option>
            <option value="LOCATION">Locations</option>
          </select>

          <button
            onClick={loadGraph}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition flex items-center space-x-1 text-xs font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative rounded-2xl overflow-hidden">
        <GraphCanvas
          nodes={filteredNodes}
          edges={graphData.edges}
          onSelectNode={setSelectedNode}
        />
        <NodeDetailPanel
          node={selectedNode}
          edges={graphData.edges}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  );
};
