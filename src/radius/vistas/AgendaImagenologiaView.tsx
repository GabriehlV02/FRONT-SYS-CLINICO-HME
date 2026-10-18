import { useMemo, useState } from 'react';
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

const estudiosIniciales: EstudioAgendado[] = [
  { id: 'img-1', hora: '08:00', paciente: 'María Fernanda Rojas', ci: '4839201', modalidad: 'Tomografía', estudio: 'TC de cráneo sin contraste', preparacion: 'Retirar objetos metálicos', estado: 'Confirmado' },
  { id: 'img-2', hora: '08:40', paciente: 'Carlos Mendoza López', ci: '7281044', modalidad: 'Radiografía', estudio: 'Radiografía de tórax PA', preparacion: 'Sin preparación especial', estado: 'Confirmado' },
  { id: 'img-3', hora: '09:15', paciente: 'Ana Rodríguez Vargas', ci: '6102837', modalidad: 'Ecografía', estudio: 'Ecografía abdominal', preparacion: 'Ayuno de 6 horas', estado: 'En preparación' },
  { id: 'img-4', hora: '10:00', paciente: 'Jorge Quiroga Salinas', ci: '5948216', modalidad: 'Ecocardiograma', estudio: 'Ecocardiograma Doppler', preparacion: 'Ropa cómoda', estado: 'Confirmado' },
  { id: 'img-5', hora: '10:45', paciente: 'Sofía Castillo Flores', ci: '7013659', modalidad: 'Electrocardiograma', estudio: 'ECG de 12 derivaciones', preparacion: 'Reposo previo de 10 min', estado: 'Confirmado' },
  { id: 'img-6', hora: '11:30', paciente: 'Luis Alberto Pérez', ci: '6751042', modalidad: 'Holter', estudio: 'Holter cardíaco de 24 horas', preparacion: 'Piel limpia, sin cremas', estado: 'Confirmado' },
];

const modalidadClase = (modalidad: Modalidad) => modalidad.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll(' ', '-');

export default function AgendaImagenologiaView() {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'Todos' | Modalidad>('Todos');
  const [completados, setCompletados] = useState<Set<string>>(() => new Set());

  const pendientes = useMemo(() => estudiosIniciales.filter((estudio) => {
    const texto = `${estudio.paciente} ${estudio.ci} ${estudio.modalidad} ${estudio.estudio}`.toLocaleLowerCase();
    return !completados.has(estudio.id) && (filtro === 'Todos' || estudio.modalidad === filtro) && texto.includes(busqueda.trim().toLocaleLowerCase());
  }), [busqueda, completados, filtro]);
  const realizados = estudiosIniciales.filter((estudio) => completados.has(estudio.id));
  const modalidades = Array.from(new Set(estudiosIniciales.map((estudio) => estudio.modalidad)));

  return <section className="agenda-imagenologia" aria-label="Agenda de estudios de imagenología">
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
        <header><span>HORA</span><span>PACIENTE</span><span>ESTUDIO PROGRAMADO</span><span>PREPARACIÓN</span><span>ESTADO</span><span>ACCIÓN</span></header>
        {pendientes.length ? pendientes.map((estudio) => <article key={estudio.id}>
          <time>{estudio.hora}</time>
          <div className="agenda-estudio-paciente"><i>{estudio.paciente.split(' ').map((parte) => parte[0]).slice(0, 2).join('')}</i><span><strong>{estudio.paciente}</strong><small>CI {estudio.ci}</small></span></div>
          <div className="agenda-estudio-modalidad"><b className={modalidadClase(estudio.modalidad)}><Icon name={estudio.modalidad === 'Electrocardiograma' || estudio.modalidad === 'Holter' ? 'audit' : 'image'} size={16}/>{estudio.modalidad}</b><strong>{estudio.estudio}</strong></div>
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
