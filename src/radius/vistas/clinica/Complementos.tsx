import { useState, type FormEvent } from 'react';
import { confirmar, notificar } from '../../componentes/Notificaciones';
import './Complementos.css';

export function VistaInformes() {
  return <section className="clinica-complemento" />;
}

type Equipo = { id: string; nombre: string; sala: string; modalidad: string; estado: string };
const key = 'pulso_equipos_v1';
const vacio = { nombre: '', sala: '', modalidad: 'RX', estado: 'Operativo' };
export function VistaEquipos() {
  const [equipos, setEquipos] = useState<Equipo[]>(() => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } });
  const [form, setForm] = useState(vacio), [editing, setEditing] = useState<string | null>(null), [abierto, setAbierto] = useState(false), [query, setQuery] = useState('');
  function persistir(next: Equipo[]) { try { localStorage.setItem(key, JSON.stringify(next)); setEquipos(next); return true; } catch { notificar('error', 'No se pudo guardar', 'El almacenamiento del navegador no estÃ¡ disponible.'); return false; } }
  function guardar(event: FormEvent) { event.preventDefault(); const datos = { ...form, nombre: form.nombre.trim(), sala: form.sala.trim(), id: editing || crypto.randomUUID() }; if (!datos.nombre || !datos.sala) return; if (persistir(editing ? equipos.map(e => e.id === editing ? datos : e) : [...equipos, datos])) { setAbierto(false); setEditing(null); setForm(vacio); } }
  async function eliminar(equipo: Equipo) { if (await confirmar({ titulo: 'Eliminar equipo', mensaje: `Â¿Eliminar ${equipo.nombre}?`, peligrosa: true, textoConfirmar: 'Eliminar' })) persistir(equipos.filter(e => e.id !== equipo.id)); }
  return <section className="clinica-complemento"><h2>Equipos y salas</h2><p>Registro de equipos, ubicaciÃ³n y disponibilidad. Guardado en este navegador.</p><div className="clinica-acciones"><input aria-label="Buscar equipos" placeholder="Buscar equipo o sala" value={query} onChange={e => setQuery(e.target.value)}/><button onClick={() => { setForm(vacio); setEditing(null); setAbierto(true); }}>Nuevo equipo</button></div>{abierto && <form onSubmit={guardar} className="clinica-form"><h3>{editing ? 'Editar equipo' : 'Nuevo equipo'}</h3><label>Nombre<input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}/></label><label>Sala<input required value={form.sala} onChange={e => setForm({ ...form, sala: e.target.value })}/></label><label>Modalidad<select value={form.modalidad} onChange={e => setForm({ ...form, modalidad: e.target.value })}>{['RX', 'TC', 'RM', 'EcografÃ­a', 'Otro'].map(s => <option key={s}>{s}</option>)}</select></label><label>Estado<select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>{['Operativo', 'Mantenimiento', 'Fuera de servicio'].map(s => <option key={s}>{s}</option>)}</select></label><button type="submit">Guardar equipo</button><button type="button" onClick={() => setAbierto(false)}>Cancelar</button></form>}<div className="clinica-tabla"><table><thead><tr><th>Equipo</th><th>Sala</th><th>Modalidad</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{equipos.filter(e => `${e.nombre} ${e.sala}`.toLowerCase().includes(query.toLowerCase())).map(e => <tr key={e.id}><td>{e.nombre}</td><td>{e.sala}</td><td>{e.modalidad}</td><td>{e.estado}</td><td><button onClick={() => { setForm(e); setEditing(e.id); setAbierto(true); }}>Editar</button><button onClick={() => void eliminar(e)}>Eliminar</button></td></tr>)}</tbody></table></div>{!equipos.length && <p>No hay equipos registrados.</p>}</section>;
}

