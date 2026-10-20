import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Icon from '../../radius/componentes/Icono';
import { leerInternaciones, registrarAltaInternacion, suscribirInternaciones, type RegistroInternacion } from './registroInternaciones';
import { InternacionModal } from '../recepcion/subvistas/InternacionModal';
import { HistoriaHojeable, type PacienteHistoria } from '../consultorio/ConsultorioView';
import './MedicoInternacionView.css';
import './MedicoInternacionAtencionTabs.css';

type Subvista = 'internados' | 'altas';

const fecha = (valor?: string) => valor || 'Sin registro';
const correspondeAlMesActual = (valor?: string) => {
  if (!valor) return false;
  const partes = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const fechaRegistro = partes ? new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1])) : new Date(valor);
  const hoy = new Date();
  return !Number.isNaN(fechaRegistro.getTime()) && fechaRegistro.getMonth() === hoy.getMonth() && fechaRegistro.getFullYear() === hoy.getFullYear();
};

export function MedicoInternacionView({ subvista }: { subvista: Subvista }) {
  const registros = useSyncExternalStore(suscribirInternaciones, leerInternaciones, leerInternaciones);
  const [busqueda, setBusqueda] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<RegistroInternacion | null>(null);
  const [atencionActiva, setAtencionActiva] = useState<RegistroInternacion | null>(null);
  const [internandoPaciente, setInternandoPaciente] = useState(false);
  const [historiaClinicaAbierta, setHistoriaClinicaAbierta] = useState(false);
  const [subvistaAtencion, setSubvistaAtencion] = useState<'evolucion' | 'atencion' | 'resultados' | 'historia'>('evolucion');
  const internados = registros.filter(registro => registro.estado === 'confirmada');
  const altas = registros.filter(registro => registro.estado === 'alta' && correspondeAlMesActual(registro.fechaAlta));
  const fuente = subvista === 'internados' ? internados : altas;
  useEffect(() => { if (subvista === 'altas') setAtencionActiva(null); }, [subvista]);
  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    if (!termino) return fuente;
    return fuente.filter(registro => `${registro.paciente} ${registro.ci} ${registro.sala} ${registro.cama} ${registro.motivo}`.toLocaleLowerCase('es').includes(termino));
  }, [busqueda, fuente]);
  const darAlta = (registro: RegistroInternacion) => {
    if (!window.confirm(`¿Registrar el alta de ${registro.paciente}? El paciente se moverá al listado de altas.`)) return;
    registrarAltaInternacion(registro.id);
  };

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
          <button type="button" className={subvistaAtencion === 'evolucion' ? 'activa' : ''} onClick={() => setSubvistaAtencion('evolucion')}><Icon name="fileText" size={16}/> Evolución</button>
          <button type="button" className={subvistaAtencion === 'atencion' ? 'activa' : ''} onClick={() => setSubvistaAtencion('atencion')}><Icon name="userCheck" size={16}/> Atención</button>
          <button type="button" className={subvistaAtencion === 'resultados' ? 'activa' : ''} onClick={() => setSubvistaAtencion('resultados')}><Icon name="lab" size={16}/> Resultados</button>
          <button type="button" className={subvistaAtencion === 'historia' ? 'activa' : ''} onClick={() => setSubvistaAtencion('historia')}><Icon name="fileText" size={16}/> Historia clínica</button>
        </nav>
        {subvistaAtencion === 'evolucion' && <article className="internacion-subvista-panel"><span>EVOLUCIÓN CLÍNICA</span><h3>Seguimiento de la evolución del paciente</h3><p>Registra las notas médicas, cambios clínicos y observaciones relevantes durante la internación.</p><button type="button"><Icon name="plus" size={16}/> Registrar evolución</button></article>}
        {subvistaAtencion === 'atencion' && <article className="internacion-ordenes-panel" aria-label="Órdenes médicas"><button type="button" className="orden-laboratorio"><Icon name="lab" size={17}/> Orden de laboratorio</button><button type="button" className="orden-imagenologia"><Icon name="image" size={17}/> Orden de imagenología</button><button type="button" className="orden-recetario"><Icon name="fileText" size={17}/> Recetario médico</button><button type="button" className="orden-internacion"><Icon name="patient" size={17}/> Orden de internación</button></article>}
        {subvistaAtencion === 'resultados' && <article className="internacion-subvista-panel"><span>RESULTADOS</span><h3>Estudios y resultados clínicos</h3><p>Visualiza los resultados disponibles de laboratorio, imágenes y estudios solicitados.</p><button type="button"><Icon name="lab" size={16}/> Ver resultados</button></article>}
        {subvistaAtencion === 'historia' && <article className="internacion-subvista-panel"><span>HISTORIA CLÍNICA</span><h3>Antecedentes y registros del paciente</h3><p>Consulta diagnósticos previos, alergias, antecedentes relevantes y el historial de atenciones.</p><button type="button" onClick={() => setHistoriaClinicaAbierta(true)}><Icon name="fileText" size={16}/> Ver historia clínica</button></article>}
      </section>
      {historiaClinicaAbierta && <HistoriaHojeable paciente={{ nombre: pacienteActual.paciente, ci: pacienteActual.ci, edad: 34, fechaNacimiento: '18 de agosto de 1992', numeroHistoria: `HC-${pacienteActual.ci}`, datoRelevante: 'Alergias: ninguna registrada', estado: 'Al día' } satisfies PacienteHistoria} onCerrar={() => setHistoriaClinicaAbierta(false)} />}
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
