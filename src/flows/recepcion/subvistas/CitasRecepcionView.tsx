import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../../radius/componentes/Icono';
import { apiFetch } from '../../../radius/api';
import { AgendarConsultaView } from './AgendarConsultaView';
import './CitasRecepcionView.css';

type EstadoCita = 'Confirmada' | 'Por confirmar' | 'Cancelada';
type Cita = {
  id?: string;
  dia: number;
  fecha?: string;
  hora: string;
  paciente: string;
  ci: string;
  doctor: string;
  motivo: string;
  estado: EstadoCita;
};
const doctores = [
  'Todos los doctores',
  'Dra. Valeria Rojas',
  'Dr. Mauricio Vargas',
  'Dra. Elena Salazar',
];
const nombresDia = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const diasCalendario = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const meses = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const horas = Array.from(
  { length: 20 },
  (_, index) =>
    `${String(7 + Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`,
);
const sumarDias = (fecha: Date, dias: number) =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
const fechaParaInput = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
const inicioSemana = (fecha: Date) =>
  sumarDias(fecha, -((fecha.getDay() + 6) % 7));
const mismaFecha = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const etiquetaSemana = (inicio: Date) => {
  const fin = sumarDias(inicio, 5);
  if (inicio.getMonth() === fin.getMonth())
    return `${inicio.getDate()} - ${fin.getDate()} de ${meses[fin.getMonth()]}, ${fin.getFullYear()}`;
  return `${inicio.getDate()} de ${meses[inicio.getMonth()]} - ${fin.getDate()} de ${meses[fin.getMonth()]}, ${fin.getFullYear()}`;
};
const citas: Cita[] = [
  {
    dia: 0,
    hora: '08:00',
    paciente: 'Maria Fernandez Lopez',
    ci: '4839201',
    doctor: 'Dra. Valeria Rojas',
    motivo: 'Consulta general',
    estado: 'Confirmada',
  },
  {
    dia: 0,
    hora: '09:30',
    paciente: 'Carlos Mendoza',
    ci: '7281044',
    doctor: 'Dr. Mauricio Vargas',
    motivo: 'Control medico',
    estado: 'Por confirmar',
  },
  {
    dia: 1,
    hora: '08:30',
    paciente: 'Ana Rodriguez Vargas',
    ci: '6102837',
    doctor: 'Dra. Elena Salazar',
    motivo: 'Laboratorio',
    estado: 'Confirmada',
  },
  {
    dia: 1,
    hora: '11:00',
    paciente: 'Jorge Quiroga',
    ci: '5948216',
    doctor: 'Dra. Valeria Rojas',
    motivo: 'Radiografia',
    estado: 'Por confirmar',
  },
  {
    dia: 2,
    hora: '10:00',
    paciente: 'Lucia Perez',
    ci: '8351702',
    doctor: 'Dr. Mauricio Vargas',
    motivo: 'Consulta general',
    estado: 'Cancelada',
  },
  {
    dia: 3,
    hora: '07:30',
    paciente: 'Roberto Salinas',
    ci: '4629185',
    doctor: 'Dra. Elena Salazar',
    motivo: 'Procedimiento',
    estado: 'Confirmada',
  },
  {
    dia: 4,
    hora: '12:30',
    paciente: 'Sofia Castillo',
    ci: '7013659',
    doctor: 'Dra. Valeria Rojas',
    motivo: 'Seguimiento',
    estado: 'Por confirmar',
  },
  {
    dia: 5,
    hora: '09:00',
    paciente: 'Diego Molina',
    ci: '6892473',
    doctor: 'Dr. Mauricio Vargas',
    motivo: 'Consulta general',
    estado: 'Confirmada',
  },
];

export function CitasRecepcionView() {
  const [modoAgendar, setModoAgendar] = useState(false);
  const [horarioElegido, setHorarioElegido] = useState<{
    fecha: string;
    hora: string;
  } | null>(null);
  const [citaInspeccionada, setCitaInspeccionada] = useState<Cita | null>(null);
  const [citaPorCobrar, setCitaPorCobrar] = useState<Cita | null>(null);
  const [confirmarCancelacion, setConfirmarCancelacion] = useState(false);
  const [doctor, setDoctor] = useState(doctores[0]);
  const [citasProgramadas, setCitasProgramadas] = useState(citas);
  const [agendarAbierto, setAgendarAbierto] = useState(false);
  const [errorAgenda, setErrorAgenda] = useState('');
  const [nuevaCita, setNuevaCita] = useState({
    paciente: '',
    ci: '',
    dia: 0,
    hora: '07:00',
    estado: 'Por confirmar' as EstadoCita,
  });
  const [semana, setSemana] = useState(() => new Date());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => new Date());
  const [mesVisible, setMesVisible] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [selectorDoctorAbierto, setSelectorDoctorAbierto] = useState(false);
  const selectorDoctorRef = useRef<HTMLDivElement>(null);
  const calendarioRef = useRef<HTMLDivElement>(null);
  const citasVisibles = useMemo(
    () =>
      citasProgramadas.filter(
        (cita) => doctor === doctores[0] || cita.doctor === doctor,
      ),
    [citasProgramadas, doctor],
  );
  const dias = useMemo(
    () =>
      Array.from({ length: 6 }, (_, indice) => {
        const fecha = sumarDias(semana, indice);
        return `${nombresDia[fecha.getDay()]} ${fecha.getDate()}`;
      }),
    [semana],
  );
  const fechasCalendario = useMemo(() => {
    const primerDia = inicioSemana(
      new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1),
    );
    return Array.from({ length: 42 }, (_, indice) =>
      sumarDias(primerDia, indice),
    );
  }, [mesVisible]);

  useEffect(() => {
    const cerrarSelector = (event: PointerEvent) => {
      if (!selectorDoctorRef.current?.contains(event.target as Node))
        setSelectorDoctorAbierto(false);
      if (!calendarioRef.current?.contains(event.target as Node))
        setCalendarioAbierto(false);
    };
    document.addEventListener('pointerdown', cerrarSelector);
    return () => document.removeEventListener('pointerdown', cerrarSelector);
  }, []);

  useEffect(() => {
    void apiFetch('/api/citas')
      .then(async (response) => {
        if (!response.ok) return;
        const remotas = (await response.json()) as Array<{
          id: string;
          paciente: string;
          ci: string;
          doctor: string;
          especialidad: string;
          fecha: string;
          hora: string;
          estado: 'por_confirmar' | 'confirmada' | 'cancelada';
        }>;
        setCitasProgramadas((actuales) => [
          ...actuales.filter((item) => !item.id),
          ...remotas.map((item): Cita => ({
            id: item.id,
            dia: 0,
            fecha: item.fecha,
            hora: item.hora,
            paciente: item.paciente,
            ci: item.ci,
            doctor: item.doctor,
            motivo: item.especialidad,
            estado:
              item.estado === 'confirmada'
                ? 'Confirmada'
                : item.estado === 'cancelada'
                  ? 'Cancelada'
                  : 'Por confirmar',
          })),
        ]);
      })
      .catch(() => undefined);
  }, []);

  const persistirEstado = (cita: Cita, estado: 'confirmada' | 'cancelada') => {
    if (cita.id)
      void apiFetch(`/api/citas/${cita.id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });
  };

  const seleccionarFecha = (fecha: Date) => {
    setFechaSeleccionada(fecha);
    setSemana(fecha);
    setCalendarioAbierto(false);
  };

  const irAHoy = () => {
    const hoy = new Date();
    setFechaSeleccionada(hoy);
    setSemana(hoy);
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  };

  const agendarConsulta = (event: React.FormEvent) => {
    event.preventDefault();
    if (
      citasProgramadas.some(
        (cita) =>
          cita.doctor === doctor &&
          cita.dia === nuevaCita.dia &&
          cita.hora === nuevaCita.hora &&
          cita.estado !== 'Cancelada',
      )
    ) {
      setErrorAgenda('El doctor ya tiene una consulta en ese horario.');
      return;
    }
    setCitasProgramadas((actuales) => [
      ...actuales,
      { ...nuevaCita, doctor, motivo: 'Consulta' },
    ]);
    setNuevaCita({
      paciente: '',
      ci: '',
      dia: 0,
      hora: '07:00',
      estado: 'Por confirmar',
    });
    setErrorAgenda('');
    setAgendarAbierto(false);
  };

  if (modoAgendar)
    return (
      <AgendarConsultaView
        doctorInicial={doctor === doctores[0] ? '' : doctor}
        fechaInicial={horarioElegido?.fecha}
        horaInicial={horarioElegido?.hora}
        consultaPendiente={
          citaPorCobrar
            ? {
                paciente: citaPorCobrar.paciente,
                ci: citaPorCobrar.ci,
                doctor: citaPorCobrar.doctor,
                especialidad: citaPorCobrar.motivo,
              }
            : undefined
        }
        onVolver={() => {
          setModoAgendar(false);
          setCitaPorCobrar(null);
        }}
        onAgendada={(datos) => {
          const fechaAgendada = new Date(`${datos.fecha}T00:00:00`);
          const inicioVisible = new Date(
            semana.getFullYear(),
            semana.getMonth(),
            semana.getDate(),
          );
          const diaAgendado = Math.round(
            (fechaAgendada.getTime() - inicioVisible.getTime()) / 86400000,
          );
          setCitasProgramadas((actuales) =>
            citaPorCobrar
              ? actuales.map((item) =>
                  item === citaPorCobrar
                    ? { ...item, estado: 'Confirmada' }
                    : item,
                )
              : [
                  ...actuales,
                  {
                    dia: Math.min(Math.max(diaAgendado, 0), 5),
                    hora: datos.hora,
                    paciente: datos.paciente,
                    ci: datos.ci,
                    doctor: datos.doctor,
                    motivo: 'Medicina general',
                    estado: 'Confirmada',
                  },
                ],
          );
          setDoctor(datos.doctor);
          if (citaPorCobrar) persistirEstado(citaPorCobrar, 'confirmada');
          setHorarioElegido(null);
          setCitaPorCobrar(null);
          setModoAgendar(false);
        }}
      />
    );

  return (
    <section className="citas-vista">
      <section className="panel citas-controles">
        <div className="citas-periodo">
          <button
            className="secundario citas-icono"
            type="button"
            onClick={() => setSemana((actual) => sumarDias(actual, -7))}
            aria-label="Semana anterior"
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <strong>{etiquetaSemana(semana)}</strong>
          <button
            className="secundario citas-icono"
            type="button"
            onClick={() => setSemana((actual) => sumarDias(actual, 7))}
            aria-label="Semana siguiente"
          >
            <Icon name="chevronRight" size={16} />
          </button>
          <div className="citas-calendario" ref={calendarioRef}>
            <button
              className="secundario citas-icono"
              type="button"
              aria-label="Elegir fecha"
              aria-expanded={calendarioAbierto}
              onClick={() => setCalendarioAbierto((abierto) => !abierto)}
            >
              <Icon name="calendar" size={16} />
            </button>
            {calendarioAbierto && (
              <div className="citas-calendario-panel">
                <header>
                  <button
                    type="button"
                    onClick={() =>
                      setMesVisible(
                        new Date(
                          mesVisible.getFullYear(),
                          mesVisible.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                    aria-label="Mes anterior"
                  >
                    <Icon name="chevronLeft" size={15} />
                  </button>
                  <strong>
                    {meses[mesVisible.getMonth()]} {mesVisible.getFullYear()}
                  </strong>
                  <button
                    type="button"
                    onClick={() =>
                      setMesVisible(
                        new Date(
                          mesVisible.getFullYear(),
                          mesVisible.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                    aria-label="Mes siguiente"
                  >
                    <Icon name="chevronRight" size={15} />
                  </button>
                </header>
                <div className="citas-calendario-semana">
                  {diasCalendario.map((dia) => (
                    <span key={dia}>{dia}</span>
                  ))}
                </div>
                <div className="citas-calendario-dias">
                  {fechasCalendario.map((fecha) => (
                    <button
                      className={`${fecha.getMonth() !== mesVisible.getMonth() ? 'otro-mes' : ''} ${mismaFecha(fecha, fechaSeleccionada) ? 'seleccionado' : ''} ${mismaFecha(fecha, new Date()) ? 'hoy' : ''}`}
                      type="button"
                      key={fecha.toISOString()}
                      onClick={() => seleccionarFecha(fecha)}
                      aria-label={fecha.toLocaleDateString('es-BO', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    >
                      {fecha.getDate()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            className="secundario citas-hoy"
            type="button"
            onClick={irAHoy}
          >
            Hoy
          </button>
        </div>
        <div className="citas-doctor">
          <span>Doctor</span>
          <div className="citas-doctor-selector" ref={selectorDoctorRef}>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={selectorDoctorAbierto}
              onClick={() => setSelectorDoctorAbierto((abierto) => !abierto)}
            >
              <strong>{doctor}</strong>
              <Icon name="chevronDown" size={15} />
            </button>
            {selectorDoctorAbierto && (
              <div
                className="citas-doctor-opciones"
                role="listbox"
                aria-label="Filtrar por doctor"
              >
                {doctores.map((item) => (
                  <button
                    className={item === doctor ? 'activo' : ''}
                    type="button"
                    role="option"
                    aria-selected={item === doctor}
                    key={item}
                    onClick={() => {
                      setDoctor(item);
                      setSelectorDoctorAbierto(false);
                    }}
                  >
                    {item}
                    <Icon name="check" size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="primario citas-agendar"
            type="button"
            onClick={() => {
              setHorarioElegido(null);
              setModoAgendar(true);
            }}
          >
            <Icon name="plus" size={15} /> Agendar consulta
          </button>
        </div>
      </section>
      <div className="citas-resumen">
        <span>
          <i className="confirmada" /> Confirmadas
        </span>
        <span>
          <i className="por-confirmar" /> Por confirmar
        </span>
        <span>
          <i className="cancelada" /> Canceladas
        </span>
        <small>{citasVisibles.length} citas programadas</small>
      </div>
      <section className="panel citas-agenda">
        <div className="agenda-tabla">
          <div className="agenda-encabezado">
            <div className="agenda-esquina">Hora</div>
            {dias.map((dia) => (
              <div className="agenda-dia" key={dia}>
                {dia}
              </div>
            ))}
          </div>
          {horas.map((hora) => (
            <div className="agenda-fila" key={hora}>
              <time>{hora}</time>
              {dias.map((_, dia) => {
                const cita = citasVisibles.find(
                  (item) =>
                    (item.fecha
                      ? item.fecha === fechaParaInput(sumarDias(semana, dia))
                      : item.dia === dia) &&
                    item.hora === hora &&
                    item.estado !== 'Cancelada',
                );
                return (
                  <div
                    className={`agenda-celda ${cita ? '' : 'libre'}`}
                    key={`${dia}-${hora}`}
                    role={cita ? undefined : 'button'}
                    tabIndex={cita ? undefined : 0}
                    aria-label={
                      cita
                        ? undefined
                        : `Agendar consulta el ${dias[dia]} a las ${hora}`
                    }
                    onClick={() => {
                      if (!cita) {
                        setHorarioElegido({
                          fecha: fechaParaInput(sumarDias(semana, dia)),
                          hora,
                        });
                        setModoAgendar(true);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        !cita &&
                        (event.key === 'Enter' || event.key === ' ')
                      ) {
                        event.preventDefault();
                        setHorarioElegido({
                          fecha: fechaParaInput(sumarDias(semana, dia)),
                          hora,
                        });
                        setModoAgendar(true);
                      }
                    }}
                  >
                    {cita && (
                      <article
                        className={`cita-bloque ${cita.estado.toLocaleLowerCase().replace(' ', '-')}`}
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          setCitaInspeccionada(cita);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setCitaInspeccionada(cita);
                          }
                        }}
                      >
                        <strong title={cita.paciente}>{cita.paciente}</strong>
                        <small>CI {cita.ci}</small>
                        <em>{cita.estado}</em>
                      </article>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
      {citaInspeccionada && (
        <div
          className="citas-modal-fondo"
          onClick={() => {
            setCitaInspeccionada(null);
            setConfirmarCancelacion(false);
          }}
        >
          <section
            className="cita-detalle-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>DETALLE DE CONSULTA</span>
                <h2>{citaInspeccionada.paciente}</h2>
              </div>
              <button
                type="button"
                onClick={() => setCitaInspeccionada(null)}
                aria-label="Cerrar"
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <dl>
              <div>
                <dt>CI</dt>
                <dd>{citaInspeccionada.ci}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  <em
                    className={citaInspeccionada.estado
                      .toLowerCase()
                      .replace(' ', '-')}
                  >
                    {citaInspeccionada.estado}
                  </em>
                </dd>
              </div>
              <div>
                <dt>Doctor</dt>
                <dd>{citaInspeccionada.doctor}</dd>
              </div>
              <div>
                <dt>Fecha y hora</dt>
                <dd>
                  {citaInspeccionada.fecha ?? dias[citaInspeccionada.dia]} ·{' '}
                  {citaInspeccionada.hora}
                </dd>
              </div>
              <div>
                <dt>Especialidad</dt>
                <dd>{citaInspeccionada.motivo}</dd>
              </div>
              <div>
                <dt>Pago</dt>
                <dd>
                  {citaInspeccionada.estado === 'Confirmada'
                    ? 'Pagado'
                    : 'Pendiente'}
                </dd>
              </div>
            </dl>
            {confirmarCancelacion ? (
              <div className="cita-cancelar-aviso">
                <Icon name="audit" size={22} />
                <div>
                  <strong>¿Seguro que deseas cancelar esta consulta?</strong>
                  <p>
                    El horario quedará libre para otro paciente. Esta acción
                    conservará el registro como cancelado.
                  </p>
                </div>
                <footer>
                  <button
                    className="secundario"
                    type="button"
                    onClick={() => setConfirmarCancelacion(false)}
                  >
                    No, volver
                  </button>
                  <button
                    className="cita-confirmar-cancelacion"
                    type="button"
                    onClick={() => {
                      persistirEstado(citaInspeccionada, 'cancelada');
                      setCitasProgramadas((actuales) =>
                        actuales.map((item) =>
                          item === citaInspeccionada
                            ? { ...item, estado: 'Cancelada' }
                            : item,
                        ),
                      );
                      setCitaInspeccionada(null);
                      setConfirmarCancelacion(false);
                    }}
                  >
                    Sí, cancelar consulta
                  </button>
                </footer>
              </div>
            ) : (
              citaInspeccionada.estado === 'Por confirmar' && (
                <footer className="cita-detalle-acciones">
                  <button
                    className="cita-cancelar"
                    type="button"
                    onClick={() => setConfirmarCancelacion(true)}
                  >
                    Cancelar consulta
                  </button>
                  <button
                    className="primario"
                    type="button"
                    onClick={() => {
                      setCitaPorCobrar(citaInspeccionada);
                      setHorarioElegido({
                        fecha:
                          citaInspeccionada.fecha ??
                          fechaParaInput(
                            sumarDias(semana, citaInspeccionada.dia),
                          ),
                        hora: citaInspeccionada.hora,
                      });
                      setCitaInspeccionada(null);
                      setModoAgendar(true);
                    }}
                  >
                    <Icon name="check" size={15} /> Confirmar y cobrar
                  </button>
                </footer>
              )
            )}
          </section>
        </div>
      )}
      {agendarAbierto && (
        <div
          className="citas-modal-fondo"
          onClick={() => setAgendarAbierto(false)}
        >
          <form
            className="citas-modal"
            onSubmit={agendarConsulta}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>NUEVA CONSULTA</span>
                <h2>{doctor}</h2>
              </div>
              <button
                type="button"
                onClick={() => setAgendarAbierto(false)}
                aria-label="Cerrar"
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="citas-modal-campos">
              <label>
                Nombre completo
                <input
                  required
                  value={nuevaCita.paciente}
                  onChange={(event) =>
                    setNuevaCita({ ...nuevaCita, paciente: event.target.value })
                  }
                />
              </label>
              <label>
                CI
                <input
                  required
                  value={nuevaCita.ci}
                  onChange={(event) =>
                    setNuevaCita({ ...nuevaCita, ci: event.target.value })
                  }
                />
              </label>
              <label>
                Día
                <select
                  value={nuevaCita.dia}
                  onChange={(event) =>
                    setNuevaCita({
                      ...nuevaCita,
                      dia: Number(event.target.value),
                    })
                  }
                >
                  {dias.map((dia, indice) => (
                    <option value={indice} key={dia}>
                      {dia}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Hora
                <select
                  value={nuevaCita.hora}
                  onChange={(event) =>
                    setNuevaCita({ ...nuevaCita, hora: event.target.value })
                  }
                >
                  {horas.map((hora) => (
                    <option key={hora}>{hora}</option>
                  ))}
                </select>
              </label>
              <label className="citas-modal-estado">
                Estado
                <select
                  value={nuevaCita.estado}
                  onChange={(event) =>
                    setNuevaCita({
                      ...nuevaCita,
                      estado: event.target.value as EstadoCita,
                    })
                  }
                >
                  <option>Por confirmar</option>
                  <option>Confirmada</option>
                </select>
              </label>
            </div>
            {errorAgenda && <p className="citas-modal-error">{errorAgenda}</p>}
            <footer>
              <button
                className="secundario"
                type="button"
                onClick={() => setAgendarAbierto(false)}
              >
                Cancelar
              </button>
              <button className="primario" type="submit">
                <Icon name="calendar" size={15} /> Guardar consulta
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
