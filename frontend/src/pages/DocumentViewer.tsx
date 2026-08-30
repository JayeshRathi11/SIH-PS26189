import React, { useEffect, useState } from 'react';
import { DomainSelector } from '../components/layout/DomainSelector';
import { HighlightedText } from '../components/documents/HighlightedText';
import { fetchDocuments } from '../api/client';
import { DocumentRecord } from '../types/graph';
import { FileText, Search, Info } from 'lucide-react';

export const DocumentViewer: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [clickedEntity, setClickedEntity] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments(selectedDomain)
      .then((docs) => {
        setDocuments(docs);
        if (docs.length > 0) {
          setSelectedDoc(docs[0]);
        } else {
          setSelectedDoc(null);
        }
      })
      .catch(console.error);
  }, [selectedDomain]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Source Document Viewer</h2>
          <p className="text-slate-400 mt-1">
            Raw FIRs, call intercepts, and surveillance reports with extracted entity spans highlighted inline
          </p>
        </div>
        <DomainSelector selectedDomain={selectedDomain} onSelectDomain={setSelectedDomain} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document Sidebar List */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 h-[680px] overflow-y-auto">
          <h3 className="text-xs uppercase font-mono font-bold text-slate-400 px-2 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Documents ({documents.length})</span>
          </h3>

          <div className="space-y-2">
            {documents.map((doc) => (
              <button
                key={doc.doc_id}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  selectedDoc?.doc_id === doc.doc_id
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold">{doc.doc_id}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">{doc.doc_type}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono truncate">
                  Domain: {doc.domain}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Document Display Panel */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col h-[680px]">
          {selectedDoc ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-xl text-white font-mono">{selectedDoc.doc_id}</h3>
                  <span className="text-xs text-cyan-400 font-mono">
                    Type: {selectedDoc.doc_type} | Domain: {selectedDoc.domain}
                  </span>
                </div>
                <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
                  Source: {selectedDoc.source_file}
                </div>
              </div>

              {clickedEntity && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 flex items-center justify-between">
                  <span>Selected Mention: <strong>{clickedEntity}</strong> (Resolved to Canonical Entity)</span>
                  <button onClick={() => setClickedEntity(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-2">
                <HighlightedText
                  text={selectedDoc.text}
                  onEntityClick={(e) => setClickedEntity(e)}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <Info className="w-8 h-8 text-slate-600" />
              <p>No document selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
