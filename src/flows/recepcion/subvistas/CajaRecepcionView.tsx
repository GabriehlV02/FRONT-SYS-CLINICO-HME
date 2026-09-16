import { useMemo, useState } from 'react';
import Icon from '../../../radius/componentes/Icono';

type Paciente = { id: number; nombre: string; documento: string };
type Servicio = { id: number; nombre: string; categoria: string; precio: number };
type Consumo = Servicio & { cantidad: number };

const pacientes: Paciente[] = [
  { id: 1, nombre: 'Maria Fernandez', documento: 'CI 4839201' },
  { id: 2, nombre: 'Carlos Mendoza', documento: 'CI 7281044' },
  { id: 3, nombre: 'Ana Rodriguez', documento: 'CI 6102837' },
];

const servicios: Servicio[] = [
  { id: 1, nombre: 'Consulta medica', precio: 50, categoria: 'Consultas' },
  { id: 2, nombre: 'Radiografia panoramica', precio: 80, categoria: 'Imagenologia' },
  { id: 3, nombre: 'Limpieza dental', precio: 30, categoria: 'Odontologia' },
  { id: 4, nombre: 'Laboratorio basico', precio: 45, categoria: 'Examenes' },
];

const historialPorPaciente: Record<number, { id: number; fecha: string; servicio: string; total: number }[]> = {
  1: [
    { id: 1, fecha: '10/05/2026', servicio: 'Consulta general', total: 50 },
    { id: 2, fecha: '15/02/2026', servicio: 'Limpieza dental', total: 30 },
  ],
};

export function CajaRecepcionView() {
  const [historialVisible, setHistorialVisible] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [consumo, setConsumo] = useState<Consumo[]>([]);

  const pacientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();
    if (!termino) return [];
    return pacientes.filter((item) =>
      `${item.nombre} ${item.documento}`.toLocaleLowerCase().includes(termino),
    );
  }, [busqueda]);

  const subtotal = consumo.reduce((total, item) => total + item.precio * item.cantidad, 0);
  const historialPaciente = paciente ? historialPorPaciente[paciente.id] ?? [] : [];
  const historialActivo = historialVisible && historialPaciente.length > 0;
  const agregarServicio = (servicio: Servicio) => {
    setConsumo((actual) => {
      const existente = actual.find((item) => item.id === servicio.id);
      return existente
        ? actual.map((item) => item.id === servicio.id ? { ...item, cantidad: item.cantidad + 1 } : item)
        : [...actual, { ...servicio, cantidad: 1 }];
    });
  };

  return (
    <section style={{ display: 'grid', gridTemplateColumns: historialActivo ? '240px minmax(320px, 1fr) 330px' : 'minmax(0, 1fr) 330px', minHeight: 'calc(100vh - 220px)', gap: 16 }}>
      {historialActivo ? (
        <aside className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="panel-cabecera"><div><span>HISTORIAL</span><h2>Consumos previos</h2></div><button className="secundario" onClick={() => setHistorialVisible(false)} aria-label="Ocultar historial">Ocultar</button></div>
          {historialPaciente.map((item) => (
            <div key={item.id} style={{ display: 'grid', gap: 4, padding: '13px 15px', borderBottom: '1px solid var(--border)' }}><small>{item.fecha}</small><strong>{item.servicio}</strong><b>Bs {item.total.toFixed(2)}</b></div>
          ))}
        </aside>
      ) : paciente && historialPaciente.length > 0 ? (
        <button className="secundario" onClick={() => setHistorialVisible(true)} aria-label="Mostrar historial">Mostrar historial</button>
      ) : null}

      <section className="panel" style={{ padding: 18 }}>
        <div className="panel-cabecera"><div><span>RECEPCION</span><h2>Catalogo de servicios</h2><p>Selecciona los servicios que se agregaran a la cuenta.</p></div></div>
        <div className="quick-grid" style={{ marginTop: 14 }}>
          {servicios.map((servicio) => (
            <button key={servicio.id} onClick={() => agregarServicio(servicio)}>
              <small>{servicio.categoria}</small><strong>{servicio.nombre}</strong><b>Bs {servicio.precio.toFixed(2)}</b>
            </button>
          ))}
        </div>
      </section>

      <aside className="panel" style={{ padding: 16 }}>
        <div className="panel-cabecera"><div><span>CAJA</span><h2>Detalle de cobro</h2></div></div>
        <div className="clinica-acciones"><button className="secundario" type="button" onClick={() => setPaciente(null)}><Icon name="plus" size={15} /> Registrar paciente</button></div>
        <label className="buscador-local"><Icon name="search" size={16} /><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar paciente o CI" /></label>
        {pacientesFiltrados.length > 0 && <div className="search-results">{pacientesFiltrados.map((item) => <button key={item.id} onClick={() => { setPaciente(item); setBusqueda(''); }}>{item.nombre}<small>{item.documento}</small></button>)}</div>}
        <div className="ficha-datos"><div><small>Paciente para factura</small><strong>{paciente?.nombre || 'Consumidor final'}</strong><span>{paciente?.documento || 'Sin paciente seleccionado'}</span>{paciente && historialPaciente.length === 0 && <em>Sin consumos previos registrados</em>}</div></div>
        <div className="clinica-tabla"><div><strong>Consumo actual</strong></div>{consumo.length === 0 ? <p className="modulo-vacio">Agrega un servicio del catalogo.</p> : consumo.map((item) => <div key={item.id}><span>{item.nombre} <small>x{item.cantidad}</small></span><b>Bs {(item.precio * item.cantidad).toFixed(2)}</b></div>)}</div>
        <div className="clinica-acciones"><strong>Subtotal: Bs {subtotal.toFixed(2)}</strong><button className="primario" disabled={consumo.length === 0}>Proceder al pago <Icon name="arrowRight" size={15} /></button></div>
      </aside>
    </section>
  );
}
