import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, Search, Play, Filter, Mic2, Database } from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'database'
  
  // Tab: Database settings
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterAccent, setFilterAccent] = useState('');

  // Tab: Voice Search settings
  const [uploading, setUploading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    if (activeTab === 'database') {
      fetchRecords();
    }
  }, [activeTab, filterGender, filterAccent, searchQuery]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: 20,
        offset: 0,
        search: searchQuery,
        gender: filterGender,
        accent: filterAccent
      });
      const response = await axios.get(`${API_BASE}/records?${params}`);
      setRecords(response.data.records);
      setTotalRecords(response.data.total);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    
    setUploadedFileUrl(URL.createObjectURL(file));
    setUploadedFileName(file.name);

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API_BASE}/search`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error(error);
      alert('Error searching voice database');
    }
    setUploading(false);
  };

  return (
    <>
      <div className="bg-blobs">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
      </div>
      
      <div className="container fade-in">
        <aside className="glass-panel" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            <Mic2 size={32} color="#3b82f6" />
            <h2 style={{ marginBottom: 0 }}>VoiceFinder</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              className={activeTab === 'search' ? '' : 'glass-panel'} 
              style={activeTab !== 'search' ? { background: 'transparent', border: 'none', boxShadow: 'none' } : { width: '100%' }}
              onClick={() => setActiveTab('search')}
            >
              <Search size={18} /> Semantic Search
            </button>
            <button 
              className={activeTab === 'database' ? '' : 'glass-panel'} 
              style={activeTab !== 'database' ? { background: 'transparent', border: 'none', boxShadow: 'none' } : { width: '100%' }}
              onClick={() => setActiveTab('database')}
            >
              <Database size={18} /> Voice Database
            </button>
          </div>

          {activeTab === 'database' && (
            <div className="filters fade-in">
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={18} /> Filters
              </h3>
              <div className="input-group">
                <label>Speaker ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. p225"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Gender</label>
                <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                  <option value="">All</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div className="input-group">
                <label>Accent</label>
                <select value={filterAccent} onChange={(e) => setFilterAccent(e.target.value)}>
                  <option value="">All</option>
                  <option value="English">English</option>
                  <option value="Scottish">Scottish</option>
                  <option value="Irish">Irish</option>
                  <option value="American">American</option>
                </select>
              </div>
            </div>
          )}
        </aside>

        <main>
          {activeTab === 'search' ? (
            <div className="fade-in">
              <h1>Voice Similarity Search</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Upload a `.wav` file to extract acoustic features (MFCC, Spectral Contrast, Chroma) and find the top 5 most similar voices in the database.
              </p>

              <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <div 
                  className={`dropzone ${uploading ? 'active' : ''}`}
                  onClick={(e) => {
                    // Prevent triggering upload when interacting with the audio player
                    if (e.target.tagName !== 'AUDIO' && !e.target.closest('audio')) {
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept=".wav"
                    onChange={handleFileUpload}
                  />
                  {uploading ? (
                    <>
                      <div className="loading-spinner"></div>
                      <h3>Processing {uploadedFileName}...</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Extracting vectors and searching...</p>
                    </>
                  ) : uploadedFileUrl ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
                        <UploadCloud size={24} />
                        <h3 style={{ margin: 0, wordBreak: 'break-all' }}>{uploadedFileName}</h3>
                      </div>
                      <audio 
                        controls 
                        src={uploadedFileUrl} 
                        style={{ width: '80%', margin: '1rem 0' }}
                        onClick={(e) => e.stopPropagation()} 
                      />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Click anywhere here to upload a different file
                      </p>
                    </>
                  ) : (
                    <>
                      <UploadCloud />
                      <h3>Click or drag .wav file here</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        File will be analyzed in-memory and discarded.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="fade-in">
                  <h2>Top 5 Matches</h2>
                  <div className="records-feed">
                    {searchResults.map((res, index) => (
                      <div className="record-card fade-in" style={{ animationDelay: `${index * 0.1}s` }} key={res.file_id}>
                        <div className="record-header">
                          <div className="record-title">
                            <div className="avatar">#{index + 1}</div>
                            <div>
                              <h3>{res.speaker}</h3>
                              <span className="badge">{res.gender}</span>
                            </div>
                          </div>
                          <div className="similarity-score">
                            {(res.similarity * 100).toFixed(2)}% Match
                          </div>
                        </div>
                        
                        <div className="similarity-bar-container">
                          <div className="similarity-bar" style={{ width: `${res.similarity * 100}%` }}></div>
                        </div>

                        <div className="metadata-grid">
                          <div className="metadata-item">
                            <span className="metadata-label">Accent</span>
                            <span className="metadata-value">{res.accent || 'N/A'}</span>
                          </div>
                          <div className="metadata-item">
                            <span className="metadata-label">Age</span>
                            <span className="metadata-value">{res.age || 'N/A'}</span>
                          </div>
                        </div>
                        
                        <audio controls src={`http://localhost:8000/data/${res.file_path.replace(/\\/g, '/')}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Database Feed</h1>
                <span className="badge">{totalRecords} Records Found</span>
              </div>
              
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
                </div>
              ) : (
                <div className="records-feed">
                  {records.map(record => (
                    <div className="record-card" key={record.file_id}>
                      <div className="record-header">
                        <div className="record-title">
                          <div className="avatar">{record.speaker.substring(0, 2)}</div>
                          <div>
                            <h3>{record.speaker}</h3>
                            <span className="badge">{record.gender}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="metadata-grid">
                        <div className="metadata-item">
                          <span className="metadata-label">Accent</span>
                          <span className="metadata-value">{record.accent || 'N/A'}</span>
                        </div>
                        <div className="metadata-item">
                          <span className="metadata-label">Age</span>
                          <span className="metadata-value">{record.age || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <audio controls src={`http://localhost:8000/data/${record.file_path.replace(/\\/g, '/')}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default App;
