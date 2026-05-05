import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { UploadCloud, User, Play, Pause, Loader } from 'lucide-react';
import WaveformChart from '../components/charts/WaveformChart';
import SpectrogramChart from '../components/charts/SpectrogramChart';
import MFCCChart from '../components/charts/MFCCChart';
import FeatureVectorChart from '../components/charts/FeatureVectorChart';

const API_BASE = 'http://localhost:8000/api';

/* ── Decode uploaded WAV → Float32 samples (browser-side) ─────── */
async function decodeWaveform(audioUrl) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const resp = await fetch(audioUrl);
    const buf = await resp.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf);
    const raw = decoded.getChannelData(0);
    const n = 600;
    const step = Math.max(1, Math.floor(raw.length / n));
    const out = [];
    for (let i = 0; i < n; i++) out.push(raw[i * step] ?? 0);
    ctx.close();
    return out;
  } catch { return null; }
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

/* ── Similarity color helper ── */
function simColor(pct) {
  if (pct >= 90) return '#00C9A7';
  if (pct >= 70) return '#FF8A00';
  return '#e54c00';
}

export default function SearchPage() {
  const {
    uploading, uploadedFileName, uploadedFileUrl,
    searchResults, fileInputRef, uploadedFileRef,
    currentTrack, isPlaying,
    onFileUpload, onPlayTrack, formatAudioUrl,
  } = useOutletContext();

  /* ── Compare state ── */
  const [selectedResult, setSelectedResult] = useState(null);
  const [queryAnalysis, setQueryAnalysis]   = useState(null);  // from /api/analyze-upload
  const [resultAnalysis, setResultAnalysis] = useState(null);  // from /api/records/{id}/analyze
  const [loadingCmp, setLoadingCmp]         = useState(false);
  const [errorCmp, setErrorCmp]             = useState(null);

  /* Reset compare section when new search results come in */
  useEffect(() => {
    setSelectedResult(null);
    setQueryAnalysis(null);
    setResultAnalysis(null);
  }, [searchResults]);

  const handleResultClick = async (res) => {
    if (selectedResult?.file_id === res.file_id) {
      setSelectedResult(null);
      setResultAnalysis(null);
      return;
    }
    setSelectedResult(res);
    setLoadingCmp(true);
    setErrorCmp(null);
    setResultAnalysis(null);

    try {
      const calls = [
        axios.get(`${API_BASE}/records/${res.file_id}/analyze`),
      ];
      // Analyze uploaded query file only once
      if (!queryAnalysis && uploadedFileRef?.current) {
        const fd = new FormData();
        fd.append('file', uploadedFileRef.current);
        calls.push(axios.post(`${API_BASE}/analyze-upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }));
      }
      const [anaRes, qAnaRes] = await Promise.all(calls);
      setResultAnalysis(anaRes.data);
      if (qAnaRes) setQueryAnalysis(qAnaRes.data);
    } catch (e) {
      setErrorCmp(e.message);
    }
    setLoadingCmp(false);
  };

  const simPct = selectedResult ? (selectedResult.similarity * 100).toFixed(2) : null;

  return (
    <div className="fade-in">
      {/* ── Hero Upload Banner ── */}
      <div className="hero-banner">
        <h1>Listen to the most similar voices in the database</h1>
        <p>Upload a voice sample to extract acoustic features (MFCC, Spectral Contrast, Chroma) and find exact biometric matches instantly.</p>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".wav"
          onChange={onFileUpload}
        />
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn-primary"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            {uploading ? <div className="loader" /> : <UploadCloud size={20} />}
            {uploading ? 'Processing Audio…' : (uploadedFileName ? 'Upload Another' : 'Upload Sample')}
          </button>

          {uploadedFileName && !uploading && uploadedFileUrl && (
            <div className="fade-in" style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              background: 'rgba(255,255,255,0.15)', padding: '0.5rem 1rem',
              borderRadius: '99px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Uploaded Source</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{uploadedFileName}</span>
              </div>
              <button
                className="play-btn-small"
                style={{ background: 'white', color: 'var(--primary-orange)' }}
                onClick={() => onPlayTrack({ url: uploadedFileUrl, title: uploadedFileName, subtitle: 'Uploaded Sample' })}
              >
                {currentTrack?.url === uploadedFileUrl && isPlaying
                  ? <Pause size={16} fill="currentColor" />
                  : <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Search Results list ── */}
      {searchResults.length > 0 && (
        <>
          <div className="section-header">
            <h2 className="section-title">Top Trending Matches</h2>
            <span className="section-link" style={{ fontSize: '0.8rem' }}>
              {selectedResult ? `Comparing File #${selectedResult.file_id}` : 'Click a file to compare'}
            </span>
          </div>

          <div className="trending-list">
            {searchResults.map((res, index) => {
              const audioUrl = formatAudioUrl(res.file_path);
              const isCurrentPlaying = currentTrack?.url === audioUrl;
              const isSelected = selectedResult?.file_id === res.file_id;
              return (
                <div
                  className={`track-item fade-in${isSelected ? ' track-item-selected' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s`, cursor: 'pointer' }}
                  key={res.file_id}
                  onClick={() => handleResultClick(res)}
                >
                  <div className="track-index">{(index + 1).toString().padStart(2, '0')}</div>
                  <div className="track-img"><User size={24} /></div>
                  <div className="track-info">
                    <div className="track-title">File #{res.file_id}</div>
                    <div className="track-subtitle">
                      <span className="similarity-badge">{(res.similarity * 100).toFixed(2)}% Match</span>
                      <span>• {res.gender} • {res.accent || 'Unknown'} Accent</span>
                    </div>
                  </div>
                  <button
                    className="play-btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack({ url: audioUrl, title: `File #${res.file_id}`, subtitle: `${(res.similarity * 100).toFixed(1)}% Match` });
                    }}
                  >
                    {isCurrentPlaying && isPlaying
                      ? <Pause size={16} fill="white" />
                      : <Play size={16} fill="white" style={{ marginLeft: '2px' }} />}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Comparison Section ── */}
      {selectedResult && (
        <div className="fade-in" style={{ marginTop: '2rem' }}>
          {/* Similarity banner */}
          <div className="similarity-score-banner">
            <div className="sim-score-number" style={{ color: simColor(+simPct) }}>{simPct}%</div>
            <div className="sim-score-label">Cosine Similarity</div>
            <div className="sim-score-bar-wrap">
              <div className="sim-score-bar-fill" style={{ width: `${simPct}%`, background: simColor(+simPct) }} />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)', flexShrink: 0 }}>
              {uploadedFileName} <span style={{ margin: '0 0.5rem' }}>vs</span> File #{selectedResult.file_id}
            </div>
          </div>

          {/* Side-by-side column headers */}
          <div className="compare-columns" style={{ marginBottom: '1rem' }}>
            <div className="compare-side-label">Query — {uploadedFileName}</div>
            <div className="compare-side-label">File #{selectedResult.file_id} — {selectedResult.gender} · {selectedResult.accent || '?'}</div>
          </div>

          {loadingCmp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem', color: 'var(--text-gray)' }}>
              <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-orange)' }} />
              Processing audio features…
            </div>
          )}

          {errorCmp && (
            <div style={{ color: '#e54c00', padding: '1rem' }}>⚠ {errorCmp}</div>
          )}

          {!loadingCmp && !errorCmp && resultAnalysis && (
            <>
              {/* Row 1: Waveforms */}
              <div className="compare-columns" style={{ marginBottom: '1.25rem' }}>
                <ChartCard title="① Waveform — Query">
                  {queryAnalysis
                    ? <WaveformChart data={queryAnalysis.waveform} />
                    : <div style={{ height: 120, display:'flex', alignItems:'center', justifyContent:'center', color:'#aaa', fontSize:'0.85rem', background:'#12121a', borderRadius:'8px' }}>Loading…</div>}
                </ChartCard>
                <ChartCard title="① Waveform — Result">
                  <WaveformChart data={resultAnalysis.waveform} />
                </ChartCard>
              </div>

              {/* Row 2: Mel Spectrogram */}
              <div className="compare-columns" style={{ marginBottom: '1.25rem' }}>
                <ChartCard title="② Mel Spectrogram — Query">
                  {queryAnalysis
                    ? <SpectrogramChart data={queryAnalysis.mel_spectrogram} />
                    : <div style={{ height: 140, display:'flex', alignItems:'center', justifyContent:'center', color:'#aaa', fontSize:'0.85rem', background:'#12121a', borderRadius:'8px' }}>Loading…</div>}
                </ChartCard>
                <ChartCard title="② Mel Spectrogram — Result">
                  <SpectrogramChart data={resultAnalysis.mel_spectrogram} />
                </ChartCard>
              </div>

              {/* Row 3: MFCC */}
              <div className="compare-columns" style={{ marginBottom: '1.25rem' }}>
                <ChartCard title="③ MFCC Matrix — Query">
                  {queryAnalysis
                    ? <MFCCChart data={queryAnalysis.mfcc_matrix} />
                    : <div style={{ height: 160, display:'flex', alignItems:'center', justifyContent:'center', color:'#aaa', fontSize:'0.85rem', background:'#12121a', borderRadius:'8px' }}>Loading…</div>}
                </ChartCard>
                <ChartCard title="③ MFCC Matrix — Result">
                  <MFCCChart data={resultAnalysis.mfcc_matrix} />
                </ChartCard>
              </div>

              {/* Row 4: Feature Vector */}
              <div className="compare-columns" style={{ marginBottom: '1.25rem' }}>
                <ChartCard title="④ Feature Vector 99D — Query" light>
                  {queryAnalysis
                    ? <FeatureVectorChart embedding={queryAnalysis.embedding} />
                    : <div style={{ height: 200, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-gray)', fontSize:'0.85rem' }}>Loading…</div>}
                </ChartCard>
                <ChartCard title="④ Feature Vector 99D — Result" light>
                  <FeatureVectorChart embedding={resultAnalysis.embedding} />
                </ChartCard>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
