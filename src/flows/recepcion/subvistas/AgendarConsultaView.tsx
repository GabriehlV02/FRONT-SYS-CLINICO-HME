import { useMemo, useState, type FormEvent } from 'react';
import Icon from '../../../radius/componentes/Icono';
import './AgendarConsultaView.css';

type Paciente = {
  id: number;
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
  consultaPendiente?: { paciente: string; ci: string; doctor: string; especialidad?: string };
  onVolver: () => void;
  onAgendada: (datos: {
    paciente: string;
    ci: string;
    doctor: string;
    fecha: string;
    hora: string;
  }) => void;
};
const especialidades: Record<string, { precio: number; doctores: string[] }> = {
  'Medicina general': {
    precio: 80,
    doctores: ['Dra. Valeria Rojas', 'Dr. Mauricio Vargas'],
  },
  'Medicina interna': {
    precio: 120,
    doctores: ['Dra. Valeria Rojas', 'Dra. Elena Salazar'],
  },
  Pediatria: {
    precio: 100,
    doctores: ['Dra. Elena Salazar', 'Dr. Mauricio Vargas'],
  },
  Cardiologia: { precio: 160, doctores: ['Dra. Valeria Rojas'] },
};
const doctores = [
  ...new Set(Object.values(especialidades).flatMap((item) => item.doctores)),
];
const horas = Array.from(
  { length: 20 },
  (_, index) =>
    `${String(7 + Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`,
);
const nombreCompleto = (paciente: Paciente) =>
  [paciente.nombres, paciente.apellidoPaterno, paciente.apellidoMaterno]
    .filter(Boolean)
    .join(' ');
const leerPacientes = (): Paciente[] => {
  try {
    return JSON.parse(
      localStorage.getItem('clinica-caja-pacientes') || '[]',
    ) as Paciente[];
  } catch {
    return [];
  }
};

export function AgendarConsultaView({
  doctorInicial = '',
  fechaInicial,
  horaInicial = '07:00',
  consultaPendiente,
  onVolver,
  onAgendada,
}: Props) {
  const [pacientes, setPacientes] = useState<Paciente[]>(leerPacientes);
  const [busqueda, setBusqueda] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(() => {
    if (!consultaPendiente) return null;
    const existente = leerPacientes().find((item) => item.ci === consultaPendiente.ci);
    if (existente) return existente;
    const partes = consultaPendiente.paciente.trim().split(/\s+/);
    return { id: Date.now(), nombres: partes[0] ?? '', apellidoPaterno: partes[1] ?? '', apellidoMaterno: partes.slice(2).join(' '), ci: consultaPendiente.ci, celular: '' };
  });
  const [registrando, setRegistrando] = useState(false);
  const [nuevo, setNuevo] = useState({
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    ci: '',
    celular: '',
  });
  const [especialidad, setEspecialidad] = useState(() => consultaPendiente?.especialidad && especialidades[consultaPendiente.especialidad] ? consultaPendiente.especialidad : Object.entries(especialidades).find(([, item]) => item.doctores.includes(consultaPendiente?.doctor ?? doctorInicial))?.[0] ?? '');
  const [doctor, setDoctor] = useState(consultaPendiente?.doctor ?? doctorInicial);
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
    ? especialidades[especialidad].doctores
    : doctores;
  const precio = especialidad ? especialidades[especialidad].precio : 0;
  const pagoValido = metodo !== 'Efectivo' || Number(recibido) >= precio;

  const registrar = (event: FormEvent) => {
    event.preventDefault();
    if (pacientes.some((item) => item.ci === nuevo.ci.trim())) {
      setMensaje('Ya existe un paciente con ese CI.');
      return;
    }
    const creado: Paciente = {
      id: Date.now(),
      ...nuevo,
      nombres: nuevo.nombres.trim(),
      apellidoPaterno: nuevo.apellidoPaterno.trim(),
      apellidoMaterno: nuevo.apellidoMaterno.trim(),
      ci: nuevo.ci.trim(),
      celular: nuevo.celular.trim(),
      complemento: '',
      expedidoEn: 'Cochabamba',
      correo: '',
      fechaNacimiento: '',
      genero: '',
      ciConQr: false,
      afroamericano: false,
      pais: 'Bolivia',
      departamento: 'Cochabamba',
      ciudad: '',
      zona: '',
      direccion: '',
      responsableNombre: '',
      responsableTelefono: '',
      responsableParentesco: '',
      procedencia: '',
      observaciones: '',
      habilitado: true,
    };
    const actualizados = [...pacientes, creado];
    setPacientes(actualizados);
    localStorage.setItem(
      'clinica-caja-pacientes',
      JSON.stringify(actualizados),
    );
    setPaciente(creado);
    setRegistrando(false);
    setBusqueda('');
    setMensaje('');
  };
  const confirmar = () => {
    if (!paciente || !especialidad || !doctor || !fecha || !pagoValido) return;
    onAgendada({
      paciente: nombreCompleto(paciente),
      ci: paciente.ci,
      doctor,
      fecha,
      hora,
    });
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
          {registrando && (
            <form className="agendar-registro" onSubmit={registrar}>
              <label>
                Nombres
                <input
                  required
                  value={nuevo.nombres}
                  onChange={(e) =>
                    setNuevo({ ...nuevo, nombres: e.target.value })
                  }
                />
              </label>
              <label>
                Apellido paterno
                <input
                  required
                  value={nuevo.apellidoPaterno}
                  onChange={(e) =>
                    setNuevo({ ...nuevo, apellidoPaterno: e.target.value })
                  }
                />
              </label>
              <label>
                Apellido materno
                <input
                  value={nuevo.apellidoMaterno}
                  onChange={(e) =>
                    setNuevo({ ...nuevo, apellidoMaterno: e.target.value })
                  }
                />
              </label>
              <label>
                CI
                <input
                  required
                  value={nuevo.ci}
                  onChange={(e) => setNuevo({ ...nuevo, ci: e.target.value })}
                />
              </label>
              <label>
                Celular
                <input
                  required
                  value={nuevo.celular}
                  onChange={(e) =>
                    setNuevo({ ...nuevo, celular: e.target.value })
                  }
                />
              </label>
              <button className="primario" type="submit">
                Guardar paciente
              </button>
            </form>
          )}
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
          {mensaje && <p className="agendar-error">{mensaje}</p>}
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
