import { api } from '../api.js';
import { h, clear, field, modal, toast, empty, money, confirmDialog } from '../ui.js';
import { can } from '../state.js';
import { faceReady, hasCamera, startCamera, stopCamera, detectFace, snapshot } from '../face.js';

export default async function employees(el) {
  clear(el);
  const [list, schedules, devices] = await Promise.all([
    api.get('/employees'), api.get('/schedules'), api.get('/devices'),
  ]);
  const editable = can('admin', 'contador');

  const search = h('input', { type: 'search', placeholder: 'Buscar por nombre o clave…' });
  const deptSel = h('select', {}, h('option', { value: '' }, 'Todas las áreas'),
    ...[...new Set(list.map((e) => e.department).filter(Boolean))].sort().map((d) => h('option', { value: d }, d)));
  const tableWrap = h('div', { class: 'card' });

  function render() {
    const q = search.value.trim().toLowerCase();
    let rows = list.filter((e) => e.active !== false);
    if (deptSel.value) rows = rows.filter((e) => e.department === deptSel.value);
    if (q) rows = rows.filter((e) => e.name.toLowerCase().includes(q) || (e.code || '').toLowerCase().includes(q));
    clear(tableWrap);
    tableWrap.appendChild(h('div', { class: 'card-head' }, h('h2', {}, 'Catálogo de empleados'), h('span', { class: 'sub' }, `${rows.length} activos`)));
    if (!rows.length) { tableWrap.appendChild(empty('👤', 'Sin empleados.')); return; }
    tableWrap.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {},
        h('th', {}, 'Clave NOI'), h('th', {}, 'Nombre'), h('th', {}, 'Área / Puesto'), h('th', {}, 'Horario'),
        h('th', { class: 'num' }, 'Salario diario'), h('th', {}, 'Bono'), h('th', {}, 'Biometría'), editable ? h('th', {}, '') : null)),
      h('tbody', {}, ...rows.map((e) => h('tr', {},
        h('td', { class: 'mono strong' }, e.noiKey || e.code),
        h('td', {}, h('div', { class: 'strong' }, e.name), h('div', { class: 'muted', style: 'font-size:11px' }, e.rfc || '')),
        h('td', {}, h('div', {}, e.department || '—'), h('div', { class: 'muted', style: 'font-size:11px' }, e.position || '')),
        h('td', { class: 'muted' }, e.scheduleName || '—'),
        h('td', { class: 'num mono' }, money(e.dailySalary)),
        h('td', {}, e.bonusEligible !== false ? h('span', { class: 'badge b-ok' }, 'Sí') : h('span', { class: 'badge b-gray' }, 'No')),
        h('td', {}, e.faceEnrolled
          ? h('span', { class: 'badge b-ok' }, '✓ Rostro')
          : h('span', { class: 'badge b-gray' }, 'Sin registro')),
        editable ? h('td', {}, h('div', { class: 'row', style: 'gap:6px' },
          h('button', { class: 'btn btn-sm', onClick: () => enrollFaceModal(e) }, e.faceEnrolled ? '📷 Rostro' : '📷 Registrar'),
          h('button', { class: 'btn btn-sm', onClick: () => empModal(e, schedules, devices) }, 'Editar'),
          h('button', { class: 'btn btn-sm btn-danger', onClick: async () => {
            if (await confirmDialog({ title: 'Dar de baja', message: `¿Dar de baja a ${e.name}?`, confirmText: 'Dar de baja', danger: true })) {
              try { await api.del(`/employees/${e.id}`); toast('Empleado dado de baja', 'ok'); reload(); } catch (er) { toast(er.message, 'err'); }
            }
          } }, '✕'))) : null,
      ))),
    )));
  }

  search.addEventListener('input', render);
  deptSel.addEventListener('change', render);

  el.appendChild(h('div', { class: 'toolbar' },
    h('div', { class: 'grow' }, field('Buscar', search)), field('Área', deptSel),
    editable ? h('button', { class: 'btn btn-primary', onClick: () => empModal(null, schedules, devices) }, '+ Empleado') : null,
  ));
  el.appendChild(tableWrap);
  render();
}

function empModal(emp, schedules, devices) {
  const isNew = !emp;
  const f = {
    code: h('input', { value: emp?.code || '' }),
    noiKey: h('input', { value: emp?.noiKey || '' }),
    name: h('input', { value: emp?.name || '' }),
    rfc: h('input', { value: emp?.rfc || '' }),
    department: h('input', { value: emp?.department || '' }),
    position: h('input', { value: emp?.position || '' }),
    scheduleId: h('select', {}, ...schedules.map((s) => { const o = h('option', { value: s.id }, s.name); if (emp?.scheduleId === s.id) o.selected = true; return o; })),
    deviceId: h('select', {}, ...devices.map((d) => { const o = h('option', { value: d.id }, d.name); if (emp?.deviceId === d.id) o.selected = true; return o; })),
    checadorUserId: h('input', { value: emp?.checadorUserId || '' }),
    dailySalary: h('input', { type: 'number', step: '0.01', value: emp?.dailySalary || 0 }),
    hireDate: h('input', { type: 'date', value: emp?.hireDate || '' }),
    bonusEligible: h('input', { type: 'checkbox' }),
  };
  f.bonusEligible.checked = emp ? emp.bonusEligible !== false : true;

  const m = modal({
    title: isNew ? 'Nuevo empleado' : `Editar · ${emp.name}`, size: 'lg',
    body: h('div', { class: 'form-grid' },
      h('div', { class: 'form-grid two' }, field('Clave', f.code), field('Clave NOI', f.noiKey)),
      field('Nombre completo', f.name),
      h('div', { class: 'form-grid two' }, field('RFC', f.rfc), field('Fecha de ingreso', f.hireDate)),
      h('div', { class: 'form-grid two' }, field('Área / Departamento', f.department), field('Puesto', f.position)),
      h('div', { class: 'form-grid two' }, field('Horario', f.scheduleId), field('Salario diario', f.dailySalary)),
      h('div', { class: 'form-grid two' }, field('Checador', f.deviceId), field('ID en checador (Hikvision)', f.checadorUserId)),
      h('label', { class: 'field' }, h('span', {}, 'Bono de puntualidad'), h('div', { class: 'checks' }, h('label', {}, f.bonusEligible, ' Elegible para bono'))),
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!f.name.value || !f.code.value) return toast('Nombre y clave son obligatorios', 'err');
        const payload = {
          code: f.code.value, noiKey: f.noiKey.value || f.code.value, name: f.name.value, rfc: f.rfc.value,
          department: f.department.value, position: f.position.value, scheduleId: Number(f.scheduleId.value),
          deviceId: Number(f.deviceId.value), checadorUserId: f.checadorUserId.value,
          dailySalary: Number(f.dailySalary.value), hireDate: f.hireDate.value, bonusEligible: f.bonusEligible.checked,
        };
        try {
          if (isNew) await api.post('/employees', payload); else await api.put(`/employees/${emp.id}`, payload);
          toast(isNew ? 'Empleado creado' : 'Empleado actualizado', 'ok'); m.close(); reload();
        } catch (e) { toast(e.message, 'err'); }
      } }, isNew ? 'Crear' : 'Guardar'),
    ],
  });
}

function enrollFaceModal(emp) {
  const video = h('video', { autoplay: 'true', muted: 'true', playsinline: 'true', style: 'width:100%;max-width:320px;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:#111;transform:scaleX(-1)' });
  const status = h('div', { class: 'muted', style: 'font-size:13px;min-height:20px' }, 'Iniciando cámara…');
  const captureBtn = h('button', { class: 'btn btn-dark', disabled: true }, '📷 Capturar rostro');
  const saveBtn = h('button', { class: 'btn btn-primary', disabled: true }, 'Guardar registro');
  let captured = null; // { descriptor, photo }
  let stream = null;

  const body = h('div', { class: 'form-grid', style: 'align-items:center;text-align:center' },
    h('div', {}, video),
    status,
    h('div', { class: 'row', style: 'justify-content:center;gap:8px' }, captureBtn),
    h('div', { class: 'note-box', style: 'text-align:left' }, 'Encuadra el rostro del colaborador, bien iluminado y de frente. La captura genera una plantilla facial (128 valores) que se usará para el reconocimiento en el kiosco.'),
  );

  const footer = [
    emp.faceEnrolled ? h('button', { class: 'btn btn-danger', onClick: async () => {
      try { await api.del(`/employees/${emp.id}/face`); toast('Registro biométrico eliminado', 'ok'); cleanup(); m.close(); reload(); } catch (e) { toast(e.message, 'err'); }
    } }, 'Quitar registro') : null,
    h('button', { class: 'btn', onClick: () => { cleanup(); m.close(); } }, 'Cerrar'),
    saveBtn,
  ];

  const m = modal({ title: `Registro biométrico · ${emp.name}`, body, footer });

  function cleanup() { stopCamera(stream); stream = null; }
  // Garantiza apagar la cámara si el modal se cierra por la ✕ o el fondo.
  const guard = setInterval(() => { if (!document.body.contains(video)) { cleanup(); clearInterval(guard); } }, 500);

  captureBtn.onclick = async () => {
    captureBtn.disabled = true; status.textContent = 'Detectando rostro…';
    try {
      const face = await detectFace(video);
      if (!face) { status.innerHTML = '<span style="color:var(--err)">No se detectó un rostro. Acércate y vuelve a intentar.</span>'; captureBtn.disabled = false; return; }
      captured = { descriptor: face.descriptor, photo: snapshot(video) };
      status.innerHTML = '<span style="color:var(--ok)">✓ Rostro detectado. Puedes guardar el registro.</span>';
      saveBtn.disabled = false;
    } catch (e) { status.textContent = 'Error: ' + e.message; }
    captureBtn.disabled = false;
  };

  saveBtn.onclick = async () => {
    if (!captured) return;
    saveBtn.disabled = true; saveBtn.textContent = 'Guardando…';
    try {
      await api.post(`/employees/${emp.id}/face`, captured);
      toast('Registro biométrico guardado', 'ok'); cleanup(); m.close(); reload();
    } catch (e) { toast(e.message, 'err'); saveBtn.disabled = false; saveBtn.textContent = 'Guardar registro'; }
  };

  (async () => {
    if (!hasCamera()) { status.innerHTML = '<span style="color:var(--err)">La cámara no está disponible. Requiere HTTPS o localhost y permiso del navegador.</span>'; return; }
    try {
      stream = await startCamera(video);
      status.textContent = 'Cargando modelos de reconocimiento…';
      await faceReady();
      status.textContent = 'Listo. Encuadra el rostro y presiona “Capturar rostro”.';
      captureBtn.disabled = false;
    } catch (e) {
      status.innerHTML = `<span style="color:var(--err)">No se pudo iniciar la cámara: ${e.message}</span>`;
    }
  })();
}

function reload() { import('../router.js').then((r) => r.render()); }
