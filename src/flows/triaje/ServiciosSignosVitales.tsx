import { useEffect, useState } from 'react';
import { apiFetch } from '../../radius/api';
import Icon from '../../radius/componentes/Icono';
import type { SignoVitalConfig } from './ConfiguracionSignosVitalesView';

export type ServicioSignos = { id: string; nombre: string; descripcion: string; signos: string[] };
const url = '/api/v1/configuracion/servicios-signos-vitales';

export function useServiciosSignosVitales() {
  const [servicios, setServicios] = useState<ServicioSignos[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(url, { signal: controller.signal }).then(async (respuesta) => {
      if (!respuesta.ok) throw new Error('No se pudieron cargar las asignaciones de signos vitales.');
      const resultado = await respuesta.json();
      if (!controller.signal.aborted) setServicios(resultado.data);
    }).catch((fallo) => { if (!controller.signal.aborted) setError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar las asignaciones.'); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, []);
  async function guardar(id: string, signos: string[]) {
    const respuesta = await apiFetch(`${url}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ signos }) });
    if (!respuesta.ok) {
      const resultado = await respuesta.json().catch(() => ({}));
      throw new Error(resultado.message || 'No se pudieron guardar las asignaciones.');
    }
    setServicios(actuales => actuales.map(servicio => servicio.id === id ? { ...servicio, signos } : servicio));
  }
  return { servicios, cargando, error, guardar };
}

export function ServiciosSignosVitales({ signos, catalogo }: { signos: SignoVitalConfig[]; catalogo: ReturnType<typeof useServiciosSignosVitales> }) {
  const [activo, setActivo] = useState<ServicioSignos | null>(null);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const visibles = signos.filter(signo => `${signo.nombre} ${signo.unidad} ${signo.abreviatura}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()));

  async function guardar() {
    if (!activo) return;
    setGuardando(true); setError('');
    try {
      await catalogo.guardar(activo.id, seleccionados);
      setActivo(null); setMensaje('Asignaciones guardadas correctamente.');
    } catch (fallo) { setError(fallo instanceof Error ? fallo.message : 'No se pudieron guardar las asignaciones.'); }
    finally { setGuardando(false); }
  }

  if (catalogo.cargando) return <p role="status">Cargando servicios y asignaciones…</p>;
  if (catalogo.error) return <p role="alert">{catalogo.error}</p>;
  if (activo) return <section className="config-signos-asignacion">
    <button type="button" className="config-signos-volver" onClick={() => { setActivo(null); setError(''); }} disabled={guardando}><Icon name="chevronLeft" size={16} /> Volver a servicios</button>
    <header className="config-signos-datos-servicio"><div><span>Servicio de atención</span><h2>{activo.nombre}</h2><small>{activo.descripcion}</small></div><b>{seleccionados.length} signos seleccionados</b></header>
    <section className="servicio-signos-editor"><div className="servicio-signos-editor-cabecera"><div><strong>Selecciona los signos para este servicio</strong><p>Puedes agregar o quitar signos y guardar los cambios.</p></div><button type="button" onClick={() => void guardar()} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
      <label className="servicio-signos-busqueda"><Icon name="search" size={16} /><input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar signo vital" aria-label="Buscar signo vital" /></label>
      {error && <p role="alert" className="servicio-signos-error">{error}</p>}
      <div className="servicio-signos-opciones">{visibles.map(signo => <label key={signo.id} className="servicio-signos-opcion"><input type="checkbox" checked={seleccionados.includes(signo.id)} onChange={e => setSeleccionados(actual => e.target.checked ? [...actual, signo.id] : actual.filter(id => id !== signo.id))} /><span><strong>{signo.nombre}</strong><small>{signo.unidad} · {signo.abreviatura}</small></span></label>)}{!visibles.length && <p>No hay signos que coincidan con la búsqueda.</p>}</div>
    </section>
  </section>;
  return <><header><h2>Signos vitales por servicios de atención</h2></header>{mensaje && <p role="status">{mensaje}</p>}<section className="config-signos-lista config-signos-tabla-servicios"><header><div><strong>Servicios asistenciales</strong><small>Selecciona un servicio para elegir los signos que utilizará.</small></div></header><div className="config-signos-tabla"><div className="config-signos-encabezado config-signos-encabezado-servicios"><span>Servicio</span><span>Signos configurados</span><span>Acción</span></div>{catalogo.servicios.map(servicio => <article className="config-signos-fila-servicio" key={servicio.id}><strong>{servicio.nombre}</strong><b>{servicio.signos.filter(id => signos.some(signo => signo.id === id)).length} campos</b><button type="button" className="config-signos-accion-editar" onClick={() => { setActivo(servicio); setSeleccionados(servicio.signos.filter(id => signos.some(signo => signo.id === id))); setBusqueda(''); setMensaje(''); }}><Icon name="edit" size={15} /> Asignar signos</button></article>)}</div></section></>;
}
