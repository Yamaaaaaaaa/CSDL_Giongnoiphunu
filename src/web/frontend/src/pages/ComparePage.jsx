import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader, Percent } from 'lucide-react';
import FileSelector from '../components/FileSelector';
import WaveformChart from '../components/charts/WaveformChart';
import SpectrogramChart from '../components/charts/SpectrogramChart';
import MFCCChart from '../components/charts/MFCCChart';
import FeatureVectorChart from '../components/charts/FeatureVectorChart';
import RadarComparisonChart from '../components/charts/RadarComparisonChart';

const API_BASE = 'http://localhost:8000/api';

// Cosine similarity in-browser
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function SideLabel({ children }) {
  return <div className="compare-side-label">{children}</div>;
}

function ChartCard({ title, children, light }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">{title}</span>
      </div>
      <div className={`chart-card-body${light ? ' light' : ''}`}>{children}</div>
    </div>
  );
}

function SidePanel({ record, analysis, loading, error }) {
  if (!record) return (
    <div className="compare-empty-side">
      <Percent size={40} strokeWidth={1.2} style={{ opacity: 0.2 }} />
      <p>Select a file to load analysis</p>
    </div>
  );
  if (loading) return (
    <div className="compare-empty-side">
      <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-orange)' }} />
      <p>Processing audio…</p>
    </div>
  );
  if (error) return <div className="compare-empty-side" style={{ color: '#e54c00' }}>⚠ {error}</div>;
  if (!analysis) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ChartCard title="① Waveform">
        <WaveformChart data={analysis.waveform} />
      </ChartCard>
      <ChartCard title="② Mel Spectrogram">
        <SpectrogramChart data={analysis.mel_spectrogram} />
      </ChartCard>
      <ChartCard title="③ MFCC Matrix">
        <MFCCChart data={analysis.mfcc_matrix} />
      </ChartCard>
      <ChartCard title="④ Feature Vector 99D" light>
        <FeatureVectorChart embedding={analysis.embedding} />
      </ChartCard>
    </div>
  );
}

export default function ComparePage() {
  const [fileA, setFileA]     = useState(null);
  const [fileB, setFileB]     = useState(null);
  const [anaA, setAnaA]       = useState(null);
  const [anaB, setAnaB]       = useState(null);
  const [loadA, setLoadA]     = useState(false);
  const [loadB, setLoadB]     = useState(false);
  const [errA, setErrA]       = useState(null);
  const [errB, setErrB]       = useState(null);

  const fetchAnalysis = async (record, setAna, setLoad, setErr) => {
    if (!record) return;
    setLoad(true); setErr(null); setAna(null);
    try {
      const res = await axios.get(`${API_BASE}/records/${record.file_id}/analyze`);
      setAna(res.data);
    } catch (e) { setErr(e.message); }
    setLoad(false);
  };

  useEffect(() => { fetchAnalysis(fileA, setAnaA, setLoadA, setErrA); }, [fileA?.file_id]);
  useEffect(() => { fetchAnalysis(fileB, setAnaB, setLoadB, setErrB); }, [fileB?.file_id]);

  const similarity = anaA && anaB
    ? (cosineSim(anaA.embedding, anaB.embedding) * 100).toFixed(2)
    : null;

  const simColor = similarity === null ? '#888'
    : similarity >= 90 ? '#00C9A7'
    : similarity >= 70 ? '#FF8A00'
    : '#e54c00';

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className="compare-header">
        <h1 className="section-title" style={{ fontSize: '2rem' }}>Voice Comparison</h1>
        <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Select two audio files from the database to compare their features side by side.
        </p>
      </div>

      {/* ── File Selectors ── */}
      <div className="compare-selectors">
        <FileSelector label="File A" selected={fileA} onSelect={setFileA} />
        <div className="compare-vs-badge">VS</div>
        <FileSelector label="File B" selected={fileB} onSelect={setFileB} />
      </div>

      {/* ── Similarity Score ── */}
      {similarity !== null && (
        <div className="similarity-score-banner fade-in">
          <div className="sim-score-number" style={{ color: simColor }}>{similarity}%</div>
          <div className="sim-score-label">Cosine Similarity</div>
          <div className="sim-score-bar-wrap">
            <div
              className="sim-score-bar-fill"
              style={{ width: `${similarity}%`, background: simColor }}
            />
          </div>
        </div>
      )}

      {/* ── Side-by-side charts ── */}
      <div className="compare-columns">
        {/* Left header */}
        <SideLabel>{fileA ? `File #${fileA.file_id} — ${fileA.gender}` : 'File A'}</SideLabel>
        <SideLabel>{fileB ? `File #${fileB.file_id} — ${fileB.gender}` : 'File B'}</SideLabel>

        {/* Side panels */}
        <SidePanel record={fileA} analysis={anaA} loading={loadA} error={errA} />
        <SidePanel record={fileB} analysis={anaB} loading={loadB} error={errB} />
      </div>

      {/* ── Radar overlay (full width, both files) ── */}
      {anaA && anaB && (
        <div className="chart-card fade-in" style={{ marginTop: '1.25rem' }}>
          <div className="chart-card-header">
            <span className="chart-card-title">⑤ Chroma Radar — Overlay Comparison</span>
            <span className="chart-card-subtitle">12 pitch classes · File A (orange) vs File B (purple)</span>
          </div>
          <div className="chart-card-body light">
            <RadarComparisonChart
              queryEmbedding={anaA.embedding}
              matchEmbedding={anaB.embedding}
              matchId={fileB.file_id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
