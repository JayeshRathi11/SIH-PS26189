import React, { useState, useEffect, useCallback } from 'react';
import NavigationSidebar from './components/NavigationSidebar';
import Board from './components/Board';
import LoginModal from './components/LoginModal';
import CaseFilesPage from './pages/CaseFilesPage';
import EntitiesRegistryPage from './pages/EntitiesRegistryPage';
import AnomalyHubPage from './pages/AnomalyHubPage';
import DossiersPage from './pages/DossiersPage';
import XaiConsolePage from './pages/XaiConsolePage';
import BenchmarksPage from './pages/BenchmarksPage';
import AuditLogsPage from './pages/AuditLogsPage';
import { fetchCaseGraph, fetchCurrentUser, fetchSuspiciousPatterns } from './api/client';

const INITIAL_CASES = [
  { id: 'case-all', caseId: 'GLOBAL-MASTER-00', title: '★ Unified Global Master Network (All Domains)', entities: '10 Domains', links: 'Resolved Hub', tag: 'Global' },
  { id: 'case-1', caseId: 'FIR-01-NARCO', title: '01: Narcotics Trafficking', entities: 20, links: 18, tag: 'Active' },
  { id: 'case-2', caseId: 'FIR-02-HUMAN', title: '02: Human Trafficking', entities: 5, links: 4, tag: 'Active' },
  { id: 'case-3', caseId: 'FIR-03-CYBER', title: '03: Cyber Financial Fraud', entities: 16, links: 16, tag: 'Active' },
  { id: 'case-4', caseId: 'FIR-04-ARMS', title: '04: Arms Smuggling', entities: 12, links: 14, tag: 'Active' },
  { id: 'case-5', caseId: 'FIR-05-EXTORT', title: '05: Organized Extortion', entities: 20, links: 23, tag: 'Active' },
  { id: 'case-6', caseId: 'FIR-06-KIDNAP', title: '06: Kidnapping for Ransom', entities: 16, links: 15, tag: 'Active' },
  { id: 'case-7', caseId: 'FIR-07-FAKE-CURR', title: '07: Counterfeit Currency', entities: 16, links: 11, tag: 'Active' },
  { id: 'case-8', caseId: 'FIR-08-HAWALA', title: '08: Illegal Betting & Hawala', entities: 16, links: 10, tag: 'Active' },
  { id: 'case-9', caseId: 'FIR-09-VEHICLE', title: '09: Vehicle Theft Ring', entities: 12, links: 9, tag: 'Active' },
  { id: 'case-10', caseId: 'FIR-10-LAND', title: '10: Land Grabbing & Fraud', entities: 16, links: 11, tag: 'Active' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('board');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nexustrace_theme') || 'light';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Cases & Graph state
  const [cases, setCases] = useState(INITIAL_CASES);
  const [activeCaseId, setActiveCaseId] = useState('case-all');
  const [entities, setEntities] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Temporal Slider State
  const [temporalDate, setTemporalDate] = useState(null);

  // Suspicious Patterns State
  const [patterns, setPatterns] = useState([]);
  const [focusedPattern, setFocusedPattern] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexustrace_theme', theme);
  }, [theme]);

  // Load current user session
  useEffect(() => {
    fetchCurrentUser().then(setCurrentUser).catch(console.error);
  }, []);

  // Fetch Suspicious Patterns on case change
  useEffect(() => {
    fetchSuspiciousPatterns(activeCaseId)
      .then(setPatterns)
      .catch((err) => console.log('[Patterns Notice]', err));
  }, [activeCaseId]);

  // Fetch graph when active case or temporal date changes
  const loadGraph = useCallback(async () => {
    if (!activeCaseId) return;
    setLoading(true);
    setError(null);
    try {
      const { entities: newEntities, threads: newThreads } = await fetchCaseGraph(activeCaseId, temporalDate);
      setEntities(newEntities);
      setThreads(newThreads);
      setSelectedEntityId((prev) => {
        if (prev && newEntities.some((e) => e.id === prev)) return prev;
        return newEntities.length > 0 ? newEntities[0].id : null;
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId, temporalDate]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const handleDrag = (id, x, y) => {
    setEntities((prev) => prev.map((e) => (e.id === id ? { ...e, x, y } : e)));
  };

  const handleAddCase = (newCase) => {
    setCases((prev) => [...prev, newCase]);
    setActiveCaseId(newCase.id);
  };

  const handleFeedbackUpdated = (entityId, verdict) => {
    setEntities((prev) =>
      prev.map((e) => {
        if (e.id === entityId) {
          return {
            ...e,
            verified_by_officer: verdict === 'CONFIRMED',
            status: verdict
          };
        }
        return e;
      })
    );
  };

  const handleFocusPattern = (pattern) => {
    setFocusedPattern(pattern);
    setActiveTab('board');
    if (pattern.target_entity) {
      setSelectedEntityId(pattern.target_entity);
    }
  };

  const handleOpenInBoard = (caseId) => {
    setActiveCaseId(caseId);
    setActiveTab('board');
  };

  const handleOpenEntityInBoard = (entityId) => {
    setSelectedEntityId(entityId);
    setActiveTab('board');
  };

  return (
    <div className="app-shell-sidebar-layout">
      {/* Collapsible Left Navigation Sidebar */}
      <NavigationSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        currentUser={currentUser}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        patternsCount={patterns.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Page Content Area */}
      <div className="app-main-view">
        {loading && activeTab === 'board' && (
          <div className="canvas-loading-banner">
            <span className="status-dot"></span>
            <span>Synthesizing Link Analysis Graph...</span>
          </div>
        )}

        {error && activeTab === 'board' && (
          <div className="canvas-error-banner">
            ⚠️ {error}
          </div>
        )}

        {/* Tab 1: Interactive Case Board */}
        {activeTab === 'board' && (
          <Board
            entities={entities}
            threads={threads}
            selectedId={selectedEntityId}
            onSelect={setSelectedEntityId}
            onDrag={handleDrag}
            cases={cases}
            activeCaseId={activeCaseId}
            onSelectCase={setActiveCaseId}
            focusedPattern={focusedPattern}
            onClearPatternFocus={() => setFocusedPattern(null)}
            temporalDate={temporalDate}
            onTemporalDateChange={setTemporalDate}
            onFeedbackUpdated={handleFeedbackUpdated}
          />
        )}

        {/* Tab 2: Case Files & Ingestion Hub */}
        {activeTab === 'cases' && (
          <CaseFilesPage
            cases={cases}
            activeCaseId={activeCaseId}
            onSelectCase={setActiveCaseId}
            onOpenInBoard={handleOpenInBoard}
            onAddCase={handleAddCase}
          />
        )}

        {/* Tab 3: POLE Entities Registry */}
        {activeTab === 'entities' && (
          <EntitiesRegistryPage
            entities={entities}
            cases={cases}
            activeCaseId={activeCaseId}
            onSelectCase={setActiveCaseId}
            onOpenEntityInBoard={handleOpenEntityInBoard}
          />
        )}

        {/* Tab 4: Syndicate Anomaly Hub */}
        {activeTab === 'anomalies' && (
          <AnomalyHubPage
            patterns={patterns}
            onFocusPattern={handleFocusPattern}
            activeCaseId={activeCaseId}
            cases={cases}
            onSelectCase={setActiveCaseId}
          />
        )}

        {/* Tab 5: Court Dossiers & Evidence Library */}
        {activeTab === 'dossiers' && (
          <DossiersPage
            cases={cases}
            activeCaseId={activeCaseId}
            onSelectCase={setActiveCaseId}
            entities={entities}
          />
        )}

        {/* Tab 6: XAI Evidentiary Pathfinder Console */}
        {activeTab === 'xai' && (
          <XaiConsolePage entities={entities} />
        )}

        {/* Tab 7: Forensic Benchmarks Suite */}
        {activeTab === 'benchmarks' && (
          <BenchmarksPage
            cases={cases}
            activeCaseId={activeCaseId}
            onSelectCase={setActiveCaseId}
          />
        )}

        {/* Tab 8: Security & Audit Ledger */}
        {activeTab === 'audit' && (
          <AuditLogsPage currentUser={currentUser} />
        )}
      </div>

      {/* Auth & RBAC Persona Switcher Modal */}
      <LoginModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
      />
    </div>
  );
}