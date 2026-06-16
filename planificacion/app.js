'use strict';

/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
let currentPlanId   = null;
let currentReportId = null;
let pendingFiles    = [];   // {name, size, type, dataUrl}
let activeTab       = 'plans';
let toastTimer;
let confirmCallback = null;

/* ══════════════════════════════════════════════
   ROUTER
══════════════════════════════════════════════ */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════ */
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type !== 'success' ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════════
   CONFIRM MODAL
══════════════════════════════════════════════ */
function openConfirm(title, msg, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent   = msg;
  confirmCallback = onConfirm;
  document.getElementById('modal-confirm').classList.add('open');
}
function closeConfirm() {
  document.getElementById('modal-confirm').classList.remove('open');
  confirmCallback = null;
}
function doConfirm() {
  if (confirmCallback) confirmCallback();
  closeConfirm();
}

/* ══════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════ */
const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

function weekLabel(w) {
  if (!w) return '—';
  const [y, wn] = w.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  const mon  = new Date(jan4);
  mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (wn - 1) * 7);
  const sun  = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt  = d => d.toLocaleDateString('es-VE', { day:'2-digit', month:'short' });
  return `${fmt(mon)} – ${fmt(sun)} ${y}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric' })
       + ' ' + d.toLocaleTimeString('es-VE', { hour:'2-digit', minute:'2-digit' });
}

function fileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ══════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════ */
function renderDashboard() {
  const s = DB.stats();
  document.getElementById('stat-plans').textContent   = s.totalPlans;
  document.getElementById('stat-reports').textContent = s.totalReports;
  document.getElementById('stat-sent').textContent    = s.sentPlans + s.sentReports;
  document.getElementById('stat-draft').textContent   = s.draftPlans + s.draftReports;
  renderActiveTab();
  showView('dashboard');
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');
  renderActiveTab();
}

function renderActiveTab() {
  if (activeTab === 'plans') renderPlansList();
  else renderReportsList();
}

function renderPlansList() {
  const plans = DB.getPlans();
  const tbody = document.getElementById('plans-tbody');
  if (!plans.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">
      <div class="empty-state"><div class="eico">📋</div>
      <h3>Sin planificaciones</h3>
      <p>Crea la primera planificación semanal</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = plans.map(p => `
    <tr>
      <td><code style="font-size:11px;color:#4a8a6a">${escHtml(p.id)}</code></td>
      <td>${weekLabel(p.semana)}</td>
      <td>${escHtml(p.responsable || '—')}</td>
      <td>${escHtml(p.institucion || '—')}</td>
      <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" onclick="viewPlan('${p.id}')" title="Ver">👁</button>
          <button class="btn-icon" onclick="openFormPlan('${p.id}')" title="Editar">✏️</button>
          ${p.estado === 'borrador'
            ? `<button class="btn-icon" onclick="sendPlan('${p.id}')" title="Enviar">📤</button>`
            : ''}
          <button class="btn-icon danger" onclick="deletePlanConfirm('${p.id}')" title="Eliminar">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

function renderReportsList() {
  const reports = DB.getReports();
  const tbody   = document.getElementById('reports-tbody');
  if (!reports.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">
      <div class="empty-state"><div class="eico">📝</div>
      <h3>Sin reportes</h3>
      <p>Crea el primer reporte diario</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = reports.map(r => `
    <tr>
      <td><code style="font-size:11px;color:#4a8a6a">${escHtml(r.id)}</code></td>
      <td>${fmtDate(r.fecha)}</td>
      <td>${escHtml(r.responsable || '—')}</td>
      <td>${escHtml(r.institucion || '—')}</td>
      <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" onclick="viewReport('${r.id}')" title="Ver">👁</button>
          <button class="btn-icon" onclick="openFormReport('${r.id}')" title="Editar">✏️</button>
          ${r.estado === 'borrador'
            ? `<button class="btn-icon" onclick="sendReport('${r.id}')" title="Enviar">📤</button>`
            : ''}
          <button class="btn-icon danger" onclick="deleteReportConfirm('${r.id}')" title="Eliminar">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

/* ══════════════════════════════════════════════
   PLAN FORM
══════════════════════════════════════════════ */
function openFormPlan(id = null) {
  currentPlanId = id;
  const plan = id ? DB.getPlan(id) : null;

  document.getElementById('form-plan-title').textContent = plan ? 'Editar Planificación' : 'Nueva Planificación Semanal';
  document.getElementById('fp-institucion').value  = plan?.institucion || '';
  document.getElementById('fp-responsable').value  = plan?.responsable || '';
  document.getElementById('fp-semana').value        = plan?.semana || '';

  // Clear and fill activities
  document.getElementById('plan-activities-body').innerHTML = '';
  const acts = plan?.actividades || [];
  if (acts.length) acts.forEach(a => addPlanRow(a));
  else addPlanRow();

  showView('form-plan');
}

function addPlanRow(data = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <select class="act-dia">
        ${DAYS.map(d => `<option ${data.dia === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
    </td>
    <td><input type="time" class="act-hora" value="${escHtml(data.hora || '08:00')}"/></td>
    <td><input type="text" class="act-desc" placeholder="Descripción de la actividad…" value="${escHtml(data.descripcion || '')}"/></td>
    <td><button class="btn-rm" onclick="removeRow(this)" title="Eliminar fila">×</button></td>`;
  document.getElementById('plan-activities-body').appendChild(tr);
}

function removeRow(btn) {
  const tbody = btn.closest('tbody');
  btn.closest('tr').remove();
  if (!tbody.children.length) addPlanRow();
}

function collectPlanActivities() {
  const rows = document.querySelectorAll('#plan-activities-body tr');
  return Array.from(rows).map(tr => ({
    dia:         tr.querySelector('.act-dia').value,
    hora:        tr.querySelector('.act-hora').value,
    descripcion: tr.querySelector('.act-desc').value.trim(),
  })).filter(a => a.descripcion);
}

function savePlan(estado) {
  const institucion = document.getElementById('fp-institucion').value.trim();
  const responsable = document.getElementById('fp-responsable').value.trim();
  const semana      = document.getElementById('fp-semana').value;

  if (!institucion) { toast('Ingresa la institución', 'error'); return; }
  if (!responsable) { toast('Ingresa el responsable', 'error'); return; }
  if (!semana)      { toast('Selecciona la semana', 'error'); return; }

  const actividades = collectPlanActivities();

  const plan = {
    id: currentPlanId || undefined,
    institucion, responsable, semana, actividades, estado,
  };

  DB.savePlan(plan);
  toast(estado === 'enviado' ? '✅ Planificación enviada' : '💾 Borrador guardado');
  renderDashboard();
}

function sendPlan(id) {
  const plan = DB.getPlan(id);
  if (!plan) return;
  plan.estado = 'enviado';
  DB.savePlan(plan);
  toast('✅ Planificación enviada');
  renderPlansList();
}

function deletePlanConfirm(id) {
  openConfirm('Eliminar planificación', '¿Estás seguro? Esta acción no se puede deshacer.', () => {
    DB.deletePlan(id);
    toast('Planificación eliminada', 'warn');
    renderPlansList();
  });
}

/* ══════════════════════════════════════════════
   PLAN DETAIL
══════════════════════════════════════════════ */
function viewPlan(id) {
  const plan = DB.getPlan(id);
  if (!plan) return;

  const relReports = DB.getReports().filter(r => r.planificacionId === id);

  document.getElementById('detail-plan-content').innerHTML = `
    <div class="detail-meta">
      <div class="meta-item"><div class="mlbl">ID</div><div class="mval" style="font-size:11px;font-family:monospace">${escHtml(plan.id)}</div></div>
      <div class="meta-item"><div class="mlbl">Estado</div><div class="mval"><span class="badge badge-${plan.estado}">${plan.estado}</span></div></div>
      <div class="meta-item"><div class="mlbl">Semana</div><div class="mval">${weekLabel(plan.semana)}</div></div>
      <div class="meta-item"><div class="mlbl">Creado</div><div class="mval">${fmtDateTime(plan.createdAt)}</div></div>
    </div>

    <div class="info-panel">
      <h3>📋 Información general</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
        <div><strong>Institución:</strong> ${escHtml(plan.institucion)}</div>
        <div><strong>Responsable:</strong> ${escHtml(plan.responsable)}</div>
      </div>
    </div>

    <div class="info-panel">
      <h3>📅 Actividades programadas (${plan.actividades?.length || 0})</h3>
      ${plan.actividades?.length ? `
        <table class="data-table">
          <thead><tr><th>Día</th><th>Hora</th><th>Actividad</th></tr></thead>
          <tbody>${plan.actividades.map(a => `
            <tr>
              <td>${escHtml(a.dia)}</td>
              <td>${escHtml(a.hora)}</td>
              <td>${escHtml(a.descripcion)}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<p style="color:#4a8a6a;font-size:13px">Sin actividades registradas.</p>'}
    </div>

    ${relReports.length ? `
    <div class="info-panel">
      <h3>📝 Reportes vinculados (${relReports.length})</h3>
      ${relReports.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f8f4;font-size:13px">
          <span>${fmtDate(r.fecha)} — ${escHtml(r.responsable)}</span>
          <span class="badge badge-${r.estado}">${r.estado}</span>
          <button class="btn-icon" onclick="viewReport('${r.id}')">👁 Ver</button>
        </div>`).join('')}
    </div>` : ''}

    <div class="form-footer">
      <button class="btn-cancel" onclick="renderDashboard()">← Volver</button>
      <div class="spacer"></div>
      <button class="btn-draft" onclick="openFormPlan('${escHtml(plan.id)}')">✏️ Editar</button>
      ${plan.estado === 'borrador'
        ? `<button class="btn-submit" onclick="sendPlan('${escHtml(plan.id)}');renderDashboard()">📤 Enviar</button>`
        : ''}
    </div>`;

  showView('detail-plan');
}

/* ══════════════════════════════════════════════
   REPORT FORM
══════════════════════════════════════════════ */
function openFormReport(id = null) {
  currentReportId = id;
  pendingFiles    = [];
  const report = id ? DB.getReport(id) : null;

  document.getElementById('form-report-title').textContent = report ? 'Editar Reporte Diario' : 'Nuevo Reporte Diario';
  document.getElementById('fr-fecha').value       = report?.fecha        || new Date().toISOString().slice(0,10);
  document.getElementById('fr-institucion').value = report?.institucion  || '';
  document.getElementById('fr-responsable').value = report?.responsable  || '';
  document.getElementById('fr-hora-ini').value    = report?.horaInicio   || '08:00';
  document.getElementById('fr-hora-fin').value    = report?.horaFin      || '17:00';
  document.getElementById('fr-observaciones').value = report?.observaciones || '';

  // Populate plan selector
  const planSelect = document.getElementById('fr-plan');
  const plans = DB.getPlans();
  planSelect.innerHTML = `<option value="">— Sin planificación relacionada —</option>`
    + plans.map(p => `<option value="${p.id}" ${report?.planificacionId === p.id ? 'selected' : ''}>
        ${weekLabel(p.semana)} · ${escHtml(p.responsable)}
      </option>`).join('');

  // Activities
  document.getElementById('report-activities-body').innerHTML = '';
  const acts = report?.actividades || [];
  if (acts.length) acts.forEach(a => addReportActivity(a));
  else addReportActivity();

  // Files
  pendingFiles = report?.evidencias ? [...report.evidencias] : [];
  renderFilePreviews();

  showView('form-report');
}

function addReportActivity(data = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <div class="check-act">
        <input type="checkbox" class="act-done" ${data.completada ? 'checked' : ''}/>
      </div>
    </td>
    <td><input type="text" class="act-desc" placeholder="Actividad realizada…" value="${escHtml(data.descripcion || '')}"/></td>
    <td><button class="btn-rm" onclick="removeRow(this)" title="Quitar">×</button></td>`;
  document.getElementById('report-activities-body').appendChild(tr);
}

function collectReportActivities() {
  return Array.from(document.querySelectorAll('#report-activities-body tr')).map(tr => ({
    descripcion: tr.querySelector('.act-desc').value.trim(),
    completada:  tr.querySelector('.act-done').checked,
  })).filter(a => a.descripcion);
}

/* ── File upload ── */
function handleFileInput(input) {
  Array.from(input.files).forEach(file => {
    if (file.size > 2 * 1024 * 1024) {
      toast(`"${file.name}" supera 2 MB y fue omitido`, 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      pendingFiles.push({ name: file.name, size: file.size, type: file.type, dataUrl: e.target.result });
      renderFilePreviews();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function removeFile(idx) {
  pendingFiles.splice(idx, 1);
  renderFilePreviews();
}

function renderFilePreviews() {
  const list = document.getElementById('file-list');
  if (!pendingFiles.length) { list.innerHTML = ''; return; }
  list.innerHTML = pendingFiles.map((f, i) => `
    <div class="file-chip">
      ${f.type.startsWith('image/') ? `<span>🖼</span>` : `<span>📄</span>`}
      <span class="name" title="${escHtml(f.name)}">${escHtml(f.name)}</span>
      <span class="size">${fileSize(f.size)}</span>
      <button class="rm" onclick="removeFile(${i})" title="Quitar">×</button>
    </div>`).join('');
}

function saveReport(estado) {
  const fecha       = document.getElementById('fr-fecha').value;
  const institucion = document.getElementById('fr-institucion').value.trim();
  const responsable = document.getElementById('fr-responsable').value.trim();
  const horaInicio  = document.getElementById('fr-hora-ini').value;
  const horaFin     = document.getElementById('fr-hora-fin').value;
  const planId      = document.getElementById('fr-plan').value || null;
  const observaciones = document.getElementById('fr-observaciones').value.trim();

  if (!fecha)       { toast('Selecciona la fecha', 'error'); return; }
  if (!institucion) { toast('Ingresa la institución', 'error'); return; }
  if (!responsable) { toast('Ingresa el responsable', 'error'); return; }

  const actividades = collectReportActivities();

  const report = {
    id: currentReportId || undefined,
    fecha, institucion, responsable, horaInicio, horaFin,
    planificacionId: planId,
    actividades, observaciones,
    evidencias: pendingFiles,
    estado,
  };

  DB.saveReport(report);
  toast(estado === 'enviado' ? '✅ Reporte enviado' : '💾 Borrador guardado');
  renderDashboard();
}

function sendReport(id) {
  const report = DB.getReport(id);
  if (!report) return;
  report.estado = 'enviado';
  DB.saveReport(report);
  toast('✅ Reporte enviado');
  renderReportsList();
}

function deleteReportConfirm(id) {
  openConfirm('Eliminar reporte', '¿Estás seguro? Esta acción no se puede deshacer.', () => {
    DB.deleteReport(id);
    toast('Reporte eliminado', 'warn');
    renderReportsList();
  });
}

/* ══════════════════════════════════════════════
   REPORT DETAIL
══════════════════════════════════════════════ */
function viewReport(id) {
  const report = DB.getReport(id);
  if (!report) return;

  const plan = report.planificacionId ? DB.getPlan(report.planificacionId) : null;
  const done = report.actividades?.filter(a => a.completada).length || 0;
  const total = report.actividades?.length || 0;

  document.getElementById('detail-report-content').innerHTML = `
    <div class="detail-meta">
      <div class="meta-item"><div class="mlbl">ID</div><div class="mval" style="font-size:11px;font-family:monospace">${escHtml(report.id)}</div></div>
      <div class="meta-item"><div class="mlbl">Estado</div><div class="mval"><span class="badge badge-${report.estado}">${report.estado}</span></div></div>
      <div class="meta-item"><div class="mlbl">Fecha</div><div class="mval">${fmtDate(report.fecha)}</div></div>
      <div class="meta-item"><div class="mlbl">Horario</div><div class="mval">${escHtml(report.horaInicio)} – ${escHtml(report.horaFin)}</div></div>
    </div>

    <div class="info-panel">
      <h3>📋 Información general</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
        <div><strong>Institución:</strong> ${escHtml(report.institucion)}</div>
        <div><strong>Responsable:</strong> ${escHtml(report.responsable)}</div>
        ${plan ? `<div style="grid-column:1/-1"><strong>Planificación:</strong> ${weekLabel(plan.semana)}
          <button class="btn-icon" style="margin-left:8px" onclick="viewPlan('${escHtml(plan.id)}')">👁 Ver</button></div>` : ''}
      </div>
    </div>

    <div class="info-panel">
      <h3>✅ Actividades realizadas (${done}/${total} completadas)</h3>
      ${total ? `
        <table class="data-table">
          <thead><tr><th>✓</th><th>Actividad</th></tr></thead>
          <tbody>${report.actividades.map(a => `
            <tr>
              <td>${a.completada ? '✅' : '⬜'}</td>
              <td style="${a.completada ? 'text-decoration:line-through;color:#4a8a6a' : ''}">${escHtml(a.descripcion)}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<p style="color:#4a8a6a;font-size:13px">Sin actividades registradas.</p>'}
    </div>

    ${report.observaciones ? `
    <div class="info-panel">
      <h3>📝 Observaciones</h3>
      <p style="font-size:13px;color:#1a3d2b;line-height:1.75">${escHtml(report.observaciones)}</p>
    </div>` : ''}

    ${report.evidencias?.length ? `
    <div class="info-panel">
      <h3>📎 Evidencias (${report.evidencias.length})</h3>
      <div class="evidence-grid">
        ${report.evidencias.map((ev, i) => ev.type.startsWith('image/')
          ? `<div class="ev-thumb"><img src="${ev.dataUrl}" alt="${escHtml(ev.name)}" onclick="openEvidencia(${i},'${escHtml(report.id)}')" style="cursor:pointer"/></div>`
          : `<div class="ev-file" onclick="openEvidencia(${i},'${escHtml(report.id)}')">
              <div class="ficon">📄</div>
              <div style="font-size:10px;text-align:center;padding:0 4px">${escHtml(ev.name)}</div>
            </div>`
        ).join('')}
      </div>
    </div>` : ''}

    <div class="form-footer">
      <button class="btn-cancel" onclick="renderDashboard()">← Volver</button>
      <div class="spacer"></div>
      <button class="btn-draft" onclick="openFormReport('${report.id}')">✏️ Editar</button>
      ${report.estado === 'borrador'
        ? `<button class="btn-submit" onclick="sendReport('${report.id}');renderDashboard()">📤 Enviar</button>`
        : ''}
    </div>`;

  showView('detail-report');
}

function openEvidencia(idx, reportId) {
  const report = DB.getReport(reportId);
  if (!report?.evidencias?.[idx]) return;
  const ev = report.evidencias[idx];
  let win;
  try { win = window.open(); } catch { win = null; }
  if (!win) {
    toast('No se pudo abrir la ventana. Permita ventanas emergentes para este sitio.', 'error');
    return;
  }
  // Se construye el documento con DOM seguro (sin document.write sobre datos
  // del usuario): nombre/tipo/dataUrl de la evidencia provienen de un archivo
  // subido y nunca deben interpretarse como HTML.
  win.document.title = ev.name || 'Evidencia';
  const body = win.document.body;
  body.style.margin = '0';
  body.style.background = '#111';
  body.style.display = 'flex';
  body.style.justifyContent = 'center';
  body.style.alignItems = 'center';
  body.style.minHeight = '100vh';

  const isImage = String(ev.type || '').startsWith('image/');
  const media = win.document.createElement(isImage ? 'img' : 'embed');
  media.src = ev.dataUrl;
  if (isImage) {
    media.style.maxWidth = '100%';
    media.style.maxHeight = '100vh';
  } else {
    media.type = ev.type;
    media.width = '100%';
    media.height = '100%';
    media.style.minHeight = '100vh';
  }
  body.appendChild(media);
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
window.onerror = function (message, source, lineno, colno, error) {
  toast('Error inesperado: ' + (error?.message || message), 'error');
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    renderDashboard();
  } catch (e) {
    toast('Error al cargar el módulo de planificación: ' + e.message, 'error');
  }
});
