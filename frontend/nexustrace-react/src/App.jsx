import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Board from './components/Board';
import DetailPanel from './components/DetailPanel';
import LoginModal from './components/LoginModal';
import PatternsDrawer from './components/PatternsDrawer';
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
  const [theme, setTheme] = useState('dark');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

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
  const [patternsDrawerOpen, setPatternsDrawerOpen] = useState(false);
  const [focusedPattern, setFocusedPattern] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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

  const activeCase = cases.find((c) => c.id === activeCaseId);
  const selectedEntity = entities.find((e) => e.id === selectedEntityId) || null;

  const handleDrag = (id, x, y) => {
    setEntities((prev) => prev.map((e) => (e.id === id ? { ...e, x, y } : e)));
  };

  const handleReorderCases = (fromIndex, toIndex) => {
    setCases((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
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
    setPatternsDrawerOpen(false);
    if (pattern.target_entity) {
      setSelectedEntityId(pattern.target_entity);
    }
  };

  return (
    <div
      className="app"
      style={{
        gridTemplateColumns: `${leftOpen ? '280px' : '0px'} 1fr ${rightOpen ? '360px' : '0px'}`,
      }}
    >
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        onToggleLeft={() => setLeftOpen((o) => !o)}
        onToggleRight={() => setRightOpen((o) => !o)}
        caseLabel={activeCase?.title || 'Cross-Domain Crime Analytics'}
        currentUser={currentUser}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenPatternsDrawer={() => setPatternsDrawerOpen(true)}
        patternsCount={patterns.length}
        selectedEntity={selectedEntity}
      />

      <Sidebar
        cases={cases}
        activeCaseId={activeCaseId}
        onSelectCase={setActiveCaseId}
        onReorderCases={handleReorderCases}
        onAddCase={handleAddCase}
        isOpen={leftOpen}
      />

      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            Loading POLE Graph & Analytics...
          </div>
        )}
        {error && (
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 100, background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        <Board
          entities={entities}
          threads={threads}
          selectedId={selectedEntityId}
          onSelect={setSelectedEntityId}
          onDrag={handleDrag}
          activeCase={activeCase}
          focusedPattern={focusedPattern}
          onClearPatternFocus={() => setFocusedPattern(null)}
          temporalDate={temporalDate}
          onTemporalDateChange={setTemporalDate}
        />
      </div>

      <DetailPanel
        entity={selectedEntity}
        isOpen={rightOpen}
        activeCaseId={activeCaseId}
        onFeedbackUpdated={handleFeedbackUpdated}
      />

      {/* Auth & Role Switcher Modal */}
      <LoginModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
      />

      {/* Suspicious Patterns Drawer */}
      <PatternsDrawer
        isOpen={patternsDrawerOpen}
        onClose={() => setPatternsDrawerOpen(false)}
        patterns={patterns}
        onFocusPattern={handleFocusPattern}
      />
    </div>
  );
}