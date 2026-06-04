/* cms/pb.js — PocketBase data layer (replaces cms/db.js) */
(function () {
  'use strict';

  const BASE = 'http://127.0.0.1:8090';

  async function _get(col) {
    const res = await fetch(`${BASE}/api/collections/${col}/records?perPage=200`);
    if (!res.ok) throw new Error(`PB getAll ${col}: ${res.status}`);
    const data = await res.json();
    return data.items || [];
  }

  async function _post(col, item) {
    const res = await fetch(`${BASE}/api/collections/${col}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error(`PB save(POST) ${col}: ${res.status}`);
    return res.json();
  }

  async function _patch(col, id, item) {
    const res = await fetch(`${BASE}/api/collections/${col}/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error(`PB save(PATCH) ${col}: ${res.status}`);
    return res.json();
  }

  async function _delete(col, id) {
    const res = await fetch(`${BASE}/api/collections/${col}/records/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`PB remove ${col}/${id}: ${res.status}`);
  }

  window.CMSDB = {
    async getAll(col) {
      try { return await _get(col); } catch (e) { console.error(e); return []; }
    },
    async getOne(col, id) {
      try {
        const res = await fetch(`${BASE}/api/collections/${col}/records/${id}`);
        if (!res.ok) return null;
        return res.json();
      } catch (e) { console.error(e); return null; }
    },
    async save(col, item) {
      try {
        if (item.id) return await _patch(col, item.id, item);
        return await _post(col, item);
      } catch (e) { console.error(e); return null; }
    },
    async remove(col, id) {
      try { await _delete(col, id); return true; } catch (e) { console.error(e); return false; }
    },
    uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); },
    now() { return new Date().toISOString(); }
  };
})();
