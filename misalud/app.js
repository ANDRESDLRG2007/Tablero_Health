// ============================================================
// MiSalud — app.js
// Gestión de citas, órdenes, exámenes y medicamentos
// ============================================================

const DB_KEY = 'misalud_data';

// Estado inicial
function estadoDefault() {
  return {
    ordenes: [],
    medicamentos: [],
    examenes: [],
    fotos: []
  };
}

let estado = cargarEstado();

function cargarEstado() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : estadoDefault();
  } catch {
    return estadoDefault();
  }
}

function guardarEstado() {
  localStorage.setItem(DB_KEY, JSON.stringify(estado));
}

// ============================================================
// Utilidades de fecha
// ============================================================

function hoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function diasRestantes(fechaStr) {
  if (!fechaStr) return null;
  const vence = new Date(fechaStr + 'T00:00:00');
  const diff = vence - hoy();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function estadoFecha(dias) {
  if (dias === null) return 'ok';
  if (dias < 0) return 'expired';
  if (dias <= 7) return 'warn';
  return 'ok';
}

function badgeTexto(dias, tipo) {
  if (dias === null) return '';
  if (dias < 0) return 'Vencida';
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `${dias} días`;
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '';
  const [y, m, d] = fechaStr.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
}

// ============================================================
// Tabs
// ============================================================

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// Fecha de hoy en header
document.getElementById('fecha-hoy').textContent = new Date().toLocaleDateString('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});

// ============================================================
// Notificaciones
// ============================================================

document.getElementById('btn-notif').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    alert('Tu navegador no soporta notificaciones.');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    alert('✅ Notificaciones activadas. Recibirás alertas cuando se acerquen vencimientos.');
    programarNotificaciones();
  } else {
    alert('Notificaciones denegadas. Actívalas en la configuración del navegador.');
  }
});

function programarNotificaciones() {
  const items = [
    ...estado.ordenes.map(o => ({ nombre: `Orden: ${o.especialidad}`, fecha: o.fechaVencimiento })),
    ...estado.examenes.map(e => ({ nombre: `Examen: ${e.nombre}`, fecha: e.fechaVencimiento })),
    ...estado.medicamentos.map(m => ({ nombre: `Medicamento: ${m.nombre}`, fecha: m.fechaFin }))
  ];

  items.forEach(item => {
    const dias = diasRestantes(item.fecha);
    if (dias === null) return;

    if (dias === 3 && Notification.permission === 'granted') {
      new Notification('⚠️ MiSalud — Próximo a vencer', {
        body: `${item.nombre} vence en 3 días`,
        icon: '/favicon.ico'
      });
    }
    if (dias === 0 && Notification.permission === 'granted') {
      new Notification('🚨 MiSalud — Vence hoy', {
        body: `${item.nombre} vence hoy`,
        icon: '/favicon.ico'
      });
    }
  });
}

// Verificar notificaciones al cargar
if (Notification.permission === 'granted') {
  programarNotificaciones();
}

// ============================================================
// TABLERO
// ============================================================

function renderTablero() {
  const todas = [
    ...estado.ordenes.map(o => ({ ...o, _tipo: 'orden', _diasRestantes: diasRestantes(o.fechaVencimiento) })),
    ...estado.examenes.map(e => ({ ...e, _tipo: 'examen', _diasRestantes: diasRestantes(e.fechaVencimiento) }))
  ];

  const activas = todas.filter(i => i._diasRestantes !== null && i._diasRestantes >= 0).length;
  const porVencer = todas.filter(i => i._diasRestantes !== null && i._diasRestantes >= 0 && i._diasRestantes <= 7).length;
  const vencidas = todas.filter(i => i._diasRestantes !== null && i._diasRestantes < 0).length;
  const meds = estado.medicamentos.length;

  document.getElementById('metrics').innerHTML = `
    <div class="metric">
      <div class="metric-label">Órdenes activas</div>
      <div class="metric-value">${activas}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Por vencer (7 días)</div>
      <div class="metric-value ${porVencer > 0 ? 'warn' : ''}">${porVencer}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Vencidas</div>
      <div class="metric-value ${vencidas > 0 ? 'danger' : ''}">${vencidas}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Medicamentos</div>
      <div class="metric-value ok">${meds}</div>
    </div>
  `;

  // Ordenar por urgencia
  const ordenadas = [...todas].sort((a, b) => {
    if (a._diasRestantes === null) return 1;
    if (b._diasRestantes === null) return -1;
    return a._diasRestantes - b._diasRestantes;
  });

  const cont = document.getElementById('lista-tablero');

  if (ordenadas.length === 0) {
    cont.innerHTML = `<div class="empty-state"><div class="icon">📋</div>No hay órdenes ni exámenes registrados.</div>`;
    return;
  }

  cont.innerHTML = ordenadas.map(item => {
    const dias = item._diasRestantes;
    const st = estadoFecha(dias);
    const pct = dias === null ? 100 : Math.max(0, Math.min(100, 100 - (dias / 90 * 100)));
    const icono = item._tipo === 'orden' ? '📄' : '🧪';
    const subtitulo = item._tipo === 'orden' ? item.especialidad : item.nombre;
    const doctor = item._tipo === 'orden' ? (item.doctor ? `Dr./Dra. ${item.doctor}` : '') : (item.laboratorio || '');
    const fechaLabel = item._tipo === 'orden' ? item.fechaVencimiento : item.fechaVencimiento;

    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${icono} ${item._tipo === 'orden' ? 'Orden' : 'Examen'} — ${subtitulo}</div>
          <span class="badge ${st}">${badgeTexto(dias)}</span>
        </div>
        <div class="card-meta">
          ${doctor ? `<span>${doctor}</span>` : ''}
          ${fechaLabel ? `<span>Vence: ${formatFecha(fechaLabel)}</span>` : ''}
        </div>
        ${item.notas ? `<div style="font-size:12px;color:var(--text2);margin-top:6px;font-style:italic;">${item.notas}</div>` : ''}
        <div class="progress-bar">
          <div class="progress-fill ${st}" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  // También mostrar medicamentos próximos a terminar
  const medsCriticos = estado.medicamentos.filter(m => {
    const dias = diasRestantes(m.fechaFin);
    return dias !== null && dias <= 10;
  });

  if (medsCriticos.length > 0) {
    cont.innerHTML += `<h2 class="section-title" style="margin-top:16px">Medicamentos próximos a terminar</h2>`;
    cont.innerHTML += medsCriticos.map(m => {
      const dias = diasRestantes(m.fechaFin);
      const st = estadoFecha(dias);
      return `
        <div class="card">
          <div class="card-header">
            <div class="card-title">💊 ${m.nombre} ${m.dosis || ''}</div>
            <span class="badge ${st}">${badgeTexto(dias)}</span>
          </div>
          <div class="card-meta">
            <span>${m.frecuencia || ''}</span>
            ${m.fechaFin ? `<span>Termina: ${formatFecha(m.fechaFin)}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

// ============================================================
// ÓRDENES
// ============================================================

function renderOrdenes() {
  const cont = document.getElementById('lista-ordenes');
  if (estado.ordenes.length === 0) {
    cont.innerHTML = `<div class="empty-state"><div class="icon">📄</div>No hay órdenes registradas.</div>`;
    return;
  }
  cont.innerHTML = estado.ordenes.map((o, i) => {
    const dias = diasRestantes(o.fechaVencimiento);
    const st = estadoFecha(dias);
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📄 ${o.especialidad}</div>
          <span class="badge ${st}">${badgeTexto(dias)}</span>
        </div>
        <div class="card-meta">
          ${o.doctor ? `<span>Dr./Dra. ${o.doctor}</span>` : ''}
          ${o.fechaConsulta ? `<span>Consulta: ${formatFecha(o.fechaConsulta)}</span>` : ''}
          ${o.fechaVencimiento ? `<span>Vence: ${formatFecha(o.fechaVencimiento)}</span>` : ''}
        </div>
        ${o.notas ? `<div style="font-size:12px;color:var(--text2);margin-top:6px;">${o.notas}</div>` : ''}
        <div class="card-actions">
          <button class="btn-small" onclick="editarOrden(${i})">Editar</button>
          <button class="btn-small danger" onclick="eliminarOrden(${i})">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('btn-nueva-orden').addEventListener('click', () => {
  abrirModalOrden(null);
});

window.editarOrden = (i) => abrirModalOrden(i);

window.eliminarOrden = (i) => {
  if (confirm('¿Eliminar esta orden?')) {
    estado.ordenes.splice(i, 1);
    guardarEstado();
    renderOrdenes();
    renderTablero();
  }
};

function abrirModalOrden(idx) {
  const o = idx !== null ? estado.ordenes[idx] : {};
  document.getElementById('modal-titulo').textContent = idx !== null ? 'Editar orden' : 'Nueva orden / cita';
  document.getElementById('modal-contenido').innerHTML = `
    <div class="form-group">
      <label>Especialidad / tipo de cita *</label>
      <input id="f-especialidad" value="${o.especialidad || ''}" placeholder="Ej: Cardiología, Medicina general..." />
    </div>
    <div class="form-group">
      <label>Doctor/a</label>
      <input id="f-doctor" value="${o.doctor || ''}" placeholder="Nombre del médico" />
    </div>
    <div class="form-group">
      <label>Fecha de la consulta</label>
      <input type="date" id="f-fechaConsulta" value="${o.fechaConsulta || ''}" />
    </div>
    <div class="form-group">
      <label>Fecha límite para sacar la cita / vencimiento</label>
      <input type="date" id="f-fechaVencimiento" value="${o.fechaVencimiento || ''}" />
    </div>
    <div class="form-group">
      <label>Notas</label>
      <textarea id="f-notas" rows="3" placeholder="Indicaciones, instrucciones...">${o.notas || ''}</textarea>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');

  document.getElementById('modal-guardar').onclick = () => {
    const especialidad = document.getElementById('f-especialidad').value.trim();
    if (!especialidad) { alert('La especialidad es obligatoria.'); return; }
    const nuevo = {
      especialidad,
      doctor: document.getElementById('f-doctor').value.trim(),
      fechaConsulta: document.getElementById('f-fechaConsulta').value,
      fechaVencimiento: document.getElementById('f-fechaVencimiento').value,
      notas: document.getElementById('f-notas').value.trim()
    };
    if (idx !== null) {
      estado.ordenes[idx] = nuevo;
    } else {
      estado.ordenes.push(nuevo);
    }
    guardarEstado();
    cerrarModal();
    renderOrdenes();
    renderTablero();
  };
}

// ============================================================
// MEDICAMENTOS
// ============================================================

function renderMedicamentos() {
  const cont = document.getElementById('lista-medicamentos');
  if (estado.medicamentos.length === 0) {
    cont.innerHTML = `<div class="empty-state"><div class="icon">💊</div>No hay medicamentos registrados.</div>`;
    return;
  }
  cont.innerHTML = estado.medicamentos.map((m, i) => {
    const dias = diasRestantes(m.fechaFin);
    const st = estadoFecha(dias);
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">💊 ${m.nombre} ${m.dosis || ''}</div>
          <span class="badge ${st}">${dias !== null ? badgeTexto(dias) : 'Sin fecha'}</span>
        </div>
        <div class="card-meta">
          ${m.frecuencia ? `<span>📅 ${m.frecuencia}</span>` : ''}
          ${m.fechaInicio ? `<span>Inicio: ${formatFecha(m.fechaInicio)}</span>` : ''}
          ${m.fechaFin ? `<span>Fin: ${formatFecha(m.fechaFin)}</span>` : ''}
        </div>
        ${m.instrucciones ? `<div style="font-size:12px;color:var(--text2);margin-top:6px;">${m.instrucciones}</div>` : ''}
        <div class="card-actions">
          <button class="btn-small" onclick="editarMedicamento(${i})">Editar</button>
          <button class="btn-small danger" onclick="eliminarMedicamento(${i})">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('btn-nuevo-med').addEventListener('click', () => {
  abrirModalMedicamento(null);
});

window.editarMedicamento = (i) => abrirModalMedicamento(i);

window.eliminarMedicamento = (i) => {
  if (confirm('¿Eliminar este medicamento?')) {
    estado.medicamentos.splice(i, 1);
    guardarEstado();
    renderMedicamentos();
    renderTablero();
  }
};

function abrirModalMedicamento(idx) {
  const m = idx !== null ? estado.medicamentos[idx] : {};
  document.getElementById('modal-titulo').textContent = idx !== null ? 'Editar medicamento' : 'Nuevo medicamento';
  document.getElementById('modal-contenido').innerHTML = `
    <div class="form-group">
      <label>Nombre del medicamento *</label>
      <input id="f-nombre" value="${m.nombre || ''}" placeholder="Ej: Losartan, Metformina..." />
    </div>
    <div class="form-group">
      <label>Dosis</label>
      <input id="f-dosis" value="${m.dosis || ''}" placeholder="Ej: 50mg, 500mg..." />
    </div>
    <div class="form-group">
      <label>Frecuencia</label>
      <select id="f-frecuencia">
        <option value="">Seleccionar...</option>
        ${['1 vez al día','2 veces al día','3 veces al día','Cada 8 horas','Cada 12 horas','Solo en la mañana','Solo en la noche','Según necesidad'].map(f =>
          `<option ${m.frecuencia === f ? 'selected' : ''} value="${f}">${f}</option>`
        ).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Fecha de inicio</label>
      <input type="date" id="f-fechaInicio" value="${m.fechaInicio || ''}" />
    </div>
    <div class="form-group">
      <label>Fecha de fin / última dosis</label>
      <input type="date" id="f-fechaFin" value="${m.fechaFin || ''}" />
    </div>
    <div class="form-group">
      <label>Instrucciones del médico</label>
      <textarea id="f-instrucciones" rows="3" placeholder="Tomar con comida, no mezclar con...">${m.instrucciones || ''}</textarea>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');

  document.getElementById('modal-guardar').onclick = () => {
    const nombre = document.getElementById('f-nombre').value.trim();
    if (!nombre) { alert('El nombre es obligatorio.'); return; }
    const nuevo = {
      nombre,
      dosis: document.getElementById('f-dosis').value.trim(),
      frecuencia: document.getElementById('f-frecuencia').value,
      fechaInicio: document.getElementById('f-fechaInicio').value,
      fechaFin: document.getElementById('f-fechaFin').value,
      instrucciones: document.getElementById('f-instrucciones').value.trim()
    };
    if (idx !== null) {
      estado.medicamentos[idx] = nuevo;
    } else {
      estado.medicamentos.push(nuevo);
    }
    guardarEstado();
    cerrarModal();
    renderMedicamentos();
    renderTablero();
  };
}

// ============================================================
// EXÁMENES
// ============================================================

function renderExamenes() {
  const cont = document.getElementById('lista-examenes');
  if (estado.examenes.length === 0) {
    cont.innerHTML = `<div class="empty-state"><div class="icon">🧪</div>No hay exámenes registrados.</div>`;
    return;
  }
  cont.innerHTML = estado.examenes.map((e, i) => {
    const dias = diasRestantes(e.fechaVencimiento);
    const st = estadoFecha(dias);
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">🧪 ${e.nombre}</div>
          <span class="badge ${st}">${badgeTexto(dias)}</span>
        </div>
        <div class="card-meta">
          ${e.laboratorio ? `<span>🏥 ${e.laboratorio}</span>` : ''}
          ${e.fechaOrden ? `<span>Orden: ${formatFecha(e.fechaOrden)}</span>` : ''}
          ${e.fechaVencimiento ? `<span>Vence: ${formatFecha(e.fechaVencimiento)}</span>` : ''}
        </div>
        ${e.preparacion ? `<div style="font-size:12px;color:var(--text2);margin-top:6px;">⚠️ ${e.preparacion}</div>` : ''}
        <div class="card-actions">
          <button class="btn-small" onclick="editarExamen(${i})">Editar</button>
          <button class="btn-small danger" onclick="eliminarExamen(${i})">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('btn-nuevo-examen').addEventListener('click', () => {
  abrirModalExamen(null);
});

window.editarExamen = (i) => abrirModalExamen(i);

window.eliminarExamen = (i) => {
  if (confirm('¿Eliminar este examen?')) {
    estado.examenes.splice(i, 1);
    guardarEstado();
    renderExamenes();
    renderTablero();
  }
};

function abrirModalExamen(idx) {
  const e = idx !== null ? estado.examenes[idx] : {};
  document.getElementById('modal-titulo').textContent = idx !== null ? 'Editar examen' : 'Nuevo examen de laboratorio';
  document.getElementById('modal-contenido').innerHTML = `
    <div class="form-group">
      <label>Nombre del examen *</label>
      <input id="f-nombre" value="${e.nombre || ''}" placeholder="Ej: Hemograma, Glucosa, Ecografía..." />
    </div>
    <div class="form-group">
      <label>Laboratorio / centro médico</label>
      <input id="f-laboratorio" value="${e.laboratorio || ''}" placeholder="Nombre del laboratorio" />
    </div>
    <div class="form-group">
      <label>Fecha de la orden</label>
      <input type="date" id="f-fechaOrden" value="${e.fechaOrden || ''}" />
    </div>
    <div class="form-group">
      <label>Fecha de vencimiento de la orden</label>
      <input type="date" id="f-fechaVencimiento" value="${e.fechaVencimiento || ''}" />
    </div>
    <div class="form-group">
      <label>Preparación necesaria</label>
      <textarea id="f-preparacion" rows="2" placeholder="Ayuno, no tomar medicamentos antes...">${e.preparacion || ''}</textarea>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');

  document.getElementById('modal-guardar').onclick = () => {
    const nombre = document.getElementById('f-nombre').value.trim();
    if (!nombre) { alert('El nombre es obligatorio.'); return; }
    const nuevo = {
      nombre,
      laboratorio: document.getElementById('f-laboratorio').value.trim(),
      fechaOrden: document.getElementById('f-fechaOrden').value,
      fechaVencimiento: document.getElementById('f-fechaVencimiento').value,
      preparacion: document.getElementById('f-preparacion').value.trim()
    };
    if (idx !== null) {
      estado.examenes[idx] = nuevo;
    } else {
      estado.examenes.push(nuevo);
    }
    guardarEstado();
    cerrarModal();
    renderExamenes();
    renderTablero();
  };
}

// ============================================================
// MODAL — cerrar
// ============================================================

function cerrarModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-cancelar').addEventListener('click', cerrarModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) cerrarModal();
});

// ============================================================
// FOTOS
// ============================================================

document.getElementById('input-foto').addEventListener('change', (e) => {
  const archivos = Array.from(e.target.files);
  archivos.forEach(archivo => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      estado.fotos.push({
        id: Date.now() + Math.random(),
        nombre: archivo.name,
        fecha: new Date().toISOString().split('T')[0],
        data: ev.target.result
      });
      guardarEstado();
      renderFotos();
    };
    reader.readAsDataURL(archivo);
  });
  e.target.value = '';
});

let fotoSeleccionada = null;

function renderFotos() {
  const cont = document.getElementById('galeria-fotos');
  if (estado.fotos.length === 0) {
    cont.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">📷</div>No hay fotos guardadas aún.</div>`;
    return;
  }
  cont.innerHTML = estado.fotos.map((f, i) => `
    <div class="foto-card" onclick="verFoto(${i})">
      <img src="${f.data}" alt="${f.nombre}" loading="lazy" />
      <div class="foto-card-info">${f.nombre || 'Foto'}<br/>${formatFecha(f.fecha)}</div>
    </div>
  `).join('');
}

window.verFoto = (i) => {
  fotoSeleccionada = i;
  document.getElementById('foto-grande').src = estado.fotos[i].data;
  document.getElementById('modal-foto').classList.remove('hidden');
};

document.getElementById('btn-cerrar-foto').addEventListener('click', () => {
  document.getElementById('modal-foto').classList.add('hidden');
});

document.getElementById('btn-eliminar-foto').addEventListener('click', () => {
  if (fotoSeleccionada !== null && confirm('¿Eliminar esta foto?')) {
    estado.fotos.splice(fotoSeleccionada, 1);
    guardarEstado();
    renderFotos();
    document.getElementById('modal-foto').classList.add('hidden');
  }
});

document.getElementById('modal-foto').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-foto')) {
    document.getElementById('modal-foto').classList.add('hidden');
  }
});

// ============================================================
// Render inicial
// ============================================================

renderTablero();
renderOrdenes();
renderMedicamentos();
renderExamenes();
renderFotos();