import { useState, type FormEvent } from 'react';
import { leerCatalogoLaboratorio, tiposLaboratorioActivos } from '../laboratorio/catalogoLaboratorio';
import type { MedicamentoReceta } from './registroHistoria';
import './FavoritosPaquetes.css';

export type Paquete = { id: string; nombre: string; medicamentos: MedicamentoReceta[]; laboratorios: { id: string; nombre: string }[]; indicaciones: string[] };
const clave = (medico: string) => `clinico.paquetes.v1.${encodeURIComponent(medico.trim().toLowerCase())}`;
export function leerPaquetes(medico: string): Paquete[] {
  try { const datos = JSON.parse(localStorage.getItem(clave(medico)) || '[]'); return Array.isArray(datos) ? datos : []; } catch { return []; }
}
const medicamentoVacio = (): MedicamentoReceta => ({ id: crypto.randomUUID(), nombre: '', dosis: '', frecuencia: '', via: '', duracion: '', cantidad: '', indicaciones: '' });
const paqueteVacio = (): Paquete => ({ id: crypto.randomUUID(), nombre: '', medicamentos: [], laboratorios: [], indicaciones: [] });

export function FavoritosPaquetes({ medico }: { medico: string }) {
  const [paquetes, setPaquetes] = useState(() => leerPaquetes(medico));
  const [edicion, setEdicion] = useState<Paquete | null>(null);
  const [error, setError] = useState('');
  const laboratorios = tiposLaboratorioActivos(leerCatalogoLaboratorio());
  const guardar = (event: FormEvent) => {
    event.preventDefault(); if (!edicion) return;
    if (!edicion.medicamentos.length && !edicion.laboratorios.length && !edicion.indicaciones.some(i => i.trim())) { setError('Agrega al menos un medicamento, estudio o indicación.'); return; }
    if (edicion.medicamentos.some(m => !m.nombre.trim() || !m.dosis.trim() || !m.frecuencia.trim())) { setError('Completa el nombre, dosis y frecuencia de cada medicamento.'); return; }
    const limpio = { ...edicion, nombre: edicion.nombre.trim(), indicaciones: edicion.indicaciones.map(i => i.trim()).filter(Boolean) };
    const nuevos = [...paquetes.filter(p => p.id !== limpio.id), limpio];
    try { localStorage.setItem(clave(medico), JSON.stringify(nuevos)); setPaquetes(nuevos); setEdicion(null); setError(''); } catch { setError('No se pudo guardar el paquete en este navegador.'); }
  };
  const eliminar = (id: string) => { if (!window.confirm('¿Eliminar este paquete favorito?')) return; const nuevos = paquetes.filter(p => p.id !== id); try { localStorage.setItem(clave(medico), JSON.stringify(nuevos)); setPaquetes(nuevos); } catch { setError('No se pudo eliminar el paquete.'); } };
  return <section className="favoritos-paquetes panel"><header><div><p>FAVORITOS</p><h3>Paquetes de consulta</h3><small>Reúne tratamientos, laboratorios e indicaciones que utilizas con frecuencia.</small></div><button type="button" className="favoritos-primario" onClick={() => { setError(''); setEdicion(paqueteVacio()); }}>+ Crear paquete</button></header>
    {error && <p role="alert" className="favoritos-error">{error}</p>}
    {!paquetes.length && !edicion && <div className="favoritos-vacio"><strong>Aún no tienes paquetes</strong><p>Crea uno y podrás cargarlo durante una consulta.</p></div>}
    <div className="favoritos-lista">{paquetes.map(p => <article key={p.id}><h4>{p.nombre}</h4><p>{p.medicamentos.length} medicamentos · {p.laboratorios.length} laboratorios · {p.indicaciones.length} indicaciones</p><div><button type="button" onClick={() => { setError(''); setEdicion(structuredClone(p)); }}>Editar</button><button type="button" onClick={() => eliminar(p.id)}>Eliminar</button></div></article>)}</div>
    {edicion && <form className="favoritos-editor" onSubmit={guardar}><header><div><p>CONFIGURACIÓN</p><h3>Crear o editar paquete</h3></div><button type="button" onClick={() => { setEdicion(null); setError(''); }}>Cerrar</button></header><label>Nombre del paquete<input required value={edicion.nombre} onChange={e => setEdicion({ ...edicion, nombre: e.target.value })} placeholder="Ej. Paciente con diabetes" /></label>
      <section><div className="favoritos-titulo"><h4>Medicamentos</h4><button type="button" onClick={() => setEdicion({ ...edicion, medicamentos: [...edicion.medicamentos, medicamentoVacio()] })}>+ Añadir medicamento</button></div>{edicion.medicamentos.map((m, i) => <div className="favoritos-medicamento" key={m.id}>{(['nombre', 'dosis', 'frecuencia'] as const).map(campo => <label key={campo}>{campo === 'nombre' ? 'Medicamento' : campo === 'dosis' ? 'Dosis' : 'Frecuencia'}<input required value={m[campo]} onChange={e => setEdicion({ ...edicion, medicamentos: edicion.medicamentos.map((actual, indice) => indice === i ? { ...actual, [campo]: e.target.value } : actual) })} /></label>)}<button type="button" aria-label={`Quitar medicamento ${i + 1}`} onClick={() => setEdicion({ ...edicion, medicamentos: edicion.medicamentos.filter((_, indice) => indice !== i) })}>×</button></div>)}</section>
      <section><h4>Laboratorios</h4><div className="favoritos-laboratorios">{laboratorios.length ? laboratorios.map(l => <label key={l.id}><input type="checkbox" checked={edicion.laboratorios.some(item => item.id === l.id)} onChange={e => setEdicion({ ...edicion, laboratorios: e.target.checked ? [...edicion.laboratorios, { id: l.id, nombre: l.nombre }] : edicion.laboratorios.filter(item => item.id !== l.id) })} />{l.nombre}</label>) : <small>No hay estudios activos configurados en Laboratorio.</small>}</div></section>
      <section><div className="favoritos-titulo"><h4>Indicaciones y recomendaciones</h4><button type="button" onClick={() => setEdicion({ ...edicion, indicaciones: [...edicion.indicaciones, ''] })}>+ Añadir indicación</button></div>{edicion.indicaciones.map((indicacion, i) => <div className="favoritos-indicacion" key={i}><textarea value={indicacion} onChange={e => setEdicion({ ...edicion, indicaciones: edicion.indicaciones.map((valor, indice) => indice === i ? e.target.value : valor) })} placeholder="Escribe la indicación" /><button type="button" aria-label={`Quitar indicación ${i + 1}`} onClick={() => setEdicion({ ...edicion, indicaciones: edicion.indicaciones.filter((_, indice) => indice !== i) })}>×</button></div>)}</section><footer><button type="button" onClick={() => setEdicion(null)}>Cancelar</button><button className="favoritos-primario" type="submit">Guardar paquete</button></footer></form>}
  </section>;
}
