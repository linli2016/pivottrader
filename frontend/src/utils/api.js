/**
 * Unified API Client for PivotTrader.
 * Centralizes request execution, base URL resolution, and JSON parsing.
 */

export const API_BASE = window.location.port === '5173'
  ? `http://${window.location.hostname}:8000`
  : '';

export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch (_) {
      // ignore json parse error on non-json body
    }
    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export const api = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) =>
    apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options = {}) =>
    apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, body, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'DELETE',
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
};
