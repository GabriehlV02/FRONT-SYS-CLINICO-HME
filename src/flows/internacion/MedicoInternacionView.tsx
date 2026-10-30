import { useInternacionesVinculadas } from './useInternacionesVinculadas';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Icon from '../../radius/componentes/Icono';
import { leerInternaciones, registrarAltaInternacion, suscribirInternaciones, type RegistroInternacion } from './registroInternaciones';
import { InternacionModal } from '../recepcion/subvistas/InternacionModal';
import { HistoriaHojeable, type PacienteHistoria } from '../consultorio/ConsultorioView';
import { HojaLaboratorios } from '../consultorio/HojaLaboratorios';
import { crearSolicitudLaboratorio } from '../laboratorio/almacenLaboratorio';
import './MedicoInternacionView.css';
import './MedicoInternacionAtencionTabs.css';
import './MedicoInternacionAtencionLayout.css';
import './MedicoInternacionAcciones.css';
import './ResumenSignosAcciones.css';
import './ResumenBalanceAcciones.css';
import './OrdenMedicaDialogo.css';

type Subvista = 'internados' | 'altas';
type TipoOrdenMedica = 'medicamentos' | 'laboratorio' | 'imagenologia';
type OrdenMedica = { id: number; tipo: TipoOrdenMedica; detalle: string; fecha: string };
const signosGrafica = [
  { nombre: 'Temperatura', puntos: '55,66 775,176', color: '#087fc0' },
  { nombre: 'Frec. cardíaca', puntos: '55,146 775,86', color: '#ec7a42' },
  { nombre: 'Frec. respiratoria', puntos: '55,116 775,133', color: '#7655c5' },
  { nombre: 'Presión sistólica', puntos: '55,92 775,56', color: '#18a17e' },
  { nombre: 'Presión diastólica', puntos: '55,159 775,129', color: '#db7a51' },
  { nombre: 'Saturación', puntos: '55,48 775,64', color: '#0c9e88' },
  { nombre: 'Glicemia', puntos: '55,104 775,146', color: '#9a6bc3' },
  { nombre: 'Peso', puntos: '55,78 775,82', color: '#547e9b' },
];

const nombreTipoOrden: Record<TipoOrdenMedica, string> = {
  medicamentos: 'Medicamentos',
  laboratorio: 'Laboratorio',
  imagenologia: 'Imagenología',
};

const fecha = (valor?: string) => valor || 'Sin registro';
const correspondeAlMesActual = (valor?: string) => {
  if (!valor) return false;
  const partes = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const fechaRegistro = partes ? new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1])) : new Date(valor);
  const hoy = new Date();
  return !Number.isNaN(fechaRegistro.getTime()) && fechaRegistro.getMonth() === hoy.getMonth() && fechaRegistro.getFullYear() === hoy.getFullYear();
};

export function MedicoInternacionView({ subvista }: { subvista: Subvista }) {
  const registros = useInternacionesVinculadas();
  const [busqueda, setBusqueda] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<RegistroInternacion | null>(null);
  const [atencionActiva, setAtencionActiva] = useState<RegistroInternacion | null>(null);
  const [internandoPaciente, setInternandoPaciente] = useState(false);
  const [historiaClinicaAbierta, setHistoriaClinicaAbierta] = useState(false);
  const [subvistaAtencion, setSubvistaAtencion] = useState<'evolucion' | 'atencion' | 'resultados' | 'historia'>('atencion');
  const [busquedaOrden, setBusquedaOrden] = useState('');
  const [filtroOrden, setFiltroOrden] = useState<'todas' | TipoOrdenMedica>('todas');
  const [tipoNuevaOrden, setTipoNuevaOrden] = useState<TipoOrdenMedica | null>(null);
  const [detalleNuevaOrden, setDetalleNuevaOrden] = useState('');
  const [ordenesMedicas, setOrdenesMedicas] = useState<OrdenMedica[]>([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenMedica | null>(null);
  const [evolucionSignosAbierta, setEvolucionSignosAbierta] = useState(false);
  const [registroSignosAbierto, setRegistroSignosAbierto] = useState(false);
  const [signosEnVista, setSignosEnVista] = useState<string[]>(['Temperatura']);
  const internados = registros.filter(registro => registro.estado === 'confirmada');
  const altas = registros.filter(registro => registro.estado === 'alta' && correspondeAlMesActual(registro.fechaAlta));
  const fuente = subvista === 'internados' ? internados : altas;
  useEffect(() => { if (subvista === 'altas') setAtencionActiva(null); }, [subvista]);
  useEffect(() => {
    const abrirRegistroDeSignos = (evento: MouseEvent) => {
      const boton = (evento.target as HTMLElement).closest<HTMLButtonElement>('.internacion-grafica-acciones button.primario');
      if (boton?.textContent?.includes('Registrar signos')) setRegistroSignosAbierto(true);
    };
    document.addEventListener('click', abrirRegistroDeSignos);
    return () => document.removeEventListener('click', abrirRegistroDeSignos);
  }, []);
  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    if (!termino) return fuente;
    return fuente.filter(registro => `${registro.paciente} ${registro.ci} ${registro.sala} ${registro.cama} ${registro.motivo}`.toLocaleLowerCase('es').includes(termino));
  }, [busqueda, fuente]);
  const darAlta = (registro: RegistroInternacion) => {
    if (!window.confirm(`¿Registrar el alta de ${registro.paciente}? El paciente se moverá al listado de altas.`)) return;
    registrarAltaInternacion(registro.id);
  };
  const ordenesVisibles = useMemo(() => {
    const termino = busquedaOrden.trim().toLocaleLowerCase('es');
    return ordenesMedicas.filter(orden => (filtroOrden === 'todas' || orden.tipo === filtroOrden) && (!termino || `${nombreTipoOrden[orden.tipo]} ${orden.detalle}`.toLocaleLowerCase('es').includes(termino)));
  }, [busquedaOrden, filtroOrden, ordenesMedicas]);
  const abrirNuevaOrden = (tipo: TipoOrdenMedica) => {
    setTipoNuevaOrden(tipo);
    setDetalleNuevaOrden('');
  };
  const registrarOrden = () => {
    if (!tipoNuevaOrden || !detalleNuevaOrden.trim()) return;
    setOrdenesMedicas(ordenes => [{ id: Date.now(), tipo: tipoNuevaOrden, detalle: detalleNuevaOrden.trim(), fecha: new Date().toLocaleDateString('es-BO') }, ...ordenes]);
    setDetalleNuevaOrden('');
    setTipoNuevaOrden(null);
  };
  const alternarSignoEnVista = (signo: string) => setSignosEnVista(actual => actual.includes(signo) ? actual.filter(valor => valor !== signo) : [...actual, signo]);

  if (atencionActiva && subvista === 'internados') {
    const pacienteActual = registros.find(registro => registro.id === atencionActiva.id) || atencionActiva;
    const datos = pacienteActual.datosPaciente || {};
    const responsable = datos.responsableNombre || datos.responsable || 'Sin registrar';
    const telefonoResponsable = datos.responsableTelefono || 'Sin teléfono registrado';
    return <section className="internacion-atencion-activa" aria-label="Atención médica de paciente internado">
      <button type="button" className="internacion-volver-listado" onClick={() => setAtencionActiva(null)}><Icon name="chevronLeft" size={17}/> Volver a pacientes internados</button>
      <section className="internacion-atencion-info" aria-label="Información de atención del paciente"><header className="internacion-atencion-cabecera"><div><h2>{pacienteActual.paciente}</h2><span>| HC-{pacienteActual.ci || 'S/R'} · Internado</span></div><div className="internacion-atencion-contexto"><div className="internacion-atencion-ingreso"><span>Fecha de ingreso</span><strong>{fecha(pacienteActual.fechaIngreso || pacienteActual.fecha)}</strong></div><div className="internacion-atencion-ubicacion"><span>Ubicación actual</span><strong>Sala {pacienteActual.sala || '—'} · Cama {pacienteActual.cama || '—'}</strong></div></div></header><section className="internacion-atencion-datos"><article><span><Icon name="patient" size={17}/></span><div><small>Familiar responsable</small><strong>{responsable} · {telefonoResponsable}</strong></div></article><article><span><Icon name="userCheck" size={17}/></span><div><small>Médico responsable</small><strong>{pacienteActual.medico || 'Sin asignar'}</strong></div></article><article><span><Icon name="fileText" size={17}/></span><div><small>Diagnóstico de ingreso</small><strong>{pacienteActual.motivo || 'Sin registro'}</strong></div></article></section></section>
      <section className="internacion-subvistas" aria-label="Atención del paciente">
        <nav className="internacion-subvistas-tabs" aria-label="Secciones de atención">
          <button type="button" className={subvistaAtencion === 'atencion' ? 'activa' : ''} onClick={() => setSubvistaAtencion('atencion')}><Icon name="userCheck" size={16}/> Atención</button>
          <button type="button" className={subvistaAtencion === 'evolucion' ? 'activa' : ''} onClick={() => setSubvistaAtencion('evolucion')}><Icon name="fileText" size={16}/> Evolución</button>
          <button type="button" className={subvistaAtencion === 'resultados' ? 'activa' : ''} onClick={() => setSubvistaAtencion('resultados')}><Icon name="lab" size={16}/> Resultados</button>
          <button type="button" className={subvistaAtencion === 'historia' ? 'activa' : ''} onClick={() => setSubvistaAtencion('historia')}><Icon name="fileText" size={16}/> Historia clínica</button>
        </nav>
        {subvistaAtencion === 'evolucion' && <article className="internacion-evolucion-panel" aria-label="Evolución clínica del paciente"><header><div><span>EVOLUCIÓN CLÍNICA</span><h3>Seguimiento del paciente</h3><p>Comportamiento de los signos vitales y el balance hídrico durante la internación.</p></div></header><section className="internacion-grafica" aria-label="Evolución de signos vitales"><div className="internacion-grafica-titulo"><div><h4>Signos vitales</h4><small>Últimas 24 horas</small></div><div className="internacion-grafica-leyenda"><span className="temperatura">Temperatura</span><span className="frecuencia">Frecuencia cardíaca</span><span className="saturacion">Saturación O₂</span></div></div><div className="internacion-grafica-contenido"><div className="internacion-grafica-cuerpo"><div className="internacion-grafica-y"><span>Alto</span><span>Normal</span><span>Bajo</span></div><svg viewBox="0 0 720 180" role="img" aria-label="Gráfico de evolución de signos vitales"><g className="internacion-grafica-guia"><path d="M0 20H720M0 90H720M0 160H720"/></g><polyline className="linea-temperatura" points="20,101 155,88 290,96 425,70 560,80 700,67"/><polyline className="linea-frecuencia" points="20,76 155,98 290,64 425,84 560,56 700,75"/><polyline className="linea-saturacion" points="20,45 155,51 290,39 425,47 560,33 700,41"/><g className="puntos-temperatura"><circle cx="20" cy="101" r="4"/><circle cx="155" cy="88" r="4"/><circle cx="290" cy="96" r="4"/><circle cx="425" cy="70" r="4"/><circle cx="560" cy="80" r="4"/><circle cx="700" cy="67" r="4"/></g></svg><div className="internacion-grafica-x"><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>00:00</span><span>04:00</span></div></div><aside className="internacion-grafica-acciones"><span>ACCIONES</span><button type="button" className="primario"><Icon name="plus" size={15}/> Registrar signos</button><button type="button" onClick={() => setEvolucionSignosAbierta(true)}><Icon name="fileText" size={15}/> Ver historial</button></aside></div></section><section className="internacion-grafica" aria-label="Evolución de balance hídrico"><div className="internacion-grafica-titulo"><div><h4>Balance hídrico</h4><small>Ingresos, egresos y balance acumulado</small></div><div className="internacion-grafica-leyenda"><span className="ingreso">Ingresos</span><span className="egreso">Egresos</span><span className="balance">Balance</span></div></div><div className="internacion-grafica-contenido"><div className="internacion-balance-cuerpo"><div className="internacion-balance-barras"><div><i style={{height: '54%'}}/><b style={{height: '35%'}}/><span>08 h</span></div><div><i style={{height: '78%'}}/><b style={{height: '59%'}}/><span>12 h</span></div><div><i style={{height: '61%'}}/><b style={{height: '69%'}}/><span>16 h</span></div><div><i style={{height: '88%'}}/><b style={{height: '48%'}}/><span>20 h</span></div><div><i style={{height: '48%'}}/><b style={{height: '63%'}}/><span>00 h</span></div><div><i style={{height: '71%'}}/><b style={{height: '50%'}}/><span>04 h</span></div></div><div className="internacion-balance-resumen"><span>Balance acumulado</span><strong>+ 320 ml</strong><small>Dentro del rango esperado</small></div></div><aside className="internacion-grafica-acciones"><span>ACCIONES</span><button type="button" className="primario"><Icon name="plus" size={15}/> Registrar balance</button><button type="button"><Icon name="fileText" size={15}/> Ver historial</button></aside></div></section></article>}
        {subvistaAtencion === 'atencion' && <article className="internacion-ordenes-panel" aria-label="Órdenes médicas">
          <header className="internacion-ordenes-cabecera"><div><span>ÓRDENES MÉDICAS</span><h3>Indicaciones para {pacienteActual.paciente}</h3></div><label className="internacion-ordenes-buscador"><Icon name="search" size={17}/><input value={busquedaOrden} onChange={evento => setBusquedaOrden(evento.target.value)} placeholder="Buscar una orden médica" aria-label="Buscar orden médica" />{busquedaOrden && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusquedaOrden('')}><Icon name="close" size={14}/></button>}</label></header>
          <div className="internacion-ordenes-acciones"><button type="button" className="orden-medicamentos" onClick={() => abrirNuevaOrden('medicamentos')}><Icon name="fileText" size={17}/> Medicamentos</button><button type="button" className="orden-laboratorio" onClick={() => abrirNuevaOrden('laboratorio')}><Icon name="lab" size={17}/> Orden de laboratorio</button><button type="button" className="orden-imagenologia" onClick={() => abrirNuevaOrden('imagenologia')}><Icon name="image" size={17}/> Orden de imagenología</button></div>
          <div className="internacion-ordenes-contenido">
            <div className="internacion-ordenes-listado"><div className="internacion-ordenes-listado-cabecera"><div><strong>Historial de indicaciones</strong><small>Consulta y filtra todas las órdenes registradas.</small></div><div role="group" aria-label="Filtrar órdenes"><button type="button" className={filtroOrden === 'todas' ? 'activa' : ''} onClick={() => setFiltroOrden('todas')}>Todas</button><button type="button" className={filtroOrden === 'medicamentos' ? 'activa' : ''} onClick={() => setFiltroOrden('medicamentos')}>Medicamentos</button><button type="button" className={filtroOrden === 'laboratorio' ? 'activa' : ''} onClick={() => setFiltroOrden('laboratorio')}>Laboratorio</button><button type="button" className={filtroOrden === 'imagenologia' ? 'activa' : ''} onClick={() => setFiltroOrden('imagenologia')}>Imagenología</button></div></div>
              {ordenesVisibles.length ? <ul>{ordenesVisibles.map(orden => <li key={orden.id}><button type="button" className="internacion-orden-seleccionable" onClick={() => setOrdenSeleccionada(orden)}><span className={`tipo-${orden.tipo}`}><Icon name={orden.tipo === 'laboratorio' ? 'lab' : orden.tipo === 'imagenologia' ? 'image' : 'fileText'} size={16}/></span><div><strong>{nombreTipoOrden[orden.tipo]}</strong><small>{orden.detalle}</small></div><time>{orden.fecha}</time><Icon name="chevronRight" size={17}/></button></li>)}</ul> : <div className="internacion-ordenes-vacio"><Icon name="fileText" size={22}/><span>{busquedaOrden || filtroOrden !== 'todas' ? 'No se encontraron órdenes con este filtro.' : 'Aún no hay órdenes médicas registradas.'}</span></div>}
            </div>
            <aside className="internacion-ordenes-activas" aria-label="Órdenes activas del paciente"><header><div><span>ACTIVAS</span><h4>Órdenes del paciente</h4></div><b>{ordenesMedicas.length}</b></header>{ordenesMedicas.length ? <ul>{ordenesMedicas.map(orden => <li key={orden.id}><span className={`tipo-${orden.tipo}`}><Icon name={orden.tipo === 'laboratorio' ? 'lab' : orden.tipo === 'imagenologia' ? 'image' : 'fileText'} size={14}/></span><div><strong>{nombreTipoOrden[orden.tipo]}</strong><small>{orden.detalle}</small></div></li>)}</ul> : <div className="internacion-ordenes-activas-vacio"><Icon name="check" size={20}/><span>Las órdenes activas aparecerán aquí.</span></div>}</aside>
          </div>
          {tipoNuevaOrden && tipoNuevaOrden !== 'laboratorio' && <div className="internacion-nueva-orden" role="dialog" aria-label={`Registrar orden de ${nombreTipoOrden[tipoNuevaOrden].toLocaleLowerCase('es')}`}><div><strong>Nueva orden: {nombreTipoOrden[tipoNuevaOrden]}</strong><button type="button" aria-label="Cancelar" onClick={() => setTipoNuevaOrden(null)}><Icon name="close" size={16}/></button></div><textarea value={detalleNuevaOrden} onChange={evento => setDetalleNuevaOrden(evento.target.value)} placeholder={tipoNuevaOrden === 'medicamentos' ? 'Ej.: Paracetamol 500 mg, vía oral, cada 8 horas.' : 'Describe el estudio o la indicación médica.'} autoFocus /><footer><button type="button" onClick={() => setTipoNuevaOrden(null)}>Cancelar</button><button type="button" className="primario" onClick={registrarOrden} disabled={!detalleNuevaOrden.trim()}><Icon name="plus" size={16}/> Registrar orden</button></footer></div>}
          {ordenSeleccionada && <div className="orden-medica-dialogo-fondo" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setOrdenSeleccionada(null); }}><section className="orden-medica-dialogo" role="dialog" aria-modal="true" aria-labelledby="orden-medica-dialogo-titulo"><header><span className={`tipo-${ordenSeleccionada.tipo}`}><Icon name={ordenSeleccionada.tipo === 'laboratorio' ? 'lab' : ordenSeleccionada.tipo === 'imagenologia' ? 'image' : 'fileText'} size={20}/></span><div><p>ORDEN MÉDICA</p><h3 id="orden-medica-dialogo-titulo">{nombreTipoOrden[ordenSeleccionada.tipo]}</h3><small>{ordenSeleccionada.fecha}</small></div><button type="button" aria-label="Cerrar detalle de orden" onClick={() => setOrdenSeleccionada(null)}><Icon name="close" size={18}/></button></header><div className="orden-medica-dialogo-contenido"><p>Este espacio está preparado para el detalle y las acciones de la orden.</p></div><footer><button type="button" onClick={() => setOrdenSeleccionada(null)}>Cerrar</button></footer></section></div>}
        </article>}
        {subvistaAtencion === 'resultados' && <article className="internacion-resultados-panel" aria-label="Resultados clínicos"><header><div><span>RESULTADOS CLÍNICOS</span><h3>Estudios disponibles del paciente</h3><p>Consulta los informes y resultados emitidos durante la internación.</p></div></header><div className="internacion-resultados-grid"><section className="internacion-resultado-tarjeta laboratorio"><header><span><Icon name="lab" size={20}/></span><div><h4>Resultados de laboratorio</h4><small>Hematología, bioquímica y otros análisis</small></div></header><div className="internacion-resultado-vacio"><Icon name="lab" size={25}/><strong>Sin resultados de laboratorio</strong><p>Los análisis validados aparecerán aquí.</p></div><footer><button type="button"><Icon name="lab" size={16}/> Ver resultados de laboratorio</button></footer></section><section className="internacion-resultado-tarjeta imagenologia"><header><span><Icon name="image" size={20}/></span><div><h4>Resultados de imagenología</h4><small>Radiografías, ecografías y estudios por imagen</small></div></header><div className="internacion-resultado-vacio"><Icon name="image" size={25}/><strong>Sin resultados de imagenología</strong><p>Los informes e imágenes disponibles aparecerán aquí.</p></div><footer><button type="button"><Icon name="image" size={16}/> Ver resultados de imagenología</button></footer></section></div></article>}
        {subvistaAtencion === 'historia' && <article className="internacion-historia-panel" aria-label="Resumen de historia clínica"><header><div><span>HISTORIA CLÍNICA</span><h3>Antecedentes y registros del paciente</h3><p>Consulta la información clínica disponible durante esta atención.</p></div><button type="button" onClick={() => setHistoriaClinicaAbierta(true)}><Icon name="fileText" size={16}/> Ver historia clínica completa</button></header><div className="internacion-historia-grid"><section className="internacion-historia-alertas"><h4>Alertas y antecedentes</h4><div><span>ALERGIAS</span><strong>Sin alergias registradas</strong></div><div><span>ANTECEDENTES RELEVANTES</span><strong>Sin antecedentes relevantes registrados</strong></div><div><span>DIAGNÓSTICO DE INGRESO</span><strong>{pacienteActual.motivo || 'Sin diagnóstico registrado'}</strong></div></section><section className="internacion-historia-registros"><header><h4>Últimos registros clínicos</h4><small>Vista previa de la historia</small></header><ul><li><time>Hoy</time><div><strong>Ingreso a internación</strong><small>Sala {pacienteActual.sala || '—'} · Cama {pacienteActual.cama || '—'}</small></div></li><li><time>{fecha(pacienteActual.fechaIngreso || pacienteActual.fecha)}</time><div><strong>Registro de admisión</strong><small>Paciente admitido por {pacienteActual.medico || 'médico responsable'}.</small></div></li></ul></section></div></article>}
      </section>
      {registroSignosAbierto && <div className="registro-signos-fondo" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setRegistroSignosAbierto(false); }}>
        <form className="registro-signos-dialogo" role="dialog" aria-modal="true" aria-labelledby="registro-signos-titulo" onSubmit={evento => { evento.preventDefault(); setRegistroSignosAbierto(false); }}>
          <header><div><span>REGISTRO CLÍNICO</span><h3 id="registro-signos-titulo">Registrar signos vitales</h3><small>{pacienteActual.paciente} · Completa las mediciones actuales.</small></div><button type="button" aria-label="Cerrar registro de signos" onClick={() => setRegistroSignosAbierto(false)}><Icon name="close" size={18}/></button></header>
          <div className="registro-signos-campos">
            <label>Temperatura (°C)<input name="temperatura" type="number" min="30" max="45" step="0.1" placeholder="Ej. 36.8" required /></label>
            <label>Frecuencia cardíaca (lpm)<input name="frecuenciaCardiaca" type="number" min="20" max="250" placeholder="Ej. 78" required /></label>
            <label>Frecuencia respiratoria (rpm)<input name="frecuenciaRespiratoria" type="number" min="5" max="80" placeholder="Ej. 18" required /></label>
            <label>Saturación de O₂ (%)<input name="saturacion" type="number" min="50" max="100" placeholder="Ej. 98" required /></label>
            <label>Presión arterial sistólica (mmHg)<input name="presionSistolica" type="number" min="50" max="250" placeholder="Ej. 120" required /></label>
            <label>Presión arterial diastólica (mmHg)<input name="presionDiastolica" type="number" min="30" max="160" placeholder="Ej. 80" required /></label>
          </div>
          <label className="registro-signos-observacion">Observaciones<textarea name="observaciones" placeholder="Opcional: condición del paciente, oxígeno suplementario u otra observación relevante." /></label>
          <footer><button type="button" onClick={() => setRegistroSignosAbierto(false)}>Cancelar</button><button type="submit" className="primario"><Icon name="check" size={16}/> Guardar signos</button></footer>
        </form>
      </div>}
      {tipoNuevaOrden === 'laboratorio' && <HojaLaboratorios permitirEstudiosLocales paciente={pacienteActual.paciente} onCerrar={() => setTipoNuevaOrden(null)} onAceptar={items => {
        crearSolicitudLaboratorio({ profesionalId:pacienteActual.profesionalId, pacienteId:pacienteActual.pacienteId, paciente: pacienteActual.paciente, ci: pacienteActual.ci, medico: pacienteActual.medico || '', consultaId: `internacion-${pacienteActual.id}` }, items, 'internacion', { solicitadoPor: pacienteActual.medico || 'Médico de internación' });
        const detalle = items.map(item => item.nombre).join(' · ');
        setOrdenesMedicas(ordenes => [{ id: Date.now(), tipo: 'laboratorio', detalle, fecha: new Date().toLocaleDateString('es-BO') }, ...ordenes]);
        setTipoNuevaOrden(null);
      }} />}
      {historiaClinicaAbierta && <HistoriaHojeable paciente={{ nombre: pacienteActual.paciente, ci: pacienteActual.ci, edad: 34, fechaNacimiento: '18 de agosto de 1992', numeroHistoria: `HC-${pacienteActual.ci}`, datoRelevante: 'Alergias: ninguna registrada', estado: 'Al día' } satisfies PacienteHistoria} onCerrar={() => setHistoriaClinicaAbierta(false)} />}
      {evolucionSignosAbierta && <div className="internacion-evolucion-modal-fondo" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setEvolucionSignosAbierta(false); }}><section className="internacion-evolucion-modal" role="dialog" aria-modal="true" aria-labelledby="evolucion-signos-titulo"><header><div><h3 id="evolucion-signos-titulo">Evolución de signos vitales</h3><small>{pacienteActual.paciente} · Selecciona uno o más signos para compararlos.</small></div><button type="button" aria-label="Cerrar evolución" onClick={() => setEvolucionSignosAbierta(false)}><Icon name="close" size={18}/></button></header><nav aria-label="Seleccionar signos vitales">{signosGrafica.map(signo => <button type="button" key={signo.nombre} className={signosEnVista.includes(signo.nombre) ? 'activa' : ''} onClick={() => alternarSignoEnVista(signo.nombre)} aria-pressed={signosEnVista.includes(signo.nombre)}>{signo.nombre}</button>)}</nav><section className="internacion-evolucion-modal-grafica"><header><h4>{signosEnVista.length ? signosEnVista.join(' · ') : 'Sin signos seleccionados'}</h4><small>{signosEnVista.length ? `${signosEnVista.length} signo${signosEnVista.length > 1 ? 's' : ''} seleccionado${signosEnVista.length > 1 ? 's' : ''}` : 'Selecciona un signo para mostrar su evolución'}</small></header><svg viewBox="0 0 800 240" role="img" aria-label="Comparación de signos vitales seleccionados"><g><path d="M55 25H775M55 85H775M55 145H775M55 205H775"/></g>{signosGrafica.filter(signo => signosEnVista.includes(signo.nombre)).map(signo => <g key={signo.nombre} style={{color: signo.color}}><polyline points={signo.puntos}/><circle cx={signo.puntos.split(' ')[0].split(',')[0]} cy={signo.puntos.split(' ')[0].split(',')[1]} r="5"/><circle cx={signo.puntos.split(' ')[1].split(',')[0]} cy={signo.puntos.split(' ')[1].split(',')[1]} r="5"/></g>)}<text x="55" y="231">08:00</text><text x="745" y="231">16:00</text></svg></section><button type="button" className="internacion-ver-mediciones"><Icon name="chevronRight" size={15}/> Ver mediciones registradas (2)</button></section></div>}
    </section>;
  }

  return <section className="internacion-medica" aria-label="Atención médica de internación">
    <section className="internacion-medica-listado">
      <header><div className="internacion-medica-titulo"><h3>{subvista === 'internados' ? 'Pacientes en sala de internación' : 'Pacientes dados de alta este mes'}</h3><div className="internacion-medica-herramientas"><label><Icon name="search" size={17}/><input value={busqueda} onChange={evento => setBusqueda(evento.target.value)} placeholder="Buscar por paciente, CI, sala o cama" aria-label="Buscar paciente" />{busqueda && <button type="button" className="internacion-limpiar-busqueda" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda"><Icon name="close" size={15}/></button>}</label>{subvista === 'internados' && <button type="button" className="internacion-nueva" onClick={() => setInternandoPaciente(true)}><Icon name="plus" size={16}/> Internar paciente</button>}</div></div></header>
      {visibles.length > 0 ? <div className="internacion-medica-tabla" role="table" aria-label="Listado de pacientes">
        <div className={`internacion-medica-fila encabezado ${subvista === 'altas' ? 'altas' : ''}`} role="row">{subvista === 'internados' ? <><span>Sala</span><span>Cama</span></> : <span>Sala y cama</span>}<span>Paciente</span><span>Historia clínica</span><span>Médico</span><span>Fecha de ingreso</span>{subvista === 'altas' && <span>Fecha de alta</span>}<span>Estado</span><span>Acciones</span></div>
        {visibles.map(registro => <article className={`internacion-medica-fila ${subvista === 'altas' ? 'altas' : ''}`} role="row" key={registro.id}>
          {subvista === 'internados' ? <><div role="cell" className="internacion-medica-ubicacion"><strong>{registro.sala || '—'}</strong></div><div role="cell" className="internacion-medica-cama"><strong>{registro.cama || '—'}</strong></div></> : <div role="cell" className="internacion-medica-sala-cama"><strong>{registro.sala || '—'} · {registro.cama || '—'}</strong></div>}
          <div role="cell" className="internacion-medica-paciente"><span><Icon name="patient" size={19}/></span><div><strong>{registro.paciente}</strong></div></div>
          <div role="cell"><strong>HC-{registro.ci || 'S/R'}</strong></div>
          <div role="cell"><strong>{registro.medico || 'Sin asignar'}</strong></div>
          <div role="cell"><strong>{fecha(registro.fechaIngreso || registro.fecha)}</strong></div>
          {subvista === 'altas' && <div role="cell"><strong>{fecha(registro.fechaAlta)}</strong></div>}
          <div role="cell"><em className={subvista === 'internados' ? 'activo' : 'alta'}>{subvista === 'internados' ? 'Internado' : 'Alta registrada'}</em></div>
          <div role="cell" className="internacion-medica-accion"><button type="button" className={subvista === 'internados' ? 'internacion-atender' : 'internacion-ver'} onClick={() => subvista === 'internados' ? setAtencionActiva(registro) : setPacienteSeleccionado(registro)}><Icon name={subvista === 'internados' ? 'userCheck' : 'eye'} size={16}/>{subvista === 'internados' ? 'Atender' : 'Ver'}</button></div>
        </article>)}
      </div> : <div className="internacion-medica-vacio"><Icon name={subvista === 'internados' ? 'patient' : 'check'} size={30}/><strong>{busqueda ? 'No hay coincidencias' : subvista === 'internados' ? 'No hay pacientes internados' : 'No hay altas registradas'}</strong><small>{busqueda ? 'Prueba con otro nombre, CI, sala o cama.' : subvista === 'internados' ? 'Los pacientes aparecerán aquí cuando Enfermería confirme su ingreso y asigne una cama.' : 'Las altas registradas desde Pacientes internados aparecerán en este historial.'}</small></div>}
    </section>
    {pacienteSeleccionado && <div className="internacion-medica-modal-fondo" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setPacienteSeleccionado(null); }}><section className="internacion-medica-modal" role="dialog" aria-modal="true" aria-labelledby="ficha-internacion-titulo"><header><div><p>FICHA DE INTERNACIÓN</p><h3 id="ficha-internacion-titulo">{pacienteSeleccionado.paciente}</h3><small>CI {pacienteSeleccionado.ci || 'Sin documento'}</small></div><button type="button" aria-label="Cerrar ficha" onClick={() => setPacienteSeleccionado(null)}><Icon name="close" size={19}/></button></header><dl><div><dt>Ubicación</dt><dd>Sala {pacienteSeleccionado.sala || '—'} · Cama {pacienteSeleccionado.cama || '—'}</dd></div><div><dt>Tipo de sala</dt><dd>{pacienteSeleccionado.tipoSala || 'Sin registro'}</dd></div><div><dt>Médico responsable</dt><dd>{pacienteSeleccionado.medico || 'Sin registro'}</dd></div><div><dt>Fecha de ingreso</dt><dd>{fecha(pacienteSeleccionado.fechaIngreso || pacienteSeleccionado.fecha)}</dd></div><div className="internacion-medica-modal-ancho"><dt>Motivo de ingreso</dt><dd>{pacienteSeleccionado.motivo || 'Sin motivo registrado'}</dd></div></dl><footer><button type="button" onClick={() => setPacienteSeleccionado(null)}>Cerrar</button>{pacienteSeleccionado.estado === 'confirmada' && <button type="button" className="internacion-medica-modal-primario" onClick={() => { darAlta(pacienteSeleccionado); setPacienteSeleccionado(null); }}><Icon name="check" size={16}/> Registrar alta</button>}</footer></section></div>}
    {internandoPaciente && <InternacionModal onCerrar={() => setInternandoPaciente(false)} onRegistrada={() => setInternandoPaciente(false)} />}
  </section>;
}
