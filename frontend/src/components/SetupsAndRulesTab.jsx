import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export default function SetupsAndRulesTab() {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/setups-and-rules`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content || '');
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to load Setups & Rules from server.' });
      }
    } catch (err) {
      console.error('Error loading Setups & Rules:', err);
      setStatusMessage({ type: 'error', text: 'Network error connecting to backend API.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/setups-and-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: '✓ Playbook saved successfully to setups_and_rules.md!' });
        setIsEditing(false);
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to save changes.' });
      }
    } catch (err) {
      console.error('Error saving Setups & Rules:', err);
      setStatusMessage({ type: 'error', text: 'Network error saving changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setStatusMessage({ type: 'success', text: '✓ Markdown copied to clipboard!' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Convert markdown to html safely with marked
  const getRenderedHtml = () => {
    try {
      return marked.parse(content || '');
    } catch (e) {
      return `<p>Error rendering markdown: ${e.message}</p>`;
    }
  };

  return (
    <div className="setups-rules-page">
      {/* Header Section */}
      <div className="header-section">
        <div className="header-title">
          <div className="header-subtitle-tag">
            <span>PLAYBOOK</span>
            <span>•</span>
            <span>SETUPS & TRADING RULES</span>
          </div>
          <h1>Setups & Execution Rules</h1>
          <p>Central playbook for momentum setups, screening parameters, risk management, and execution discipline</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={handleCopy} disabled={loading}>
            📋 Copy Markdown
          </button>

          {!isEditing ? (
            <button className="btn btn-primary" onClick={() => setIsEditing(true)} disabled={loading}>
              ✏️ Edit Playbook
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => { setIsEditing(false); fetchContent(); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alert Status Banner */}
      {statusMessage && (
        <div className={`query-alert ${statusMessage.type === 'error' ? 'alert-danger' : 'alert-info'}`} style={{ marginBottom: '16px' }}>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading Setups & Rules playbook...</p>
        </div>
      ) : isEditing ? (
        /* Edit Mode */
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
              EDITING: <code style={{ color: '#34d399' }}>setups_and_rules.md</code>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Supports Standard GitHub Flavored Markdown
            </span>
          </div>
          <textarea
            className="sql-textarea"
            style={{ minHeight: '600px', fontSize: '13.5px', fontFamily: 'var(--font-mono)' }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your markdown setups and rules here..."
          />
        </div>
      ) : (
        /* View Mode */
        <div className="glass-card markdown-content-card">
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: getRenderedHtml() }}
          />
        </div>
      )}
    </div>
  );
}
