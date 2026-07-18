import React from 'react';

export default function SettingsTab({
  config,
  setConfig,
  handleSaveConfig,
}) {
  return (
    <div>
      <div className="header-section">
        <div className="header-title">
          <h1>Screener Configurations</h1>
          <p>Configure momentum thresholds, exchanges, and data providers</p>
        </div>
      </div>

      <div className="glass-card">
        <form onSubmit={handleSaveConfig} className="form-grid">
          <div className="form-group">
            <label>Primary / Fundamental Data Provider</label>
            <select
              value={config.provider_selected}
              onChange={(e) => setConfig({ ...config, provider_selected: e.target.value })}
            >
              <option value="YFINANCE">Yahoo Finance (Free & No Limits)</option>
              <option value="IBKR">Interactive Brokers (Workstation connection)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Price Ingestion Provider</label>
            <select
              value={config.price_provider_selected}
              onChange={(e) => setConfig({ ...config, price_provider_selected: e.target.value })}
            >
              <option value="YFINANCE">Yahoo Finance (Recommended: Multi-threaded & Fast)</option>
              <option value="IBKR">Interactive Brokers (Sequential & Rate Limited)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Minimum Stock Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={config.min_price}
              onChange={(e) => setConfig({ ...config, min_price: parseFloat(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Minimum 50-day SMA Volume</label>
            <input
              type="number"
              value={config.min_volume_sma_50}
              onChange={(e) => setConfig({ ...config, min_volume_sma_50: parseInt(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Minervini Min RS Percentile Rank (70 = Top 30%)</label>
            <input
              type="number"
              value={config.min_rs_percentile}
              onChange={(e) => setConfig({ ...config, min_rs_percentile: parseInt(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Minimum QoQ EPS Growth (%)</label>
            <input
              type="number"
              step="0.1"
              value={config.min_eps_growth_qoq}
              onChange={(e) => setConfig({ ...config, min_eps_growth_qoq: parseFloat(e.target.value) })}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary">Save Configurations</button>
          </div>
        </form>
      </div>
    </div>
  );
}
