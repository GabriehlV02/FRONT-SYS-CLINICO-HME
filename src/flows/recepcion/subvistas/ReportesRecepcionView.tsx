import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../../../radius/componentes/Icono';
import { apiContableFetch } from '../../../radius/api';
import './ReportesRecepcionView.css';

type DetalleVenta = {
  id: string;
  codigo_item: string | null;
  nombre_item: string;
  tipo_item: string | null;
  cantidad: string;
  precio_unitario: string;
  descuento: string;
  total: string;
};

type Venta = {
  id: string;
  codigo: string;
  estado: string;
  moneda: string;
  subtotal: string;
  descuento: string;
  total: string;
  cobrada_en: string;
  cliente: {
    id: string;
    nit_ci: string | null;
    nombre_razon_social: string;
    telefono: string | null;
    correo: string | null;
  };
  detalles: DetalleVenta[];
};

const dinero = (valor: string | number) =>
  `Bs ${Number(valor).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fechaVenta = (fecha: string) => new Intl.DateTimeFormat('es-BO', {
  day: '2-digit', month: 'short', year: 'numeric',
}).format(new Date(fecha));

const horaVenta = (fecha: string) => new Intl.DateTimeFormat('es-BO', {
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(fecha));

export function ReportesRecepcionView() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarVentas = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const parametros = new URLSearchParams();
      if (fechaDesde) parametros.set('fecha_desde', fechaDesde);
      if (fechaHasta) parametros.set('fecha_hasta', fechaHasta);
      const respuesta = await apiContableFetch(`/v1/ventas${parametros.size ? `?${parametros}` : ''}`);
      const resultado = await respuesta.json() as { data?: Venta[]; message?: string; errors?: Record<string, string[]> };
      if (!respuesta.ok) {
        const detalle = Object.values(resultado.errors || {}).flat()[0];
        throw new Error(detalle || resultado.message || 'No se pudieron cargar las ventas.');
      }
      setVentas(resultado.data || []);
      setVentaSeleccionada((actual) =>
        actual ? (resultado.data || []).find((venta) => venta.id === actual.id) || null : null,
      );
    } catch (problema) {
      setVentas([]);
      setError(problema instanceof Error ? problema.message : 'No se pudieron cargar las ventas.');
    } finally {
      setCargando(false);
    }
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    void cargarVentas();
  }, [cargarVentas]);

  const montoTotal = useMemo(
    () => ventas.reduce((acumulado, venta) => acumulado + Number(venta.total), 0),
    [ventas],
  );

  return (
    <section className="reporte-ventas" aria-label="Reporte de ventas">
      <header className="reporte-ventas-encabezado">
        <div><span>REPORTES DE RECEPCI&Oacute;N</span><h2>Ventas realizadas</h2><p>Consulta las ventas cobradas y revisa el detalle de cada operaci&oacute;n.</p></div>
        <button type="button" onClick={() => void cargarVentas()} disabled={cargando}><Icon name="audit" size={16} /> {cargando ? 'Actualizando...' : 'Actualizar'}</button>
      </header>

      <div className="reporte-ventas-resumen">
        <article><span><Icon name="fileText" size={19} /></span><div><small>Ventas encontradas</small><strong>{ventas.length}</strong></div></article>
        <article><span><Icon name="cash" size={19} /></span><div><small>Monto cobrado</small><strong>{dinero(montoTotal)}</strong></div></article>
        <article><span><Icon name="calendar" size={19} /></span><div><small>&Uacute;ltima venta</small><strong>{ventas[0] ? fechaVenta(ventas[0].cobrada_en) : 'Sin ventas'}</strong></div></article>
      </div>

      <section className="reporte-ventas-filtros" aria-label="Filtros del reporte">
        <label><span>Desde</span><input type="date" value={fechaDesde} max={fechaHasta || undefined} onChange={(evento) => setFechaDesde(evento.target.value)} /></label>
        <label><span>Hasta</span><input type="date" value={fechaHasta} min={fechaDesde || undefined} onChange={(evento) => setFechaHasta(evento.target.value)} /></label>
        <button type="button" onClick={() => { setFechaDesde(''); setFechaHasta(''); }} disabled={!fechaDesde && !fechaHasta}>Limpiar fechas</button>
      </section>

      <div className="reporte-ventas-tabla-contenedor">
        <table className="reporte-ventas-tabla">
          <thead><tr><th>C&oacute;digo de venta</th><th>Cliente</th><th>Fecha</th><th>Hora</th><th>Monto pagado</th><th>Acciones</th></tr></thead>
          <tbody>{ventas.map((venta) => <tr key={venta.id}>
            <td><strong className="reporte-codigo">{venta.codigo}</strong></td>
            <td><strong>{venta.cliente.nombre_razon_social}</strong><small>{venta.cliente.nit_ci ? `NIT/CI ${venta.cliente.nit_ci}` : 'Sin NIT/CI'}</small></td>
            <td>{fechaVenta(venta.cobrada_en)}</td><td>{horaVenta(venta.cobrada_en)}</td><td><strong>{dinero(venta.total)}</strong></td>
            <td><button className="reporte-ver" type="button" onClick={() => setVentaSeleccionada(venta)}><Icon name="eye" size={15} /> Ver detalle</button></td>
          </tr>)}</tbody>
        </table>
        {!cargando && !error && ventas.length === 0 && <div className="reporte-ventas-vacio"><Icon name="fileText" size={25} /><strong>No hay ventas en este periodo</strong><small>Prueba con otro rango de fechas o registra una venta desde Caja.</small></div>}
        {cargando && <div className="reporte-ventas-vacio"><strong>Cargando ventas...</strong></div>}
        {error && <div className="reporte-ventas-vacio error"><strong>No fue posible cargar el reporte</strong><small>{error}</small><button type="button" onClick={() => void cargarVentas()}>Reintentar</button></div>}
      </div>

      {ventaSeleccionada && <div className="reporte-detalle-fondo" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setVentaSeleccionada(null); }}>
        <aside className="reporte-detalle" role="dialog" aria-modal="true" aria-label={`Detalle de ${ventaSeleccionada.codigo}`}>
          <header><div><span>DETALLE DE VENTA</span><h3>{ventaSeleccionada.codigo}</h3></div><button type="button" aria-label="Cerrar detalle" onClick={() => setVentaSeleccionada(null)}>&times;</button></header>
          <div className="reporte-detalle-cliente"><Icon name="users" size={19} /><div><strong>{ventaSeleccionada.cliente.nombre_razon_social}</strong><small>{ventaSeleccionada.cliente.nit_ci ? `NIT/CI ${ventaSeleccionada.cliente.nit_ci}` : 'Sin NIT/CI registrado'}</small></div></div>
          <div className="reporte-detalle-fecha"><span><small>Fecha</small><strong>{fechaVenta(ventaSeleccionada.cobrada_en)}</strong></span><span><small>Hora</small><strong>{horaVenta(ventaSeleccionada.cobrada_en)}</strong></span></div>
          <div className="reporte-detalle-items"><header><strong>Productos y servicios</strong><small>{ventaSeleccionada.detalles.length} registro{ventaSeleccionada.detalles.length === 1 ? '' : 's'}</small></header>
            {ventaSeleccionada.detalles.map((detalle) => <article key={detalle.id}><div><strong>{detalle.nombre_item}</strong><small>{detalle.codigo_item || 'Sin código'} &middot; {Number(detalle.cantidad)} &times; {dinero(detalle.precio_unitario)}</small></div><b>{dinero(detalle.total)}</b></article>)}
          </div>
          <div className="reporte-detalle-totales"><span>Subtotal <b>{dinero(ventaSeleccionada.subtotal)}</b></span><span>Descuento <b>&minus; {dinero(ventaSeleccionada.descuento)}</b></span><strong>Total pagado <b>{dinero(ventaSeleccionada.total)}</b></strong></div>
          <footer><button type="button" onClick={() => window.print()}><Icon name="print" size={16} /> Imprimir</button><button type="button" className="principal" onClick={() => setVentaSeleccionada(null)}>Cerrar</button></footer>
        </aside>
      </div>}
    </section>
  );
}
