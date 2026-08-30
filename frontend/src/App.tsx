import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { GraphExplorer } from './pages/GraphExplorer';
import { DocumentViewer } from './pages/DocumentViewer';
import { EvaluationMetrics } from './pages/EvaluationMetrics';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-950 text-slate-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/graph" element={<GraphExplorer />} />
            <Route path="/documents" element={<DocumentViewer />} />
            <Route path="/evaluation" element={<EvaluationMetrics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};
