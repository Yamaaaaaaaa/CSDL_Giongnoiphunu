import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Search, Check } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function FileSelector({ label, selected, onSelect }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const wrapRef = useRef(null);

  // Debounce search
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams({ search: query, limit: 10, offset: 0, gender: '' });
        const res = await axios.get(`${API_BASE}/records?${p}`);
        setResults(res.data.records);
      } catch { /* ignore */ }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (record) => {
    onSelect(record);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="file-selector" ref={wrapRef}>
      <div className="file-selector-label">{label}</div>

      {selected ? (
        <div className="file-selector-selected" onClick={() => { setOpen(true); setQuery(''); }}>
          <div className="fs-avatar">#{selected.file_id}</div>
          <div className="fs-info">
            <div className="fs-id">File #{selected.file_id}</div>
            <div className="fs-meta">{selected.gender} · {selected.accent || '?'} · {selected.age ? `${selected.age} yrs` : 'N/A'}</div>
          </div>
          <span className="fs-change">Change</span>
        </div>
      ) : (
        <div className="file-selector-trigger" onClick={() => setOpen(true)}>
          <Search size={16} />
          <span>Select a file from database…</span>
        </div>
      )}

      {open && (
        <div className="fs-dropdown">
          <div className="fs-search-wrap">
            <Search size={14} />
            <input
              autoFocus
              className="fs-search-input"
              placeholder="Search by file ID or speaker…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="fs-results">
            {loading && <div className="fs-status">Searching…</div>}
            {!loading && results.length === 0 && <div className="fs-status">No results</div>}
            {results.map(r => (
              <div
                key={r.file_id}
                className={`fs-result-item${selected?.file_id === r.file_id ? ' active' : ''}`}
                onClick={() => handleSelect(r)}
              >
                {selected?.file_id === r.file_id && <Check size={14} />}
                <span className="fs-result-id">#{r.file_id}</span>
                <span className="fs-result-meta">{r.gender} · {r.accent || '?'} · {r.age ? `${r.age} yrs` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
