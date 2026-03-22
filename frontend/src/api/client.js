/**
 * Fetch-based API client for Scholar backend.
 * Reads auth token from localStorage on every request.
 * @module client
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * Retrieves the stored auth token from localStorage.
 * @returns {string|null}
 */
function getToken() {
  return localStorage.getItem('scholar_token');
}

/**
 * Builds request headers, injecting Authorization if a token exists.
 * @param {boolean} hasBody - Whether the request has a JSON body.
 * @returns {Record<string, string>}
 */
function buildHeaders(hasBody = false) {
  const headers = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Core request handler. Throws on non-2xx responses with the backend's detail message.
 * @param {string} path - API path (e.g. "/auth/login")
 * @param {RequestInit} options
 * @returns {Promise<any>}
 */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  let response;
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    throw new Error('Network error: unable to reach the server. Please check your connection.');
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody?.detail) {
        detail = Array.isArray(errBody.detail)
          ? errBody.detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
          : String(errBody.detail);
      }
    } catch {
      // ignore JSON parse errors on error body
    }
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return response.json();
}

/**
 * HTTP GET
 * @param {string} path
 * @returns {Promise<any>}
 */
export function get(path) {
  return request(path, {
    method: 'GET',
    headers: buildHeaders(false),
  });
}

/**
 * HTTP POST with JSON body
 * @param {string} path
 * @param {object} [body]
 * @returns {Promise<any>}
 */
export function post(path, body) {
  return request(path, {
    method: 'POST',
    headers: buildHeaders(true),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * HTTP PUT with JSON body
 * @param {string} path
 * @param {object} [body]
 * @returns {Promise<any>}
 */
export function put(path, body) {
  return request(path, {
    method: 'PUT',
    headers: buildHeaders(true),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * HTTP DELETE
 * @param {string} path
 * @returns {Promise<any>}
 */
export function del(path) {
  return request(path, {
    method: 'DELETE',
    headers: buildHeaders(false),
  });
}

const client = { get, post, put, del };
export default client;
