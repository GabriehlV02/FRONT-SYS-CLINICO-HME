import { useProfesionales, etiquetaProfesional } from '../../radius/profesionales';
import { useEffect, useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import { apiFetch } from '../../radius/api';
import type { CirugiaProgramada } from './cronogramaQuirofano';
import { guardarAsignacionQuirofano } from './asignacionesQuirofano';
import './ProgramarCirugiaView.css';
import './ProgramarCirugiaFiltros.css';
import './ProgramarDetalleView.css';

const fechaLocalConDesplazamiento = (dias: number) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};

const QUIROFANOS = ['Quirófano 1 · General', 'Quirófano 2 · Especialidades', 'Quirófano 3 · Ambulatorio'];
type Asignacion = { cirujano1: string; cirujano2: string; ayudante1: string; ayudante2: string; instrumentista: string; circulante: string; otro: string; quirofano: string; fecha: string; hora: string };
type UsuarioSistema = { id: string; nombres?: string; nombre?: string; apellido_paterno?: string | null; apellido_materno?: string | null; apellido?: string; apellidos?: string | null; rol?: string | null; rolId?: string; estado?: string };

const nombreUsuario = (usuario: UsuarioSistema) => [usuario.nombres ?? usuario.nombre, usuario.apellido_paterno ?? usuario.apellido ?? usuario.apellidos, usuario.apellido_materno].filter(Boolean).join(' ');
const esEnfermera = (usuario: UsuarioSistema) => /enfermer/i.test(`${usuario.rol ?? ''} ${usuario.rolId ?? ''}`) && !/inactivo/i.test(usuario.estado ?? '');

export function ProgramarCirugiaView({ cirugias, onRegistrar }: { cirugias: CirugiaProgramada[]; onRegistrar: () => void }) {
  const [busqueda, setBusqueda] = useState('');
  const fechaMinima = useMemo(() => fechaLocalConDesplazamiento(-1), []);
  const [desde, setDesde] = useState(fechaMinima);
  const [hasta, setHasta] = useState('');
  const [programadas, setProgramadas] = useState<string[]>([]);
  const {profesionales,medicos,enfermeria,resolver,errorProfesionales}=useProfesionales();
  const enfermeras=enfermeria.map(etiquetaProfesional);
  const [seleccionada, setSeleccionada] = useState<CirugiaProgramada | null>(null);
  const [asignacion, setAsignacion] = useState<Asignacion | null>(null);

  const cirugiasDisponibles = cirugias;
  const visibles = useMemo(() => cirugiasDisponibles
    .filter(cirugia => `${cirugia.paciente} ${cirugia.ci} ${cirugia.tipo} ${cirugia.medico}`.toLowerCase().includes(busqueda.toLowerCase()) && (!desde || cirugia.fecha >= desde) && (!hasta || cirugia.fecha <= hasta))
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)), [cirugiasDisponibles, busqueda, desde, hasta]);

  const cambiarDesde = (valor: string) => {
    setDesde(valor);
    if (hasta && valor && hasta < valor) setHasta(valor);
  };
  const abrirProgramacion = (cirugia: CirugiaProgramada) => {
    setSeleccionada(cirugia);
    setAsignacion({ cirujano1: cirugia.medico || '', cirujano2: '', ayudante1: '', ayudante2: '', instrumentista: '', circulante: '', otro: '', quirofano: cirugia.quirofano, fecha: cirugia.fecha, hora: cirugia.hora });
  };
  const confirmarProgramacion = () => {
    if (!seleccionada || !asignacion) return;
    guardarAsignacionQuirofano({ usuarioIds:Object.fromEntries(Object.entries(asignacion).flatMap(([campo,valor])=>resolver(valor)?.usuario_id?[[campo,resolver(valor)!.usuario_id!]]:[])), profesionalIds:Object.fromEntries(Object.entries(asignacion).flatMap(([campo,valor])=>resolver(valor)?[[campo,resolver(valor)!.id]]:[])), cirugiaId: seleccionada.id, paciente: seleccionada.paciente, procedimiento: seleccionada.tipo, instrumentista: resolver(asignacion.instrumentista)?.nombre || asignacion.instrumentista, circulante: resolver(asignacion.circulante)?.nombre || asignacion.circulante });
    setProgramadas(actual => actual.includes(seleccionada.id) ? actual : [...actual, seleccionada.id]);
    setSeleccionada(null);
    setAsignacion(null);
  };
  const profesionalesValidos=Boolean(asignacion && ['cirujano1','ayudante1','ayudante2','instrumentista','circulante'].every(campo=>resolver(asignacion[campo as keyof Asignacion])));
  const completa = profesionalesValidos && Boolean(asignacion?.cirujano1 && asignacion.ayudante1 && asignacion.ayudante2 && asignacion.instrumentista && asignacion.circulante && asignacion.quirofano && asignacion.fecha && asignacion.hora);

  if (seleccionada && asignacion) {
    const selector = (campo: keyof Asignacion, etiqueta: string, opcional = false) => {
      const opciones = campo === 'instrumentista' || campo === 'circulante' ? enfermeras : (campo==='otro'?profesionales:medicos).map(etiquetaProfesional);
      return <label>{etiqueta}{opcional && <small>Opcional</small>}<select required={!opcional} value={asignacion[campo]} onChange={evento => setAsignacion({ ...asignacion, [campo]: evento.target.value })}><option value="">{opciones.length ? 'Seleccionar profesional' : 'No hay enfermeras registradas'}</option>{opciones.map(profesional => <option key={profesional}>{profesional}</option>)}</select></label>;
    };
    return <section className="programar-detalle" aria-labelledby="programar-detalle-titulo">
      <header><button type="button" onClick={() => { setSeleccionada(null); setAsignacion(null); }}><Icon name="chevronLeft" size={16}/> Cirugías agendadas</button><div><p>QUIRÓFANO · ASIGNACIÓN</p><h2 id="programar-detalle-titulo">Confirmar programación quirúrgica</h2></div></header>
      <div className="programar-detalle-resumen"><article><p>DATOS DEL PACIENTE</p><strong>{seleccionada.paciente}</strong><div><span><b>CI</b>{seleccionada.ci}</span><span><b>Cuenta</b>{seleccionada.cuenta}</span></div></article><article><p>PROCEDIMIENTO</p><strong>{seleccionada.tipo}</strong><div><span><b>Médico de referencia</b>{seleccionada.medico || 'Sin profesional asignado'}</span><span><b>Horario solicitado</b>{seleccionada.fecha.split('-').reverse().join('/')} · {seleccionada.hora}</span></div></article></div>
      <fieldset className="programar-detalle-equipo"><legend>Equipo quirúrgico</legend><p>Asigna un profesional para cada puesto obligatorio antes de confirmar.</p><div>{selector('cirujano1', 'Médico cirujano 1 *')}{selector('cirujano2', 'Médico cirujano 2', true)}{selector('ayudante1', 'Primer ayudante *')}{selector('ayudante2', 'Segundo ayudante *')}{selector('instrumentista', 'Enfermera instrumentista *')}{selector('circulante', 'Enfermera circulante *')}{selector('otro', 'Otro profesional', true)}</div></fieldset>
      <fieldset className="programar-detalle-agenda"><legend>Fecha, hora y quirófano</legend><div><label>Quirófano *<select required value={asignacion.quirofano} onChange={evento => setAsignacion({ ...asignacion, quirofano: evento.target.value })}><option value="">Seleccionar quirófano</option>{QUIROFANOS.map(sala => <option key={sala}>{sala}</option>)}</select></label><label>Fecha *<input required type="date" min={fechaMinima} value={asignacion.fecha} onChange={evento => setAsignacion({ ...asignacion, fecha: evento.target.value })}/></label><label>Hora *<input required type="time" value={asignacion.hora} onChange={evento => setAsignacion({ ...asignacion, hora: evento.target.value })}/></label></div></fieldset>
      <footer><button type="button" onClick={() => { setSeleccionada(null); setAsignacion(null); }}>Cancelar</button><button type="button" disabled={!completa} onClick={confirmarProgramacion}><Icon name="check" size={16}/> Confirmar programación</button></footer>
    </section>;
  }

  return <section className="programar-cirugia" aria-labelledby="programar-cirugia-titulo">{errorProfesionales && <p role="alert">{errorProfesionales}</p>}
    <header className="programar-cirugia-cabecera"><div><p>QUIRÓFANO · PROGRAMACIÓN</p><h2 id="programar-cirugia-titulo">Programar cirugía</h2></div></header>
    <div className="programar-cirugia-herramientas"><label className="programar-cirugia-buscar"><Icon name="search" size={16}/><input value={busqueda} onChange={evento => setBusqueda(evento.target.value)} placeholder="Buscar por paciente, CI, cirugía o médico"/></label><label className="programar-cirugia-fecha-filtro">Desde<input type="date" min={fechaMinima} value={desde} onChange={evento => cambiarDesde(evento.target.value)}/></label><label className="programar-cirugia-fecha-filtro">Hasta<input type="date" min={desde || fechaMinima} value={hasta} onChange={evento => setHasta(evento.target.value)}/></label><button type="button" className="programar-cirugia-registrar" onClick={onRegistrar}><Icon name="plus" size={16}/> Registrar cirugía</button></div>
    {visibles.length ? <div className="programar-cirugia-lista">{visibles.map(cirugia => {
      const programada = programadas.includes(cirugia.id);
      return <article key={cirugia.id}><div className="programar-cirugia-fecha"><strong>{cirugia.fecha.split('-').reverse().join('/')}</strong><span>{cirugia.hora}</span></div><div className="programar-cirugia-paciente"><strong>{cirugia.paciente}</strong><small>CI {cirugia.ci}</small></div><div><b>{cirugia.tipo}</b><small>{cirugia.medico}</small></div><div><b>Quirófano</b><small>{cirugia.quirofano}</small></div><button type="button" className={programada ? 'programada' : ''} onClick={() => abrirProgramacion(cirugia)} disabled={programada}>{programada ? <><Icon name="check" size={16}/> Programada</> : <><Icon name="calendar" size={16}/> Programar</>}</button></article>;
    })}</div> : <div className="programar-cirugia-vacio"><Icon name="calendar" size={28}/><strong>No se encontraron cirugías agendadas</strong><small>Prueba con otro término de búsqueda o rango de fechas.</small></div>}
  </section>;
}
