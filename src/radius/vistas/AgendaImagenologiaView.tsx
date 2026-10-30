import { useMemo, useState } from 'react';
import { useEstudiosPacientes } from './pacientes/useEstudiosPacientes';
import Icon from '../componentes/Icono';
import './AgendaImagenologiaView.css';

type Modalidad = 'Tomografía' | 'Radiografía' | 'Ecografía' | 'Ecocardiograma' | 'Electrocardiograma' | 'Holter';
type EstudioAgendado = {
  id: string;
  hora: string;
  paciente: string;
  ci: string;
  modalidad: Modalidad;
  estudio: string;
  preparacion: string;
  estado: 'Confirmado' | 'En preparación';
};



const modalidadClase = (modalidad: Modalidad) => modalidad.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll(' ', '-');

export default function AgendaImagenologiaView() {
  const {estudios,errorEstudios}=useEstudiosPacientes();
  const estudiosIniciales:EstudioAgendado[]=estudios.map(e=>({id:e.id,hora:e.solicitado_en.slice(11,16),paciente:[e.nombres,e.apellido_paterno,e.apellido_materno].join(' '),ci:e.ci,modalidad:({TOMOGRAFIA:'Tomografía',ECOGRAFIA:'Ecografía',ECOCARDIOGRAMA:'Ecocardiograma',RADIOGRAFIA:'Radiografía'} as Record<string,Modalidad>)[e.tipo] || 'Radiografía',estudio:e.nombre,preparacion:e.indicaciones || 'Sin indicaciones registradas',estado:e.estado==='EN_PROCESO'?'En preparación':'Confirmado'}));
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'Todos' | Modalidad>('Todos');
  const [completados, setCompletados] = useState<Set<string>>(() => new Set());

  const pendientes = useMemo(() => estudiosIniciales.filter((estudio) => {
    const texto = `${estudio.paciente} ${estudio.ci} ${estudio.modalidad} ${estudio.estudio}`.toLocaleLowerCase();
    return !completados.has(estudio.id) && (filtro === 'Todos' || estudio.modalidad === filtro) && texto.includes(busqueda.trim().toLocaleLowerCase());
  }), [busqueda, completados, filtro, estudios]);
  const realizados = estudiosIniciales.filter((estudio) => completados.has(estudio.id));
  const modalidades = Array.from(new Set(estudiosIniciales.map((estudio) => estudio.modalidad)));

  return <section className="agenda-imagenologia" aria-label="Agenda de estudios de imagenología">{errorEstudios && <p role="alert">{errorEstudios}</p>}
    <header className="agenda-imagenologia-cabecera">
      <div>
        <span>AGENDA DIAGNÓSTICA</span>
        <h2>Estudios programados para hoy</h2>
        <p>Identifica la modalidad, el protocolo y la preparación antes de iniciar cada toma.</p>
      </div>
      <div className="agenda-imagenologia-resumen" aria-label="Resumen de la jornada">
        <strong>{estudiosIniciales.length}<small>programados</small></strong>
        <strong>{pendientes.length}<small>por realizar</small></strong>
        <strong>{realizados.length}<small>completados</small></strong>
      </div>
    </header>

    <div className="agenda-imagenologia-filtros">
      <label><Icon name="search" size={17}/><input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar paciente, CI o estudio" /></label>
      <div className="agenda-modalidades" aria-label="Filtrar por modalidad">
        {(['Todos', ...modalidades] as const).map((modalidad) => <button type="button" key={modalidad} className={filtro === modalidad ? 'activo' : ''} onClick={() => setFiltro(modalidad)}>{modalidad}</button>)}
      </div>
    </div>

    <div className="agenda-imagenologia-contenido">
      <section className="agenda-estudios-lista">
        <header><span>HORA</span><span>PACIENTE</span><span>TIPO DE ESTUDIO</span><span>PARTE / PIEZA</span><span>PREPARACIÓN</span><span>ESTADO</span><span>ACCIÓN</span></header>
        {pendientes.length ? pendientes.map((estudio) => <article key={estudio.id}>
          <time>{estudio.hora}</time>
          <div className="agenda-estudio-paciente"><i>{estudio.paciente.split(' ').map((parte) => parte[0]).slice(0, 2).join('')}</i><span><strong>{estudio.paciente}</strong><small>CI {estudio.ci}</small></span></div>
          <div className="agenda-estudio-modalidad"><b className={modalidadClase(estudio.modalidad)}><Icon name={estudio.modalidad === 'Electrocardiograma' || estudio.modalidad === 'Holter' ? 'audit' : 'image'} size={16}/>{estudio.modalidad}</b></div>
          <div className="agenda-estudio-parte"><strong>{estudio.estudio}</strong></div>
          <div className="agenda-estudio-preparacion"><Icon name="fileText" size={16}/><span>{estudio.preparacion}</span></div>
          <span className={`agenda-estudio-estado ${estudio.estado === 'Confirmado' ? 'confirmado' : 'preparacion'}`}>{estudio.estado}</span>
          <button type="button" onClick={() => setCompletados((actuales) => new Set(actuales).add(estudio.id))}><Icon name="camera" size={15}/> Iniciar estudio</button>
        </article>) : <div className="agenda-estudios-vacio"><Icon name="image" size={28}/><strong>No hay estudios pendientes</strong><small>Cambia los filtros o revisa los estudios completados.</small></div>}
      </section>

      <aside className="agenda-imagenologia-lateral">
        <header><div><span>REALIZADOS HOY</span><strong>Estudios completados</strong></div><b>{realizados.length}</b></header>
        {realizados.length ? realizados.map((estudio) => <article key={estudio.id}><i className={modalidadClase(estudio.modalidad)}><Icon name="check" size={15}/></i><div><strong>{estudio.paciente}</strong><small>{estudio.modalidad}</small><small>{estudio.estudio} · {estudio.hora}</small></div></article>) : <div className="agenda-imagenologia-sin-realizados"><Icon name="camera" size={24}/><p>Aún no se registraron estudios realizados.</p></div>}
        <footer><Icon name="check" size={15}/><span>Al iniciar un estudio se moverá a esta lista.</span></footer>
      </aside>
    </div>
  </section>;
}
