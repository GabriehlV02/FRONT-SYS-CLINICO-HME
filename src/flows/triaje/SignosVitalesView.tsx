import { useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import './SignosVitalesView.css';
import './ColaTriaje.css';

type PacienteEnEspera = {
  id: string;
  hora: string;
  paciente: string;
  ci: string;
  edad: number;
  doctor: string;
  especialidad: string;
};
type PacienteAtendido = PacienteEnEspera & { valores: Record<string, string>; registrado: string };

const colaInicial: PacienteEnEspera[] = [
  { id: '1', hora: '08:00', paciente: 'María Fernández López', ci: '4839201', edad: 34, doctor: 'Dra. Valeria Rojas', especialidad: 'Medicina general' },
  { id: '2', hora: '08:30', paciente: 'Carlos Mendoza', ci: '7281044', edad: 51, doctor: 'Dr. Mauricio Vargas', especialidad: 'Medicina interna' },
  { id: '3', hora: '09:00', paciente: 'Ana Rodríguez Vargas', ci: '6102837', edad: 27, doctor: 'Dra. Elena Salazar', especialidad: 'Cardiología' },
  { id: '4', hora: '09:30', paciente: 'Jorge Quiroga', ci: '5948216', edad: 46, doctor: 'Dra. Valeria Rojas', especialidad: 'Medicina general' },
  { id: '5', hora: '10:00', paciente: 'Lucía Pérez', ci: '8351702', edad: 39, doctor: 'Dr. Mauricio Vargas', especialidad: 'Medicina interna' },
];
const atendidosIniciales: PacienteAtendido[] = [
  { id: 'a-1', hora: '07:30', paciente: 'Sofía Castillo', ci: '7013659', edad: 42, doctor: 'Dra. Valeria Rojas', especialidad: 'Medicina general', registrado: '07:38', valores: { temperatura: '36.7', frecuenciaCardiaca: '74', frecuenciaRespiratoria: '18', presionSistolica: '118', presionDiastolica: '76', saturacionAmbiente: '98', peso: '64', estatura: '162', imc: '24.4' } },
  { id: 'a-2', hora: '07:45', paciente: 'Diego Molina', ci: '6892473', edad: 58, doctor: 'Dr. Mauricio Vargas', especialidad: 'Medicina interna', registrado: '07:52', valores: { temperatura: '37.1', glicemia: '105', frecuenciaCardiaca: '82', frecuenciaRespiratoria: '19', presionSistolica: '132', presionDiastolica: '84', saturacionAmbiente: '96', peso: '79', estatura: '171', imc: '27.0' } },
  { id: 'a-3', hora: '08:00', paciente: 'Elena Torrez', ci: '5418702', edad: 31, doctor: 'Dra. Elena Salazar', especialidad: 'Cardiología', registrado: '08:09', valores: { temperatura: '36.5', frecuenciaCardiaca: '68', frecuenciaRespiratoria: '16', presionSistolica: '110', presionDiastolica: '70', saturacionAmbiente: '99', peso: '58', estatura: '157', imc: '23.5' } },
];

const camposVitales = [
  ['temperatura', 'Temperatura', '°C'], ['glicemia', 'Glicemia capilar', 'mg/dL'],
  ['frecuenciaCardiaca', 'Frec. cardíaca', 'P/min'], ['frecuenciaRespiratoria', 'Frec. respiratoria', 'Res/min'],
  ['presionSistolica', 'Presión sistólica', 'mmHg'], ['presionDiastolica', 'Presión diastólica', 'mmHg'],
  ['saturacionAmbiente', 'Saturación ambiente', '%'], ['oxigeno', 'Oxígeno', 'lts'],
  ['saturacionOxigeno', 'Saturación oxígeno', '%'], ['perimetroCintura', 'Perímetro cintura', 'cm'],
  ['perimetroCadera', 'Perímetro cadera', 'cm'], ['peso', 'Peso', 'kg'], ['estatura', 'Estatura', 'cm'], ['imc', 'IMC', ''],
] as const;

export function SignosVitalesView() {
  const [cola, setCola] = useState(colaInicial);
  const [busqueda, setBusqueda] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteEnEspera | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [atendidos, setAtendidos] = useState<PacienteAtendido[]>(atendidosIniciales);
  const [panelAtendidosAbierto, setPanelAtendidosAbierto] = useState(true);
  const [busquedaAtendidos, setBusquedaAtendidos] = useState('');
  const [editandoAtendido, setEditandoAtendido] = useState(false);
  const atendidosVisibles = atendidos.filter((paciente) =>
    `${paciente.paciente} ${paciente.ci} ${paciente.doctor}`.toLocaleLowerCase().includes(busquedaAtendidos.toLocaleLowerCase()),
  );
  const visibles = cola.filter((paciente) =>
    `${paciente.paciente} ${paciente.ci} ${paciente.doctor}`.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const guardar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!pacienteSeleccionado) return;
    if (editandoAtendido) {
      setAtendidos((actual) => actual.map((item) => item.id === pacienteSeleccionado.id ? { ...item, valores, registrado: 'Ahora' } : item));
    } else {
      setCola((actual) => actual.filter((item) => item.id !== pacienteSeleccionado.id));
      setAtendidos((actual) => [{ ...pacienteSeleccionado, valores, registrado: 'Ahora' }, ...actual]);
    }
    setPacienteSeleccionado(null);
    setValores({});
    setEditandoAtendido(false);
  };

  if (pacienteSeleccionado) return <section className="signos-vitales-vista">
    <header className="signos-vitales-cabecera">
      <div><p>TRIAJE DE ENFERMERÍA</p><h2>Registro de signos vitales</h2><small>Complete la valoración inicial antes de la consulta ambulatoria.</small></div>
      <button className="signos-volver" type="button" onClick={() => { setPacienteSeleccionado(null); setValores({}); setEditandoAtendido(false); }}><Icon name="chevronLeft" size={16} /> {editandoAtendido ? 'Volver a atendidos' : 'Volver a la cola'}</button>
    </header>
    <form className="formulario-signos" onSubmit={guardar}>
      <section className="formulario-signos-datos">
        <div className="formulario-datos-bloqueados">Datos asignados por Recepción</div>
        <label>Doctor<input value={pacienteSeleccionado.doctor} disabled /></label>
        <label className="formulario-paciente">Paciente<input value={pacienteSeleccionado.paciente} disabled /></label>
        <label>Edad<input value={`${pacienteSeleccionado.edad} años`} disabled /></label>
        <label>Hora de consulta<input value={pacienteSeleccionado.hora} disabled /></label>
        <label className="formulario-paciente">Especialidad<input value={pacienteSeleccionado.especialidad} disabled /></label>
      </section>
      <section className="formulario-signos-campos">
        {camposVitales.map(([id, etiqueta, unidad]) => <label key={id}>{etiqueta}<span><input inputMode="decimal" value={valores[id] || ''} onChange={(evento) => setValores((actual) => ({ ...actual, [id]: evento.target.value }))} />{unidad && <em>{unidad}</em>}</span></label>)}
      </section>
      <footer><button className="signos-cancelar" type="button" onClick={() => { setPacienteSeleccionado(null); setValores({}); setEditandoAtendido(false); }}>Cancelar</button><button className="signos-guardar" type="submit"><Icon name="check" size={16} /> {editandoAtendido ? 'Actualizar signos vitales' : 'Guardar signos vitales'}</button></footer>
    </form>
  </section>;

  return <section className="signos-vitales-vista">
    <div className="signos-vitales-herramientas">
      <label><Icon name="search" size={17} /><input aria-label="Buscar pacientes en espera" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por paciente, CI o médico" /></label>
      <button className="cola-toggle" type="button" aria-expanded={panelAtendidosAbierto} aria-controls="cola-atendidos" onClick={() => setPanelAtendidosAbierto((abierto) => !abierto)}>
        <Icon name="userCheck" size={17} /><span>Atendidos</span><b>{atendidos.length}</b><Icon name={panelAtendidosAbierto ? 'chevronRight' : 'chevronLeft'} size={16} />
      </button>
    </div>
    <div className={`signos-vitales-operacion ${panelAtendidosAbierto ? 'panel-atendidos-abierto' : ''}`}>
      <section className="signos-vitales-lista" aria-label="Cola de pacientes para signos vitales">
        <header><span>Consulta</span><span>Paciente</span><span>Médico / especialidad</span><span>Acción</span></header>
        {visibles.map((paciente) => <article key={paciente.id}>
          <time>{paciente.hora}</time>
          <div className="signos-paciente"><span>{paciente.paciente.split(' ').map((parte) => parte[0]).slice(0, 2).join('')}</span><div><strong>{paciente.paciente}</strong><small>CI {paciente.ci}</small></div></div>
          <div className="signos-consulta"><strong>{paciente.doctor}</strong><small>{paciente.especialidad}</small></div>
          <button className="accion-registrar-signos" type="button" onClick={() => setPacienteSeleccionado(paciente)}><Icon name="patient" size={16} /> Registrar</button>
        </article>)}
        {!visibles.length && <p className="signos-vitales-vacio">{busqueda ? 'No hay pacientes que coincidan con la búsqueda.' : 'No hay pacientes en espera.'}</p>}
      </section>
      <aside id="cola-atendidos" hidden={!panelAtendidosAbierto} className="signos-atendidos" aria-label="Pacientes atendidos">
          <div className="signos-atendidos-contenido">
          <header><div><p>ATENDIDOS HOY</p><strong>Signos vitales registrados</strong></div><b>{atendidos.length}</b></header>
          <label className="cola-buscar-atendidos"><Icon name="search" size={15} /><input aria-label="Buscar pacientes atendidos" value={busquedaAtendidos} onChange={(evento) => setBusquedaAtendidos(evento.target.value)} placeholder="Buscar atendido…" /></label>
          {atendidosVisibles.length ? <div className="cola-historial">{atendidosVisibles.map((paciente) => <article key={paciente.id}><span>{paciente.paciente.split(' ').map((parte) => parte[0]).slice(0, 2).join('')}</span><div><strong>{paciente.paciente}</strong><small>Consulta {paciente.hora} · Registrado {paciente.registrado}</small><small>{paciente.doctor}</small></div><button type="button" aria-label={`Editar signos vitales de ${paciente.paciente}`} onClick={() => { setPacienteSeleccionado(paciente); setValores(paciente.valores); setEditandoAtendido(true); }}><Icon name="edit" size={15} /></button></article>)}</div> : <div className="cola-vacio"><Icon name="userCheck" size={28} /><strong>{atendidos.length ? 'Sin coincidencias' : 'Aún no hay atendidos'}</strong><p>{atendidos.length ? 'Prueba con otro nombre, CI o médico.' : 'Al guardar los signos vitales, el paciente aparecerá aquí.'}</p></div>}
        </div>
      </aside>
    </div>
  </section>;
}
