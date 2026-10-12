import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../radius/componentes/Icono';
import { leerSesion } from '../../../radius/types/sesion';
import { leerCatalogoLaboratorio, suscribirCatalogoLaboratorio, tiposLaboratorioActivos, type ConfiguracionLaboratorio } from '../../laboratorio/catalogoLaboratorio';
import { crearSolicitudLaboratorio, type SolicitudLaboratorio } from '../../laboratorio/almacenLaboratorio';
import '../../laboratorio/LaboratorioView.css';
import './SolicitudLaboratorioRecepcion.css';

export type PacienteSolicitudLaboratorio = { nombre: string; ci: string };

export function SolicitudLaboratorioRecepcion({ paciente, pacientes, onSeleccionar, onCerrar }: {
  paciente: PacienteSolicitudLaboratorio | null; pacientes: PacienteSolicitudLaboratorio[];
  onSeleccionar: (paciente: PacienteSolicitudLaboratorio) => void; onCerrar: () => void;
}) {
  const ventana = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialogo = ventana.current;
    const focoAnterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogo?.showModal();
    return () => { dialogo?.close(); document.body.style.overflow = overflowAnterior; focoAnterior?.focus(); };
  }, []);
  const [catalogo, setCatalogo] = useState<ConfiguracionLaboratorio>({ categorias: [], tipos: [] });
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [cambiarPaciente, setCambiarPaciente] = useState(!paciente);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [medico, setMedico] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [prioridad, setPrioridad] = useState<'normal' | 'urgente'>('normal');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [solicitud, setSolicitud] = useState<SolicitudLaboratorio | null>(null);

  useEffect(() => {
    const cargar = () => {
      try {
        const datos = leerCatalogoLaboratorio();
        setCatalogo(datos); setError('');
      } catch (e) { setError((e as Error).message); }
    };
    cargar(); return suscribirCatalogoLaboratorio(cargar);
  }, []);

  const activos = useMemo(() => tiposLaboratorioActivos(catalogo), [catalogo]);
  useEffect(() => {
    const siguientes = seleccion.filter(id => activos.some(t => t.id === id));
    if (siguientes.length !== seleccion.length) {
      setSeleccion(siguientes);
      setAviso('Se retiraron exámenes desactivados. Revisa la selección antes de generar la solicitud.');
    }
  }, [activos, seleccion]);
  const elegidos = activos.filter(t => seleccion.includes(t.id));
  const visibles = activos.filter(t => (!categoriaId || t.categoriaId === categoriaId)
    && `${t.codigo} ${t.nombre} ${t.tipoMuestra}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()));
  const grupos = catalogo.categorias.filter(c => c.activa).map(c => ({ ...c, tipos: visibles.filter(t => t.categoriaId === c.id) })).filter(c => c.tipos.length);
  const coincidencias = pacientes.filter(p => `${p.nombre} ${p.ci}`.toLocaleLowerCase().includes(busquedaPaciente.trim().toLocaleLowerCase()));
  const parametros = elegidos.reduce((total, t) => total + t.parametros.length, 0);
  const elegir = (id: string) => { setSeleccion(actual => actual.includes(id) ? actual.filter(i => i !== id) : [...actual, id]); setAviso(''); };
  const salir = () => { if (!solicitud && seleccion.length && !window.confirm('¿Cerrar y descartar la selección de exámenes?')) return; onCerrar(); };
  const generar = (e: FormEvent) => {
    e.preventDefault();
    if (guardando || solicitud) return;
    if (!paciente?.ci || cambiarPaciente) { setError('Selecciona el paciente al que pertenece la solicitud.'); return; }
    if (!elegidos.length) { setError('Selecciona al menos un examen.'); return; }
    setGuardando(true);
    try {
      const creada = crearSolicitudLaboratorio({ paciente: paciente.nombre, ci: paciente.ci, medico: medico.trim(), consultaId: `recepcion-${crypto.randomUUID()}` }, elegidos, 'ambulatorio', { procedencia: 'recepcion', indicaciones: indicaciones.trim(), prioridad, solicitadoPor: leerSesion()?.usuario.nombre || 'Recepción' });
      setSolicitud(creada); setError(''); setAviso('Solicitud generada. El paciente ya aparece en Laboratorio → Ambulatorios, como pendiente.');
    } catch (e) { setError((e as Error).message); }
    finally { setGuardando(false); }
  };

  return createPortal(<dialog ref={ventana} className="recepcion-lab-modal" aria-labelledby="recepcion-lab-titulo" onCancel={e => { e.preventDefault(); salir(); }}><section className="recepcion-lab" aria-label="Solicitud de laboratorio desde Recepción">
    <header className="recepcion-lab-cabecera"><div><span><Icon name="lab" size={23}/></span><div><h2 id="recepcion-lab-titulo">Solicitud de laboratorio</h2><p>Selecciona al paciente y los exámenes que necesita.</p></div></div><button type="button" className="lab-boton" aria-label="Cerrar solicitud de laboratorio" onClick={salir}><Icon name="close" size={18}/> Cerrar</button></header>
    <p className="recepcion-lab-local">Vista local · Usa los tipos activos configurados en Laboratorio. Esta solicitud no registra un cobro.</p>
    {aviso && <p className="lab-mensaje" role="status">{aviso}</p>}{error && <p className="lab-error" role="alert">{error}</p>}
    {solicitud ? <>
      <article className="recepcion-lab-comprobante" id="recepcion-lab-impresion"><header><div><h2>Orden de laboratorio</h2><p>Hospital María Esperanza</p></div><strong>LAB-{solicitud.id.slice(0, 8).toUpperCase()}</strong></header><dl><div><dt>Paciente</dt><dd>{solicitud.paciente}</dd></div><div><dt>CI</dt><dd>{solicitud.ci}</dd></div><div><dt>Médico solicitante</dt><dd>{solicitud.medico || 'No registrado'}</dd></div><div><dt>Fecha</dt><dd>{new Date(solicitud.fecha).toLocaleString('es-BO')}</dd></div><div><dt>Prioridad</dt><dd>{solicitud.prioridad === 'urgente' ? 'Urgente' : 'Normal'}</dd></div><div><dt>Registrado por</dt><dd>{solicitud.solicitadoPor}</dd></div></dl><table><thead><tr><th>Examen solicitado</th><th>Parámetros</th></tr></thead><tbody>{solicitud.estudios.map(t => <tr key={t.id}><td>{t.nombre}</td><td>{t.resultados.map(r => r.parametro).join(' · ')}</td></tr>)}</tbody></table>{solicitud.indicaciones && <p><strong>Diagnóstico / indicaciones:</strong> {solicitud.indicaciones}</p>}<footer>Solicitud local · Estado: pendiente · {solicitud.estudios.length} exámenes</footer></article>
      <div className="recepcion-lab-confirmacion"><button type="button" className="lab-boton" onClick={() => window.print()}><Icon name="fileText" size={16}/> Imprimir solicitud</button><button type="button" className="lab-boton principal" onClick={() => { setSolicitud(null); setSeleccion([]); setIndicaciones(''); setMedico(''); setPrioridad('normal'); setAviso(''); setBusqueda(''); setCategoriaId(''); }}>Nueva solicitud</button></div>
    </> : <form onSubmit={generar} className="recepcion-lab-formulario">
      <section className="recepcion-lab-paciente"><header><h3>Paciente de la solicitud</h3>{paciente && !cambiarPaciente && <button className="recepcion-lab-enlace" type="button" onClick={() => { setCambiarPaciente(true); setBusquedaPaciente(''); }}>Cambiar paciente</button>}</header>{paciente && !cambiarPaciente ? <div className="recepcion-lab-identidad"><Icon name="patient" size={22}/><div><strong>{paciente.nombre}</strong><small>CI {paciente.ci}</small></div><span>Ambulatorio</span></div> : <div className="recepcion-lab-buscar-paciente"><label>Buscar paciente por nombre o CI<input value={busquedaPaciente} onChange={e => setBusquedaPaciente(e.target.value)} placeholder="Escribe un nombre o documento"/></label>{busquedaPaciente.trim() ? <div className="recepcion-lab-coincidencias">{coincidencias.length ? coincidencias.map(p => <button key={p.ci} type="button" onClick={() => { onSeleccionar(p); setCambiarPaciente(false); setBusquedaPaciente(''); setError(''); }}><span><strong>{p.nombre}</strong><small>CI {p.ci}</small></span><Icon name="chevronRight" size={16}/></button>) : <p>No se encontraron pacientes con esa búsqueda.</p>}</div> : <p>Selecciona un paciente antes de generar la solicitud.</p>}{paciente && <button type="button" className="recepcion-lab-enlace" onClick={() => setCambiarPaciente(false)}>Conservar paciente actual</button>}</div>}</section>
      <div className="recepcion-lab-tablero"><section className="recepcion-lab-examenes"><header><h3>Exámenes disponibles</h3><span>{activos.length} tipos activos</span></header><div className="recepcion-lab-filtros"><label><span className="lab-sr">Buscar examen</span><Icon name="search" size={16}/><input aria-label="Buscar examen de laboratorio" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, código o muestra"/></label><select aria-label="Filtrar categoría de laboratorio" value={categoriaId} onChange={e => setCategoriaId(e.target.value)}><option value="">Todas las categorías</option>{catalogo.categorias.filter(c => c.activa).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
        {grupos.length ? <div className="recepcion-lab-grupos">{grupos.map(c => <section key={c.id}><header><h4>{c.nombre}</h4><small>{c.tipos.length} exámenes</small></header>{c.tipos.map(t => <label key={t.id} className={seleccion.includes(t.id) ? 'seleccionado' : ''}><input type="checkbox" checked={seleccion.includes(t.id)} onChange={() => elegir(t.id)}/><span><strong>{t.nombre}</strong><small>{t.codigo} · {t.tipoMuestra || 'Muestra sin especificar'} · {t.parametros.length} {t.parametros.length === 1 ? 'parámetro' : 'parámetros'}</small>{t.descripcion && <small>{t.descripcion}</small>}</span></label>)}</section>)}</div> : <div className="recepcion-lab-vacio"><Icon name="lab" size={26}/><strong>No hay exámenes disponibles con estos filtros</strong><p>{activos.length ? 'Cambia la búsqueda o categoría.' : 'Crea y activa los tipos desde Laboratorio → Tipos de laboratorio.'}</p></div>}
      </section><aside className="recepcion-lab-resumen"><header><h3>Resumen de solicitud</h3><span>{elegidos.length}</span></header>{elegidos.length ? <div className="recepcion-lab-seleccionados">{elegidos.map(t => <article key={t.id}><div><strong>{t.nombre}</strong><small>{t.codigo} · {t.parametros.length} parámetros</small></div><button type="button" aria-label={`Quitar ${t.nombre} de la solicitud`} onClick={() => elegir(t.id)}>×</button></article>)}<button className="recepcion-lab-enlace" type="button" onClick={() => setSeleccion([])}>Deseleccionar todos</button></div> : <p className="recepcion-lab-sin-seleccion">Marca los exámenes que se incluirán en la solicitud.</p>}
        <label>Médico solicitante<input value={medico} maxLength={120} onChange={e => setMedico(e.target.value)} placeholder="Nombre del médico (opcional)"/></label><label>Prioridad<select value={prioridad} onChange={e => setPrioridad(e.target.value as typeof prioridad)}><option value="normal">Normal</option><option value="urgente">Urgente</option></select></label><label>Diagnóstico / indicaciones<textarea value={indicaciones} maxLength={2000} onChange={e => setIndicaciones(e.target.value)} placeholder="Indicaciones para el laboratorio (opcional)"/></label><div className="recepcion-lab-conteo"><span>{elegidos.length} exámenes</span><strong>{parametros} parámetros</strong></div><button className="lab-boton principal recepcion-lab-generar" type="submit" disabled={!paciente?.ci || cambiarPaciente || !elegidos.length || guardando}>{guardando ? 'Generando…' : 'Generar solicitud de laboratorio'}</button><small className="recepcion-lab-pendiente">Se enviará a la bandeja de laboratorio con estado pendiente.</small>
      </aside></div>
    </form>}
  </section></dialog>, document.body);
}
