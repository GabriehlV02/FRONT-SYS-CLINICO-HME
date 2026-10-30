import { useProfesionales, etiquetaProfesional } from '../../../radius/profesionales';
import { useMemo, useState, useEffect } from 'react';
import ModalRegistroPaciente, { type PacienteRegistrado } from '../../../radius/vistas/pacientes/ModalRegistroPaciente';
import { usePacientes } from '../../../radius/vistas/pacientes/usePacientes';
import { apiFetch } from '../../../radius/api';
import Icon from '../../../radius/componentes/Icono';
import './AgendarConsultaView.css';

type Paciente = {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  ci: string;
  celular: string;
  [key: string]: unknown;
};
type Props = {
  doctorInicial?: string;
  fechaInicial?: string;
  horaInicial?: string;
  consultaPendiente?: { id?: string; paciente: string; ci: string; doctor: string; especialidad?: string };
  onVolver: () => void;
  onAgendada: (datos: {
    id: string;
    pacienteId: string;
    profesionalId?:string;
    paciente: string;
    ci: string;
    doctor: string;
    fecha: string;
    hora: string;
  }) => void;
};

const horas = Array.from(
  { length: 20 },
  (_, index) =>
    `${String(7 + Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`,
);
const nombreCompleto = (paciente: Paciente) =>
  [paciente.nombres, paciente.apellidoPaterno, paciente.apellidoMaterno]
    .filter(Boolean)
    .join(' ');
const paraAgenda = (p: PacienteRegistrado): Paciente => ({id:p.id,nombres:p.nombres,apellidoPaterno:p.apellido_paterno,apellidoMaterno:p.apellido_materno,ci:p.ci,celular:p.telefono || ''});

export function AgendarConsultaView({
  doctorInicial = '',
  fechaInicial,
  horaInicial = '07:00',
  consultaPendiente,
  onVolver,
  onAgendada,
}: Props) {
  const {profesionales,medicos,errorProfesionales,resolver}=useProfesionales();
  const tarifas:Record<string,number>={'Medicina general':80,'Medicina interna':120,Pediatria:100,Cardiologia:160};
  const especialidades:Record<string,{precio:number;doctores:string[]}>=Object.fromEntries([...new Set(medicos.flatMap(p=>p.especialidades))].map(e=>[e,{precio:tarifas[e] || 0,doctores:medicos.filter(p=>p.especialidades.includes(e)).map(etiquetaProfesional)}]));
  const doctores=medicos.map(etiquetaProfesional);
  const { pacientes: fichas, errorPacientes } = usePacientes();
  const pacientes = useMemo(() => fichas.map(paraAgenda), [fichas]);
  const [busqueda, setBusqueda] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  useEffect(() => { if (consultaPendiente) setPaciente(pacientes.find(p=>p.ci===consultaPendiente.ci) || null); }, [pacientes, consultaPendiente?.ci]);
  const [registrando, setRegistrando] = useState(false);
  const [especialidad, setEspecialidad] = useState(() => consultaPendiente?.especialidad && especialidades[consultaPendiente.especialidad] ? consultaPendiente.especialidad : Object.entries(especialidades).find(([, item]) => item.doctores.includes(consultaPendiente?.doctor ?? doctorInicial))?.[0] ?? '');
  const [doctor, setDoctor] = useState(consultaPendiente?.doctor ?? doctorInicial);
  useEffect(()=>{const elegido=medicos.find(p=>p.nombre===(consultaPendiente?.doctor || doctorInicial) || etiquetaProfesional(p)===(consultaPendiente?.doctor || doctorInicial));if(elegido){setDoctor(etiquetaProfesional(elegido));setEspecialidad(actual=>actual || elegido.especialidades[0] || '');}},[profesionales,doctorInicial,consultaPendiente?.id]);
  const soloCobro = Boolean(consultaPendiente);
  const [fecha, setFecha] = useState(
    fechaInicial ?? new Date().toISOString().slice(0, 10),
  );
  const [hora, setHora] = useState(horaInicial);
  const [metodo, setMetodo] = useState('Efectivo');
  const [recibido, setRecibido] = useState('');
  const [mensaje, setMensaje] = useState('');
  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return termino
      ? pacientes
          .filter((item) =>
            `${nombreCompleto(item)} ${item.ci}`
              .toLowerCase()
              .includes(termino),
          )
          .slice(0, 6)
      : [];
  }, [busqueda, pacientes]);
  const especialidadesDisponibles = Object.entries(especialidades)
    .filter(([, item]) => !doctor || item.doctores.includes(doctor))
    .map(([nombre]) => nombre);
  const doctoresDisponibles = especialidad
    ? (especialidades[especialidad]?.doctores || [])
    : doctores;
  const precio = especialidad ? (especialidades[especialidad]?.precio || 0) : 0;
  const pagoValido = metodo !== 'Efectivo' || Number(recibido) >= precio;

  const confirmar = async () => {
    if (!paciente || !especialidad || !doctor || !fecha || !pagoValido) return;
    if(!consultaPendiente && !resolver(doctor)){setMensaje('Selecciona un médico activo del catálogo.');return;}
    if(precio<=0){setMensaje('La especialidad no tiene una tarifa de consulta configurada. Puedes registrar su cita por confirmar en el cronograma.');return;}
    try {
    const respuesta = await apiFetch(consultaPendiente?.id ? `/api/citas/${consultaPendiente.id}/estado` : '/api/citas', {method:consultaPendiente?.id ? 'PATCH':'POST',headers:{Accept:'application/json'},body:JSON.stringify(consultaPendiente?.id ? {estado:'confirmada'} : {paciente_id:paciente.id,profesional_id:resolver(doctor)?.id,doctor:resolver(doctor)?.nombre || doctor,especialidad,consultorio:'Consultorio 1',fecha,hora,estado:'confirmada'})});
    const datos = await respuesta.json();
    if(!respuesta.ok) throw new Error(Object.values(datos.errors || {}).flat()[0] as string || datos.message || 'No se pudo guardar la cita.');
    onAgendada({
      id:datos.id,pacienteId:paciente.id,profesionalId:datos.profesionalId,
      paciente: nombreCompleto(paciente),
      ci: paciente.ci,
      doctor:datos.doctor,
      fecha,
      hora,
    });
    } catch(causa) {setMensaje((causa as Error).message);}
  };

  return (
    <section className="agendar-vista">
      <header>
        <button className="secundario" type="button" onClick={onVolver}>
          <Icon name="chevronLeft" size={16} /> Volver al cronograma
        </button>
        <div>
          <span>AGENDAMIENTO Y COBRO</span>
          <h1>{soloCobro ? 'Confirmar y cobrar consulta' : 'Nueva consulta'}</h1>
        </div>
      </header>
      <div className="agendar-columnas">
        <section className="panel agendar-datos">
          <div className="agendar-seccion-titulo">
            <b>1</b>
            <div>
              <strong>Paciente</strong>
              <small>Busca un registro existente o crea uno nuevo.</small>
            </div>
            {!soloCobro && <button
              className="secundario"
              type="button"
              onClick={() => setRegistrando(!registrando)}
            >
              <Icon name="plus" size={14} /> Registrar
            </button>}
          </div>
          {!paciente && (
            <label className="agendar-buscar">
              <Icon name="search" size={16} />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por nombre o CI"
              />
            </label>
          )}
          {resultados.length > 0 && (
            <div className="agendar-resultados">
              {resultados.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setPaciente(item);
                    setBusqueda('');
                  }}
                >
                  <strong>{nombreCompleto(item)}</strong>
                  <small>
                    CI {item.ci} · {item.celular}
                  </small>
                </button>
              ))}
            </div>
          )}
          {registrando && <ModalRegistroPaciente onCerrar={() => setRegistrando(false)} onRegistrado={p => {setPaciente(paraAgenda(p));setBusqueda('');}} />}
          {paciente && (
            <div className="agendar-paciente">
              <div>
                <span>Paciente seleccionado</span>
                <strong>{nombreCompleto(paciente)}</strong>
                <small>
                  CI {paciente.ci} · {paciente.celular}
                </small>
              </div>
              {!soloCobro && <button type="button" onClick={() => setPaciente(null)}>
                <Icon name="close" size={15} />
              </button>}
            </div>
          )}
          {(mensaje || errorPacientes) && <p className="agendar-error" role="alert">{mensaje || errorPacientes || errorProfesionales}</p>}
          <div className="agendar-seccion-titulo">
            <b>2</b>
            <div>
              <strong>Consulta</strong>
              <small>Especialidad y profesional se filtran entre sí.</small>
            </div>
          </div>
          <div className="agendar-campos">
            <label>
              Especialidad
              <select
                disabled={soloCobro}
                value={especialidad}
                onChange={(e) => {
                  const valor = e.target.value;
                  setEspecialidad(valor);
                  if (
                    valor &&
                    doctor &&
                    !especialidades[valor].doctores.includes(doctor)
                  )
                    setDoctor('');
                }}
              >
                <option value="">Seleccionar</option>
                {especialidadesDisponibles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Doctor
              <select
                disabled={soloCobro}
                value={doctor}
                onChange={(e) => {
                  const valor = e.target.value;
                  setDoctor(valor);
                  if (
                    especialidad &&
                    valor &&
                    !especialidades[especialidad].doctores.includes(valor)
                  )
                    setEspecialidad('');
                }}
              >
                <option value="">Seleccionar</option>
                {doctoresDisponibles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Fecha
              <input
                disabled={soloCobro}
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </label>
            <label>
              Hora
              <select disabled={soloCobro} value={hora} onChange={(e) => setHora(e.target.value)}>
                {horas.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <aside className="panel agendar-cobro">
          <div className="agendar-seccion-titulo">
            <b>3</b>
            <div>
              <strong>Cobro</strong>
              <small>La consulta se agenda al registrar el pago.</small>
            </div>
          </div>
          <div className="agendar-resumen">
            <span>{especialidad || 'Consulta médica'}</span>
            <strong>Bs {precio.toFixed(2)}</strong>
          </div>
          <label>
            Método de pago
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option>Efectivo</option>
              <option>QR</option>
              <option>Tarjeta</option>
              <option>Transferencia</option>
            </select>
          </label>
          {metodo === 'Efectivo' && (
            <label>
              Monto recibido
              <input
                type="number"
                min={0}
                value={recibido}
                onChange={(e) => setRecibido(e.target.value)}
                placeholder="0.00"
              />
            </label>
          )}
          <div className="agendar-total">
            <span>Total a cobrar</span>
            <strong>Bs {precio.toFixed(2)}</strong>
          </div>
          <button
            className="primario"
            type="button"
            disabled={
              !paciente || !especialidad || !doctor || !fecha || !pagoValido
            }
            onClick={confirmar}
          >
            Cobrar y agendar <Icon name="arrowRight" size={16} />
          </button>
        </aside>
      </div>
    </section>
  );
}
