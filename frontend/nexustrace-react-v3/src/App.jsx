import React, { useState, useEffect, useCallback } from 'react';
import NavigationSidebar from './components/NavigationSidebar';
import Board from './components/Board';
import LoginModal from './components/LoginModal';
import SignInPage from './components/SignInPage';
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
  { id: 'case-all', caseId: 'GLOBAL-MASTER-00', title: 'All Domains (Master View)', entities: '10 Domains', links: 'Resolved Hub', tag: 'Global' },
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

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

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
    fetchCurrentUser()
      .then(setCurrentUser)
      .catch(console.error)
      .finally(() => setAuthChecked(true));
  }, []);

  // Case list is a real backend table now (backend/routers/cases.py), not just
  // this component's local state -- load it once we know who's asking.
  // If the fetch fails (offline, backend down) we keep the built-in fallback
  // list above rather than showing an empty sidebar.
  //
  // Pulled out into its own callback (rather than inlined in the effect
  // below) so the Case Files page can also call it directly -- e.g. after
  // creating/archiving/deleting a case, or from an explicit "Refresh" button,
  // so a case that silently failed to persist (wrong role, network blip)
  // doesn't quietly look like it worked until the next full page reload.
  const loadCases = useCallback(() => {
    return fetchCases().then((serverCases) => {
      // Previously only updated state when the server returned a NON-EMPTY
      // list, on the theory that empty meant "the fetch didn't really work,
      // keep the fallback." That's indistinguishable from a genuinely empty
      // case registry (e.g. right after a DB reset) -- which meant the UI
      // could never show zero cases no matter how empty the database
      // actually was; it just silently kept showing the hardcoded
      // INITIAL_CASES fallback forever. A real fetch failure already goes
      // through .catch() below instead of resolving here, so any array
      // response -- including [] -- is the real, current answer.
      if (Array.isArray(serverCases)) {
        // Always show the short label for the master view, even if the
        // database row still has the old long title from before this was
        // simplified -- renaming the seed constant only affects a fresh DB.
        const relabelled = serverCases.map((c) =>
          c.id === 'case-all' ? { ...c, title: 'All Domains (Master View)' } : c
        );
        setCases(relabelled);
      }
      return serverCases;
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadCases().catch((err) => console.warn('[Case Registry Notice]', err));
  }, [currentUser, loadCases]);

  // Fetch Suspicious Patterns on case change
  useEffect(() => {
    // Gated on currentUser -- this used to fire on initial mount before
    // login (activeCaseId already has its default value at mount, so the
    // effect ran immediately with no auth token yet, always 401ing) and
    // then never retried once login completed, since activeCaseId itself
    // hadn't changed. Same fix as loadCases() above.
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

  const handleDrag = (id, x, y) => {
    setEntities((prev) => prev.map((e) => (e.id === id ? { ...e, x, y } : e)));
  };

  const handleBatchMove = (positionMap) => {
    setEntities((prev) =>
      prev.map((e) => (positionMap[e.id] ? { ...e, ...positionMap[e.id] } : e))
    );
  };

  // Persists the new case to the backend FIRST, and only reflects it in the
  // sidebar once that succeeds -- previously this added the case to local
  // state unconditionally and fired createCaseRecord() in the background
  // with errors only going to console.warn, so a case that failed to save
  // (e.g. an Auditor's read-only session, or a network blip) looked like it
  // worked until the next refresh silently dropped it. Now the caller
  // (Case Files page) awaits this and can show the real error.
  const handleAddCase = async (newCase) => {
    const saved = await createCaseRecord(newCase);
    setCases((prev) => {
      if (prev.some((c) => c.id === saved.id)) {
        return prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c));
      }
      return [...prev, saved];
    });
    setActiveCaseId(saved.id);
    return saved;
  };

  // Local-only patch (title/tag/archived/etc after a successful backend
  // PATCH) -- kept separate from handleAddCase so Case Files doesn't have
  // to re-derive the whole case shape just to flip one field.
  const handleCaseUpdated = (caseId, patch) => {
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, ...patch } : c)));
  };

  const handleCaseRemoved = (caseId) => {
    setCases((prev) => prev.filter((c) => c.id !== caseId));
    if (activeCaseId === caseId) {
      setActiveCaseId('case-all');
    }
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

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('board');
  };

  // Still checking for an existing session -- render nothing rather than
  // flashing the sign-in screen for a user who's actually already logged in.
  if (!authChecked) {
    return null;
  }

  if (!currentUser) {
    return (
      <SignInPage
        onAuthenticated={setCurrentUser}
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
          onLogout={handleLogout}
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
              onCaseUpdated={handleCaseUpdated}
              onCaseRemoved={handleCaseRemoved}
              onRefreshCases={loadCases}
              onRefreshGraph={loadGraph}
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
          onLogout={handleLogout}
        />
      </div>
    </ErrorBoundary>
  );
}
