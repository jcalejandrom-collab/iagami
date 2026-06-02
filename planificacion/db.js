'use strict';

const DB = (() => {
  const PLANS_KEY   = 'iagami_plans';
  const REPORTS_KEY = 'iagami_reports';

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  }
  function write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }
  function uid(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  function now() { return new Date().toISOString(); }

  return {
    // ── PLANIFICACIONES ─────────────────────────────────────────────
    getPlans()    { return read(PLANS_KEY); },
    getPlan(id)   { return read(PLANS_KEY).find(p => p.id === id) || null; },

    savePlan(plan) {
      const all = read(PLANS_KEY);
      if (!plan.id) { plan.id = uid('PLAN'); plan.createdAt = now(); }
      plan.updatedAt = now();
      const i = all.findIndex(p => p.id === plan.id);
      if (i >= 0) all[i] = plan; else all.unshift(plan);
      write(PLANS_KEY, all);
      return plan;
    },

    deletePlan(id) {
      write(PLANS_KEY, read(PLANS_KEY).filter(p => p.id !== id));
    },

    // ── REPORTES ────────────────────────────────────────────────────
    getReports()    { return read(REPORTS_KEY); },
    getReport(id)   { return read(REPORTS_KEY).find(r => r.id === id) || null; },

    saveReport(report) {
      const all = read(REPORTS_KEY);
      if (!report.id) { report.id = uid('REP'); report.createdAt = now(); }
      report.updatedAt = now();
      const i = all.findIndex(r => r.id === report.id);
      if (i >= 0) all[i] = report; else all.unshift(report);
      write(REPORTS_KEY, all);
      return report;
    },

    deleteReport(id) {
      write(REPORTS_KEY, read(REPORTS_KEY).filter(r => r.id !== id));
    },

    // ── STATS ────────────────────────────────────────────────────────
    stats() {
      const plans   = read(PLANS_KEY);
      const reports = read(REPORTS_KEY);
      return {
        totalPlans:    plans.length,
        sentPlans:     plans.filter(p => p.estado === 'enviado').length,
        draftPlans:    plans.filter(p => p.estado === 'borrador').length,
        totalReports:  reports.length,
        sentReports:   reports.filter(r => r.estado === 'enviado').length,
        draftReports:  reports.filter(r => r.estado === 'borrador').length,
      };
    }
  };
})();
