import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { EntityNode, RelationshipEdge } from '../../types/graph';

interface GraphCanvasProps {
  nodes: EntityNode[];
  edges: RelationshipEdge[];
  onSelectNode: (node: EntityNode | null) => void;
}

const CLUSTER_COLORS = [
  '#06b6d4', // Cyan (Hub)
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#f97316', // Orange
];

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, edges, onSelectNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Convert nodes to Cytoscape format
    const cyNodes = nodes.map((n) => {
      const hubScore = n.hub_score || 0.1;
      const size = Math.max(30, Math.min(80, hubScore * 120));
      const color = n.id.includes('HUB') ? '#ef4444' : CLUSTER_COLORS[(n.community_cluster || 0) % CLUSTER_COLORS.length];

      return {
        data: {
          id: n.id,
          label: n.canonical_name,
          type: n.type,
          size: size,
          color: color,
          nodeData: n,
        },
      };
    });

    // Convert edges to Cytoscape format
    const cyEdges = edges.map((e, idx) => ({
      data: {
        id: `edge_${idx}`,
        source: e.source_id,
        target: e.target_id,
        label: e.relationship_type,
        raw_type: e.raw_relationship_type,
      },
    }));

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'width': 'data(size)',
            'height': 'data(size)',
            'label': 'data(label)',
            'color': '#f8fafc',
            'font-size': '12px',
            'font-weight': 'bold',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-background-opacity': 0.8,
            'text-background-color': '#0f172a',
            'text-background-padding': '4px',
            'text-background-shape': 'roundrectangle',
            'border-width': 3,
            'border-color': '#ffffff',
            'border-opacity': 0.3,
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 0.2,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#22d3ee',
            'border-width': 5,
            'border-opacity': 1,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#334155',
            'target-arrow-color': '#334155',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'color': '#94a3b8',
            'text-rotation': 'autorotate',
            'text-background-opacity': 0.7,
            'text-background-color': '#090d16',
            'text-background-padding': '2px',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 800,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 120,
      },
    });

    cy.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data('nodeData');
      onSelectNode(nodeData);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onSelectNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [nodes, edges]);

  return (
    <div className="relative w-full h-full min-h-[600px] rounded-2xl overflow-hidden glass-panel border border-slate-800">
      <div ref={containerRef} id="cy-container" />
      <div className="absolute top-4 left-4 z-10 glass-panel px-3 py-1.5 rounded-lg text-xs text-slate-400 font-mono flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Interactive Canvas ({nodes.length} Nodes, {edges.length} Edges)</span>
      </div>
    </div>
  );
};
