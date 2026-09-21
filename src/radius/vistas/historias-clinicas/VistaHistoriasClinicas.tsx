import { useMemo, useState } from 'react';
import Icon from '../../componentes/Icono';
import './VistaHistoriasClinicas.css';
import './MedicosDesplegable.css';
import './HistoriaPaciente.css';
import './HistoriaPacienteAcciones.css';
import './HistoriaPacienteFiltros.css';

type Vista = 'historias' | 'estudios';

type Paciente = {
  codigo: string;
  ci: string;
  nombre: string;
  apellido: string;
  modificado: string;
  medicos: string[];
  estudiosImagen: number;
  laboratorios: number;
};

const pacientes: Paciente[] = [
  { codigo: 'HC-000184', ci: '7345128', nombre: 'Andrea', apellido: 'Mendoza', modificado: '2026-09-18', medicos: ['Dra. C. Rojas', 'Dr. M. Salazar'], estudiosImagen: 4, laboratorios: 7 },
  { codigo: 'HC-000062', ci: '5823147', nombre: 'Bruno', apellido: 'Aponte', modificado: '2026-09-16', medicos: ['Dr. J. Vargas'], estudiosImagen: 1, laboratorios: 3 },
  { codigo: 'HC-000219', ci: '8912640', nombre: 'Camila', apellido: 'Flores', modificado: '2026-09-10', medicos: ['Dra. L. Paredes'], estudiosImagen: 2, laboratorios: 5 },
  { codigo: 'HC-000107', ci: '6432189', nombre: 'Diego', apellido: 'Quispe', modificado: '2026-08-27', medicos: ['Dr. M. Salazar', 'Dra. V. Núñez'], estudiosImagen: 3, laboratorios: 2 },
  { codigo: 'HC-000031', ci: '4751902', nombre: 'Elena', apellido: 'Torrez', modificado: '2026-07-21', medicos: ['Dra. C. Rojas'], estudiosImagen: 0, laboratorios: 1 },
];

const formatearFecha = (fecha: string) => new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${fecha}T12:00:00`));
const tipoEstudioPorCodigo: Record<string, 'Imagenología' | 'Laboratorio'> = { 'HC-000184': 'Imagenología', 'HC-000062': 'Laboratorio', 'HC-000219': 'Imagenología', 'HC-000107': 'Laboratorio', 'HC-000031': 'Laboratorio' };

const episodios = [
  { fecha: '2026-09-18', tipo: 'Consulta', detalle: 'Consulta de medicina interna y actualización de tratamiento.', profesional: 'Dra. C. Rojas', estado: 'Cerrado', icono: 'userCheck' as const },
  { fecha: '2026-08-29', tipo: 'Procedimiento', detalle: 'Curación ambulatoria y control de evolución.', profesional: 'Lic. P. Arce', estado: 'Cerrado', icono: 'check' as const },
  { fecha: '2026-07-15', tipo: 'Emergencia', detalle: 'Atención por dolor agudo; alta con indicaciones.', profesional: 'Dr. M. Salazar', estado: 'Cerrado', icono: 'bell' as const },
  { fecha: '2026-05-04', tipo: 'Internación', detalle: 'Observación clínica y seguimiento por 48 horas.', profesional: 'Dra. L. Paredes', estado: 'Cerrado', icono: 'building' as const },
  { fecha: '2026-02-11', tipo: 'Cirugía', detalle: 'Procedimiento quirúrgico programado sin complicaciones.', profesional: 'Dr. J. Vargas', estado: 'Cerrado', icono: 'fileText' as const },
];

const especialidadPorTipo: Record<string, string> = {
  Consulta: 'Medicina interna', Procedimiento: 'Enfermería', Emergencia: 'Emergencias', 'Internación': 'Medicina interna', 'Cirugía': 'Cirugía general',
};

export function VistaHistoriasClinicas({ vista }: { vista: Vista }) {
  const [busqueda, setBusqueda] = useState('');
  const [periodo, setPeriodo] = useState('todos');
  const [orden, setOrden] = useState('az');
  const [tipoEstudio, setTipoEstudio] = useState('');
  const [medicoOrdeno, setMedicoOrdeno] = useState('');
  const [desdeEstudios, setDesdeEstudios] = useState('');
  const [hastaEstudios, setHastaEstudios] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [pacienteRevisado, setPacienteRevisado] = useState<Paciente | null>(null);
  const [busquedaHistoria, setBusquedaHistoria] = useState('');
  const [tipoRegistro, setTipoRegistro] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [medicoRegistro, setMedicoRegistro] = useState('');
  const [especialidadRegistro, setEspecialidadRegistro] = useState('');
  const esEstudios = vista === 'estudios';

  const filas = useMemo(() => {
    const limite = periodo === '7' ? new Date('2026-09-12') : periodo === '30' ? new Date('2026-08-20') : periodo === '90' ? new Date('2026-06-21') : null;
    const consulta = busqueda.trim().toLocaleLowerCase('es');
    return pacientes
      .filter((paciente) => !limite || new Date(`${paciente.modificado}T12:00:00`) >= limite)
      .filter((paciente) => !esEstudios || ((!tipoEstudio || tipoEstudioPorCodigo[paciente.codigo] === tipoEstudio) && (!medicoOrdeno || paciente.medicos[0] === medicoOrdeno) && (!desdeEstudios || paciente.modificado >= desdeEstudios) && (!hastaEstudios || paciente.modificado <= hastaEstudios)))
      .filter((paciente) => !consulta || [paciente.codigo, paciente.ci, paciente.nombre, paciente.apellido, ...paciente.medicos].join(' ').toLocaleLowerCase('es').includes(consulta))
      .sort((a, b) => {
        const comparacion = `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es');
        return orden === 'za' ? -comparacion : comparacion;
      });
  }, [busqueda, desdeEstudios, esEstudios, hastaEstudios, medicoOrdeno, orden, periodo, tipoEstudio]);
  const episodiosFiltrados = useMemo(() => {
    const consulta = busquedaHistoria.trim().toLocaleLowerCase('es');
    return episodios.filter((episodio) =>
      (!consulta || `${episodio.tipo} ${episodio.detalle} ${episodio.profesional}`.toLocaleLowerCase('es').includes(consulta)) &&
      (!tipoRegistro || episodio.tipo === tipoRegistro) && (!desde || episodio.fecha >= desde) && (!hasta || episodio.fecha <= hasta) &&
      (!medicoRegistro || episodio.profesional === medicoRegistro) && (!especialidadRegistro || especialidadPorTipo[episodio.tipo] === especialidadRegistro),
    );
  }, [busquedaHistoria, tipoRegistro, desde, hasta, medicoRegistro, especialidadRegistro]);

  if (pacienteRevisado) return (
    <section className="historia-paciente-vista" aria-label={`Historia clínica de ${pacienteRevisado.nombre} ${pacienteRevisado.apellido}`}>
      <header className="historia-paciente-cabecera">
        <button type="button" onClick={() => setPacienteRevisado(null)}><Icon name="chevronLeft" size={17} /> Volver al listado</button>
        <div className="historia-paciente-identidad">
          <p>HISTORIA CLÍNICA DEL PACIENTE</p>
          <div>
            <h2>{pacienteRevisado.nombre} {pacienteRevisado.apellido}</h2>
            <small>{pacienteRevisado.codigo} · CI {pacienteRevisado.ci} · {pacienteRevisado.medicos.length} médicos relacionados</small>
          </div>
        </div>
      </header>
      <section className="historia-paciente-panel">
        <div className="historia-paciente-panel-cabecera"><div><strong>Registro clínico</strong><small>Consultas, internaciones, cirugías, emergencias y procedimientos</small></div><span>{episodios.length} registros</span></div>
        <div className="historia-paciente-filtros">
          <label className="historia-paciente-buscador"><Icon name="search" size={17} /><input value={busquedaHistoria} onChange={(evento) => setBusquedaHistoria(evento.target.value)} placeholder="Buscar en el registro clínico" aria-label="Buscar en la historia clínica" /></label>
          <select value={tipoRegistro} onChange={(evento) => setTipoRegistro(evento.target.value)} aria-label="Filtrar por tipo"><option value="">Todos los tipos</option>{[...new Set(episodios.map((episodio) => episodio.tipo))].map((tipo) => <option key={tipo}>{tipo}</option>)}</select>
          <label className="historia-paciente-fecha"><span>Desde</span><input type="date" value={desde} onChange={(evento) => setDesde(evento.target.value)} aria-label="Fecha inicial" /></label>
          <label className="historia-paciente-fecha"><span>Hasta</span><input type="date" value={hasta} onChange={(evento) => setHasta(evento.target.value)} aria-label="Fecha final" /></label>
          <select value={medicoRegistro} onChange={(evento) => setMedicoRegistro(evento.target.value)} aria-label="Filtrar por médico"><option value="">Todos los médicos</option>{[...new Set(episodios.map((episodio) => episodio.profesional))].map((medico) => <option key={medico}>{medico}</option>)}</select>
          <select value={especialidadRegistro} onChange={(evento) => setEspecialidadRegistro(evento.target.value)} aria-label="Filtrar por especialidad"><option value="">Todas las especialidades</option>{[...new Set(episodios.map((episodio) => especialidadPorTipo[episodio.tipo] ?? 'General'))].map((especialidad) => <option key={especialidad}>{especialidad}</option>)}</select>
        </div>
        <div className="historia-paciente-tabla-contenedor">
          <div className="historia-paciente-tabla" role="table" aria-label="Registro clínico del paciente">
            <div className="historia-paciente-fila historia-paciente-columnas" role="row"><span>Fecha</span><span>Tipo de atención</span><span>Detalle</span><span>Profesional responsable</span><span>Estado</span><span>Opciones</span></div>
            {episodiosFiltrados.map((episodio) => <div className="historia-paciente-fila" role="row" key={`${episodio.fecha}-${episodio.tipo}`}>
              <time dateTime={episodio.fecha}>{formatearFecha(episodio.fecha)}</time>
              <div className="historia-tipo"><span><Icon name={episodio.icono} size={16} /></span><strong>{episodio.tipo}</strong></div>
              <p>{episodio.detalle}</p><span>{episodio.profesional}</span><em>{episodio.estado}</em>
              <div className="historia-paciente-acciones">
                <button type="button" onClick={() => setMensaje(`Detalle de ${episodio.tipo} abierto en el sistema.`)}>🖥️ Sistema</button>
                <button type="button" onClick={() => setMensaje(`Documento de ${episodio.tipo} preparado para visualizar.`)}>📄 Documento</button>
              </div>
            </div>)}
            {!episodiosFiltrados.length && <div className="historia-paciente-vacio">No hay registros que coincidan con los filtros seleccionados.</div>}
          </div>
        </div>
        {mensaje && <p className="historia-paciente-aviso" role="status">{mensaje}</p>}
      </section>
    </section>
  );

  return (
    <section className="historias-vista" aria-label={esEstudios ? 'Estudios del paciente' : 'Historias clínicas'}>
      <header className="historias-cabecera">
        <div>
          <p>HISTORIAS CLÍNICAS</p>
          <h2>{esEstudios ? 'Estudios del paciente' : 'Historias clínicas'}</h2>
          <small>{esEstudios ? 'Localice al paciente para consultar sus estudios asociados.' : 'Consulte y gestione la información clínica de los pacientes.'}</small>
        </div>
      </header>

      <section className="historias-panel">
        <div className="historias-filtros">
          <label className="historias-buscador">
            <Icon name="search" size={18} />
            <input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por código, CI, nombre o médico" aria-label="Buscar paciente" />
          </label>
          {esEstudios ? <>
            <select value={tipoEstudio} onChange={(evento) => setTipoEstudio(evento.target.value)} aria-label="Filtrar por tipo de estudio"><option value="">Imagenología o Laboratorio</option><option>Imagenología</option><option>Laboratorio</option></select>
            <select value={medicoOrdeno} onChange={(evento) => setMedicoOrdeno(evento.target.value)} aria-label="Filtrar por médico que ordenó"><option value="">Médico que ordenó</option>{[...new Set(pacientes.map((paciente) => paciente.medicos[0]))].map((medico) => <option key={medico}>{medico}</option>)}</select>
            <label className="historias-fecha"><span>Desde</span><input type="date" value={desdeEstudios} onChange={(evento) => setDesdeEstudios(evento.target.value)} aria-label="Fecha inicial" /></label>
            <label className="historias-fecha"><span>Hasta</span><input type="date" value={hastaEstudios} onChange={(evento) => setHastaEstudios(evento.target.value)} aria-label="Fecha final" /></label>
          </> : <>
            <select value={periodo} onChange={(evento) => setPeriodo(evento.target.value)} aria-label="Filtrar por fecha de modificación"><option value="todos">Todas las fechas</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option></select>
            <select value={orden} onChange={(evento) => setOrden(evento.target.value)} aria-label="Ordenar pacientes"><option value="az">Apellido: A a Z</option><option value="za">Apellido: Z a A</option></select>
          </>}
        </div>

        {mensaje && <p className="historias-aviso" role="status">{mensaje}</p>}
        <div className="historias-tabla-contenedor">
          <div className={`historias-tabla ${esEstudios ? 'historias-tabla-estudios' : ''}`} role="table" aria-label="Listado de pacientes">
            <div className={`historias-fila historias-columnas ${esEstudios ? 'historias-fila-estudios' : ''}`} role="row">
              <span>Código / CI</span><span>Nombre</span><span>Apellido</span><span>Última modificación</span><span>Médicos relacionados</span>
              {esEstudios && <><span>Estudios de imagen</span><span>Laboratorios</span></>}
              <span>Opciones</span>
            </div>
            {filas.map((paciente) => (
              <div className={`historias-fila ${esEstudios ? 'historias-fila-estudios' : ''}`} role="row" key={paciente.codigo}>
                <div><strong>{paciente.codigo}</strong><small>CI {paciente.ci}</small></div>
                <span>{paciente.nombre}</span>
                <span>{paciente.apellido}</span>
                <time dateTime={paciente.modificado}>{formatearFecha(paciente.modificado)}</time>
                <details className="historias-medicos">
                  <summary aria-label={`Ver médicos relacionados con ${paciente.nombre} ${paciente.apellido}`}>
                    <Icon name="users" size={14} />
                    <span>{paciente.medicos.length} {paciente.medicos.length === 1 ? 'médico relacionado' : 'médicos relacionados'}</span>
                    <Icon className="historias-medicos-flecha" name="chevronDown" size={14} />
                  </summary>
                  <div aria-label="Médicos relacionados">
                    {paciente.medicos.map((medico) => <span key={medico}>{medico}</span>)}
                  </div>
                </details>
                {esEstudios && <><span className="historias-conteo">{paciente.estudiosImagen}</span><span className="historias-conteo">{paciente.laboratorios}</span></>}
                <div className="historias-acciones">
                  <button type="button" onClick={() => setMensaje(`Edición de ${paciente.nombre} ${paciente.apellido} preparada.`)} aria-label={`Editar historia de ${paciente.nombre} ${paciente.apellido}`}><Icon name="edit" size={15} /> Editar</button>
                  <button type="button" onClick={() => setPacienteRevisado(paciente)} aria-label={`Revisar historia de ${paciente.nombre} ${paciente.apellido}`}><Icon name="fileText" size={15} /> Revisar</button>
                </div>
              </div>
            ))}
            {!filas.length && <div className="historias-vacio">No se encontraron pacientes con los filtros seleccionados.</div>}
          </div>
        </div>
      </section>
    </section>
  );
}
