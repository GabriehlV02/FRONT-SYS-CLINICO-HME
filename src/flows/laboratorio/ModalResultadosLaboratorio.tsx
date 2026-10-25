import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../radius/componentes/Icono';
import type { SolicitudLaboratorio } from './almacenLaboratorio';
import './ModalResultadosLaboratorio.css';

const fecha = (valor: string) => new Date(valor).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
const codigo = (s: SolicitudLaboratorio) => s.id.startsWith('ejemplo-') ? s.id.replace('ejemplo-', '').toUpperCase() : s.id.slice(0, 8).toUpperCase();
const estados = { pendiente: 'Pendiente', en_proceso: 'En proceso', completado: 'Terminado', anulado: 'Anulado' };

export function ModalResultadosLaboratorio({ ordenActual, seleccionada, solicitudes, onElegir, onCerrar, editorActual, editorHistorial, mensaje }: {
  ordenActual: SolicitudLaboratorio; seleccionada: SolicitudLaboratorio; solicitudes: SolicitudLaboratorio[];
  onElegir: (id: string) => void; onCerrar: () => void; editorActual: ReactNode; editorHistorial?: ReactNode; mensaje: string;
}) {
  const ventana = useRef<HTMLDialogElement>(null);
  const panelDerecho = useRef<HTMLDivElement>(null);
  const [busqueda, setBusqueda] = useState('');
  useEffect(() => {
    const dialogo = ventana.current;
    const focoAnterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialogo?.showModal();
    return () => {
      dialogo?.close(); document.body.style.overflow = overflowAnterior;
      if (focoAnterior?.isConnected) focoAnterior.focus();
      else document.querySelector<HTMLInputElement>('.laboratorio-vista .lab-busqueda input')?.focus();
    };
  }, []);
  useEffect(() => { panelDerecho.current?.scrollTo({ top: 0 }); }, [seleccionada.id]);
  const historial = solicitudes.filter(s => s.ci === ordenActual.ci).sort((a, b) => a.id === ordenActual.id ? -1 : b.id === ordenActual.id ? 1 : b.fecha.localeCompare(a.fecha));
  const visibles = historial.filter(s => `${codigo(s)} ${s.medico} ${s.estudios.map(e => e.nombre).join(' ')} ${estados[s.estado]}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()));
  const viendoActual = seleccionada.id === ordenActual.id;
  return createPortal(<dialog ref={ventana} className="lab-resultados-modal" aria-labelledby="lab-resultados-modal-titulo" onCancel={e => { e.preventDefault(); onCerrar(); }}>
    <header className="lab-resultados-modal-cabecera"><div><span className="lab-resultados-modal-icono"><Icon name="lab" size={22}/></span><div><h2 id="lab-resultados-modal-titulo">Órdenes y resultados de laboratorio</h2><p>{ordenActual.paciente} <span>CI {ordenActual.ci}</span></p></div></div><button type="button" className="lab-resultados-modal-cerrar" aria-label="Cerrar órdenes y resultados" onClick={onCerrar}><Icon name="close" size={21}/></button></header>
    <div className="lab-resultados-modal-columnas"><aside className="lab-resultados-modal-historial" aria-label="Historial de órdenes del paciente"><header><h3>Historial de órdenes</h3><span>{historial.length}</span></header><label className="lab-resultados-modal-busqueda"><Icon name="search" size={15}/><input aria-label="Buscar en el historial de laboratorio" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Código, estudio o estado"/></label><nav aria-label="Órdenes del paciente">{visibles.map(s => <button key={s.id} type="button" className={`lab-resultados-modal-orden ${s.id === seleccionada.id ? 'seleccionada' : ''}`} aria-pressed={s.id === seleccionada.id} aria-label={`Abrir orden ${codigo(s)}`} onClick={() => onElegir(s.id)}><div><strong>#{codigo(s)}</strong><span className={`lab-estado ${s.estado}`}>{estados[s.estado]}</span></div><time>{fecha(s.fecha)}</time><span className="lab-resultados-modal-estudios">{s.estudios.map(e => e.nombre).join(' · ')}</span><small>{s.origen === 'ambulatorio' ? 'Ambulatorio' : 'Internación'} · {s.medico || 'Sin médico registrado'}</small><span className={`lab-resultados-modal-indicador ${s.id === ordenActual.id ? 'actual' : ''}`}>{s.id === ordenActual.id ? 'Orden seleccionada para cargar' : 'Consultar resultados' }<Icon name="chevronRight" size={15}/></span></button>)}</nav>{!visibles.length && <p className="lab-resultados-modal-vacio">No hay órdenes con esa búsqueda.</p>}</aside>
      <div ref={panelDerecho} className="lab-resultados-modal-contenido"><div className="lab-resultados-modal-contexto"><div><span>{viendoActual ? 'Orden seleccionada' : 'Consulta del historial'}</span><strong>#{codigo(seleccionada)}</strong></div>{!viendoActual && <button type="button" className="lab-boton" onClick={() => onElegir(ordenActual.id)}>Volver a la orden en carga</button>}</div>{!viendoActual && <p className="lab-resultados-modal-aviso">Estás viendo una orden anterior de solo lectura. La carga de la orden actual se conserva mientras consultas el historial.</p>}{mensaje && viendoActual && <p className="lab-mensaje" role="status">{mensaje}</p>}<div hidden={!viendoActual}>{editorActual}</div>{!viendoActual && editorHistorial}</div>
    </div>
  </dialog>, document.body);
}
