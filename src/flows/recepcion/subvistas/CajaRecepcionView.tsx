import { useMemo, useState } from 'react';
import Icon from '../../../radius/componentes/Icono';

type Paciente = { id: number; nombre: string; documento: string; tipo: string };
type Servicio = { id: number; nombre: string; categoria: string; precio: number };
type Consumo = Servicio & { cantidad: number };
type MetodoPago = 'efectivo' | 'qr' | 'tarjeta' | 'transferencia';

const pacientes: Paciente[] = [
  { id: 1, nombre: 'Maria Fernandez', documento: 'CI 4839201', tipo: 'Particular' },
  { id: 2, nombre: 'Carlos Mendoza', documento: 'CI 7281044', tipo: 'Convenio' },
  { id: 3, nombre: 'Ana Rodriguez', documento: 'CI 6102837', tipo: 'Particular' },
];

const servicios: Servicio[] = [
  { id: 1, nombre: 'Consulta medica', precio: 50, categoria: 'Consultas' },
  { id: 2, nombre: 'Radiografia panoramica', precio: 80, categoria: 'Imagenologia' },
  { id: 3, nombre: 'Limpieza dental', precio: 30, categoria: 'Odontologia' },
  { id: 4, nombre: 'Laboratorio basico', precio: 45, categoria: 'Examenes' },
  { id: 5, nombre: 'Curacion ambulatoria', precio: 35, categoria: 'Enfermeria' },
  { id: 6, nombre: 'Certificado medico', precio: 25, categoria: 'Documentos' },
];

const historialPorPaciente: Record<number, { id: number; fecha: string; servicio: string; total: number; estado: string }[]> = {
  1: [
    { id: 1, fecha: '10/05/2026', servicio: 'Consulta general', total: 50, estado: 'Pagado' },
    { id: 2, fecha: '15/02/2026', servicio: 'Limpieza dental', total: 30, estado: 'Pagado' },
  ],
  2: [
    { id: 3, fecha: '02/07/2026', servicio: 'Laboratorio basico', total: 45, estado: 'Pagado' },
  ],
};

const metodosPago: { id: MetodoPago; nombre: string }[] = [
  { id: 'efectivo', nombre: 'Efectivo' },
  { id: 'qr', nombre: 'QR' },
  { id: 'tarjeta', nombre: 'Tarjeta' },
  { id: 'transferencia', nombre: 'Transferencia' },
];

const formatoBs = (valor: number) => `Bs ${valor.toFixed(2)}`;

export function CajaRecepcionView() {
  const [historialVisible, setHistorialVisible] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [consumo, setConsumo] = useState<Consumo[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [descuento, setDescuento] = useState(0);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [observacion, setObservacion] = useState('');

  const categorias = useMemo(() => ['Todos', ...new Set(servicios.map((servicio) => servicio.categoria))], []);

  const pacientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();
    if (!termino) return [];
    return pacientes.filter((item) => `${item.nombre} ${item.documento}`.toLocaleLowerCase().includes(termino));
  }, [busqueda]);

  const serviciosFiltrados = useMemo(
    () => categoriaActiva === 'Todos' ? servicios : servicios.filter((servicio) => servicio.categoria === categoriaActiva),
    [categoriaActiva],
  );

  const subtotal = consumo.reduce((total, item) => total + item.precio * item.cantidad, 0);
  const descuentoAplicado = Math.min(Math.max(descuento, 0), subtotal);
  const total = Math.max(subtotal - descuentoAplicado, 0);
  const recibido = Number(montoRecibido) || 0;
  const cambio = metodoPago === 'efectivo' ? Math.max(recibido - total, 0) : 0;
  const faltante = metodoPago === 'efectivo' ? Math.max(total - recibido, 0) : 0;
  const historialPaciente = paciente ? historialPorPaciente[paciente.id] ?? [] : [];
  const historialActivo = historialVisible && historialPaciente.length > 0;
  const puedeCobrar = consumo.length > 0 && (metodoPago !== 'efectivo' || recibido >= total);

  const agregarServicio = (servicio: Servicio) => {
    setConsumo((actual) => {
      const existente = actual.find((item) => item.id === servicio.id);
      return existente
        ? actual.map((item) => item.id === servicio.id ? { ...item, cantidad: item.cantidad + 1 } : item)
        : [...actual, { ...servicio, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id: number, delta: number) => {
    setConsumo((actual) => actual
      .map((item) => item.id === id ? { ...item, cantidad: Math.max(item.cantidad + delta, 0) } : item)
      .filter((item) => item.cantidad > 0));
  };

  const limpiarCuenta = () => {
    setConsumo([]);
    setDescuento(0);
    setMontoRecibido('');
    setObservacion('');
  };

  return (
    <section className={`recepcion-caja ${historialActivo ? 'con-historial' : ''}`}>
      {historialActivo ? (
        <aside className="panel caja-historial">
          <div className="panel-cabecera">
            <div><span>HISTORIAL</span><h2>Consumos previos</h2></div>
            <button className="secundario" onClick={() => setHistorialVisible(false)} aria-label="Ocultar historial">Ocultar</button>
          </div>
          <div className="caja-historial-lista">
            {historialPaciente.map((item) => (
              <article key={item.id}>
                <small>{item.fecha}</small>
                <strong>{item.servicio}</strong>
                <span>{item.estado}</span>
                <b>{formatoBs(item.total)}</b>
              </article>
            ))}
          </div>
        </aside>
      ) : paciente && historialPaciente.length > 0 ? (
        <button className="secundario caja-mostrar-historial" onClick={() => setHistorialVisible(true)} aria-label="Mostrar historial">
          <Icon name="fileText" size={15} /> Mostrar historial
        </button>
      ) : null}

      <section className="panel caja-catalogo">
        <div className="panel-cabecera"><div><span>RECEPCION</span><h2>Catalogo de servicios</h2><p>Agrega prestaciones a la cuenta activa del paciente.</p></div></div>
        <div className="caja-categorias" aria-label="Categorias de servicios">
          {categorias.map((categoria) => (
            <button key={categoria} className={categoriaActiva === categoria ? 'activo' : ''} type="button" onClick={() => setCategoriaActiva(categoria)}>{categoria}</button>
          ))}
        </div>
        <div className="caja-servicios">
          {serviciosFiltrados.map((servicio) => (
            <button key={servicio.id} type="button" onClick={() => agregarServicio(servicio)}>
              <span>{servicio.categoria}</span>
              <strong>{servicio.nombre}</strong>
              <b>{formatoBs(servicio.precio)}</b>
              <Icon name="plus" size={16} />
            </button>
          ))}
        </div>
      </section>

      <aside className="panel caja-detalle">
        <div className="panel-cabecera">
          <div><span>CAJA</span><h2>Detalle de cobro</h2></div>
          {consumo.length > 0 && <button className="secundario" type="button" onClick={limpiarCuenta}>Limpiar</button>}
        </div>

        <div className="caja-paciente">
          <div className="clinica-acciones">
            <button className="secundario caja-registrar-paciente" type="button" onClick={() => { setPaciente(null); setBusqueda(''); }}><Icon name="plus" size={15} /> Registrar paciente</button>
          </div>
          <label className="buscador-local"><Icon name="search" size={16} /><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar paciente o CI" /></label>
          {pacientesFiltrados.length > 0 && (
            <div className="search-results caja-resultados">
              {pacientesFiltrados.map((item) => <button key={item.id} onClick={() => { setPaciente(item); setBusqueda(''); }}>{item.nombre}<small>{item.documento}</small></button>)}
            </div>
          )}
        </div>

        <div className="caja-consumo">
          <div className="caja-consumo-titulo"><strong>Consumo actual</strong><span>{consumo.length} item(s)</span></div>
          {consumo.length === 0 ? <p className="modulo-vacio">Agrega un servicio del catalogo.</p> : consumo.map((item) => (
            <article key={item.id}>
              <div><strong>{item.nombre}</strong><small>{formatoBs(item.precio)} unitario</small></div>
              <div className="caja-cantidad"><button type="button" onClick={() => cambiarCantidad(item.id, -1)}>-</button><span>{item.cantidad}</span><button type="button" onClick={() => cambiarCantidad(item.id, 1)}>+</button></div>
              <b>{formatoBs(item.precio * item.cantidad)}</b>
            </article>
          ))}
        </div>

        <div className="caja-pago">
          <label><span>Descuento</span><input type="number" min={0} max={subtotal} value={descuento || ''} onChange={(event) => setDescuento(Number(event.target.value) || 0)} placeholder="0.00" /></label>
          <label><span>Metodo de pago</span><select value={metodoPago} onChange={(event) => setMetodoPago(event.target.value as MetodoPago)}>{metodosPago.map((metodo) => <option key={metodo.id} value={metodo.id}>{metodo.nombre}</option>)}</select></label>
          {metodoPago === 'efectivo' && <label><span>Monto recibido</span><input type="number" min={0} value={montoRecibido} onChange={(event) => setMontoRecibido(event.target.value)} placeholder="0.00" /></label>}
          <label className="caja-observacion"><span>Observacion</span><textarea value={observacion} onChange={(event) => setObservacion(event.target.value)} placeholder="Nota interna para caja" rows={2} /></label>
        </div>

        <div className="caja-resumen">
          <div><span>Subtotal</span><strong>{formatoBs(subtotal)}</strong></div>
          <div><span>Descuento</span><strong>- {formatoBs(descuentoAplicado)}</strong></div>
          <div className="total"><span>Total a cobrar</span><strong>{formatoBs(total)}</strong></div>
          {metodoPago === 'efectivo' && <div className={faltante > 0 ? 'pendiente' : 'cambio'}><span>{faltante > 0 ? 'Faltante' : 'Cambio'}</span><strong>{formatoBs(faltante > 0 ? faltante : cambio)}</strong></div>}
        </div>

        <button className="primario caja-cobrar" disabled={!puedeCobrar}>Registrar cobro <Icon name="arrowRight" size={16} /></button>
      </aside>
    </section>
  );
}
