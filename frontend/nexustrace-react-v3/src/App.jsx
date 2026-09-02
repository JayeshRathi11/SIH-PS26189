import React, { useState, useEffect, useCallback } from 'react';
import NavigationSidebar from './components/NavigationSidebar';
import Board from './components/Board';
import LoginModal from './components/LoginModal';
import LoginGate from './components/LoginGate';
import EntityJanamKundliModal from './components/EntityJanamKundliModal';
import ErrorBoundary from './components/ErrorBoundary';
import TimelinePage from './pages/TimelinePage';
import CaseFilesPage from './pages/CaseFilesPage';
import EntitiesRegistryPage from './pages/EntitiesRegistryPage';
import AnomalyHubPage from './pages/AnomalyHubPage';
import DossiersPage from './pages/DossiersPage';
import XaiConsolePage from './pages/XaiConsolePage';
import AuditLogsPage from './pages/AuditLogsPage';
import { fetchCaseGraph, fetchCurrentUser, fetchSuspiciousPatterns, fetchCases, createCaseRecord } from './api/client';

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
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['board', 'timeline', 'cases', 'entities', 'anomalies', 'dossiers', 'xai', 'audit'];
    return validTabs.includes(hash) ? hash : 'board';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const setActiveTab = (tab) => {
    window.location.hash = `#${tab}`;
    setActiveTabState(tab);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['board', 'timeline', 'cases', 'entities', 'anomalies', 'dossiers', 'xai', 'audit'];
      if (validTabs.includes(hash)) {
        setActiveTabState(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nexustrace_theme') || 'light';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Auth state - Compulsory login on fresh start
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Cases & Graph state
  const [cases, setCases] = useState(INITIAL_CASES);
  const [activeCaseId, setActiveCaseId] = useState('case-all');
  const [entities, setEntities] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Full Profile Janam Kundli Modal State
  const [janamKundliEntity, setJanamKundliEntity] = useState(null);

  // Suspicious Patterns State
  const [patterns, setPatterns] = useState([]);
  const [focusedPattern, setFocusedPattern] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexustrace_theme', theme);
  }, [theme]);

  // Session verification: If not active in this session, show LoginGate compulsory
  useEffect(() => {
    const sessionActive = sessionStorage.getItem('nexustrace_session_active');
    if (!sessionActive) {
      setCurrentUser(null);
      setAuthChecked(true);
      return;
    }

    fetchCurrentUser()
      .then((user) => {
        setCurrentUser(user);
      })
      .catch((err) => {
        console.warn('[Session Check Notice]', err);
        setCurrentUser(null);
        sessionStorage.removeItem('nexustrace_session_active');
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, []);

  const handleAuthenticated = (user) => {
    sessionStorage.setItem('nexustrace_session_active', '1');
    setCurrentUser(user);
  };

  const handleUserChange = (user) => {
    if (user) {
      sessionStorage.setItem('nexustrace_session_active', '1');
    } else {
      sessionStorage.removeItem('nexustrace_session_active');
    }
    setCurrentUser(user);
  };

  // Case list from backend
  useEffect(() => {
    if (!currentUser) return;
    fetchCases()
      .then((serverCases) => {
        if (serverCases && serverCases.length > 0) setCases(serverCases);
      })
      .catch((err) => console.warn('[Case Registry Notice]', err));
  }, [currentUser]);

  // Fetch Suspicious Patterns on case change
  useEffect(() => {
    if (!currentUser) return;
    fetchSuspiciousPatterns(activeCaseId)
      .then(setPatterns)
      .catch((err) => console.log('[Patterns Notice]', err));
  }, [activeCaseId, currentUser]);

  // Fetch graph when active case changes
  const loadGraph = useCallback(async () => {
    if (!activeCaseId || !currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const { entities: newEntities, threads: newThreads } = await fetchCaseGraph(activeCaseId);
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
  }, [activeCaseId, currentUser]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const handleDrag = useCallback((id, x, y) => {
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, x, y } : e))
    );
  }, []);

  const handleBatchMove = useCallback((positionMap) => {
    setEntities((prev) =>
      prev.map((e) => {
        const nextPos = positionMap[e.id];
        return nextPos ? { ...e, x: nextPos.x, y: nextPos.y } : e;
      })
    );
  }, []);

  const handleFeedbackUpdated = useCallback((entityId, verdict) => {
    setEntities((prev) =>
      prev.map((e) => (e.id === entityId ? { ...e, status: verdict, verified_by_officer: verdict === 'CONFIRMED' } : e))
    );
  }, []);

  const handleOpenInBoard = (caseId) => {
    setActiveCaseId(caseId);
    setActiveTab('board');
  };

  const handleOpenEntityInBoard = (entityId) => {
    setSelectedEntityId(entityId);
    setActiveTab('board');
  };

  const handleFocusPattern = (pattern) => {
    setFocusedPattern(pattern);
    setActiveTab('board');
  };

  const handleAddCase = async (newCaseData) => {
    try {
      const created = await createCaseRecord(newCaseData);
      setCases((prev) => [created, ...prev]);
      setActiveCaseId(created.id);
      setActiveTab('board');
    } catch (err) {
      console.error('Failed to create case:', err);
      const fallbackCase = {
        id: `case-${Date.now()}`,
        caseId: newCaseData.caseId || 'NEW-CASE',
        title: newCaseData.title || 'Untitled Case',
        entities: 0,
        links: 0,
        tag: 'Active'
      };
      setCases((prev) => [fallbackCase, ...prev]);
      setActiveCaseId(fallbackCase.id);
      setActiveTab('board');
    }
  };

  if (!authChecked) {
    return (
      <div className="login-gate" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px' }}>
          &gt; VERIFYING SECURITY CREDENTIALS...
        </div>
      </div>
    );
  }

  // Compulsory Login Gate
  if (!currentUser) {
    return (
      <LoginGate
        onAuthenticated={handleAuthenticated}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      />
    );
  }

  return (
    <ErrorBoundary>
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
              onBatchMove={handleBatchMove}
              cases={cases}
              activeCaseId={activeCaseId}
              onSelectCase={setActiveCaseId}
              focusedPattern={focusedPattern}
              onClearPatternFocus={() => setFocusedPattern(null)}
              onFeedbackUpdated={handleFeedbackUpdated}
              onOpenFullProfile={(ent) => setJanamKundliEntity(ent)}
            />
          )}

          {/* Tab 1b: Chronological Intelligence Timeline */}
          {activeTab === 'timeline' && (
            <TimelinePage
              cases={cases}
              activeCaseId={activeCaseId}
              onSelectCase={setActiveCaseId}
              onOpenEntityInBoard={handleOpenEntityInBoard}
            />
          )}

          {/* Tab 2: Case Files & Ingestion Hub */}
          {activeTab === 'cases' && (
            <CaseFilesPage
              cases={cases}
              entities={entities}
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
              onOpenFullProfile={(ent) => setJanamKundliEntity(ent)}
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
          onUserChange={handleUserChange}
        />

        {/* Full Subject Dossier & History (Janam Kundli) Modal */}
        <EntityJanamKundliModal
          entity={janamKundliEntity}
          isOpen={Boolean(janamKundliEntity)}
          onClose={() => setJanamKundliEntity(null)}
          allEntities={entities}
          allThreads={threads}
        />
      </div>
    </ErrorBoundary>
  );
}