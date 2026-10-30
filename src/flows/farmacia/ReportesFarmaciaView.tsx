import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Icon from '../../radius/componentes/Icono';
import { apiFetch } from '../../radius/api';
import { obtenerEpisodios, suscribirEpisodios } from '../consultorio/registroHistoria';
import { leerDescargos, suscribirDescargos } from '../internacion/registroDescargos';
import './ReportesFarmaciaView.css';

type DetalleVenta = { id: string; codigo_item: string | null; nombre_item: string; cantidad: string | number; total: string | number };
type Venta = { id: string; codigo: string; cobrada_en: string; total: string | number; observaciones: string | null; cliente: { nombre_razon_social: string } | null; detalles: DetalleVenta[] };
type TipoReporte = 'todos' | 'ventas' | 'descargos';
type Periodo = 'hoy' | 'semana' | 'mes' | 'personalizado';

const fechaLocal = (fecha: Date) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
const fechaDeRegistro = (valor: string) => { const fecha = new Date(valor); return Number.isNaN(fecha.getTime()) ? '' : fechaLocal(fecha); };
const moneda = (valor: number) => `Bs ${valor.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const mostrarFecha = (valor: string) => { const fecha = new Date(valor); return Number.isNaN(fecha.getTime()) ? 'Sin fecha' : fecha.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }); };
const moverFecha = (valor: string, dias: number) => { const fecha = new Date(`${valor}T12:00:00`); fecha.setDate(fecha.getDate() + dias); return fechaLocal(fecha); };
const rango = (periodo: Exclude<Periodo, 'personalizado'>) => {
  const hoy = new Date(); const inicio = new Date(hoy);
  if (periodo === 'semana') inicio.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  if (periodo === 'mes') inicio.setDate(1);
  return { desde: fechaLocal(inicio), hasta: fechaLocal(hoy) };
};

export function ReportesFarmaciaView() {
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [fechas, setFechas] = useState(() => rango('hoy'));
  const [tipo, setTipo] = useState<TipoReporte>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const episodios = useSyncExternalStore(suscribirEpisodios, obtenerEpisodios, obtenerEpisodios);
  const descargos = useSyncExternalStore(suscribirDescargos, leerDescargos, leerDescargos);
  const fechasValidas = Boolean(fechas.desde && fechas.hasta && fechas.desde <= fechas.hasta);

  useEffect(() => {
    if (!fechasValidas) { setVentas([]); setCargando(false); return; }
    const controller = new AbortController();
    const cargar = async () => {
      setCargando(true); setError('');
      try {
        // La venta se guarda en UTC; consultar días vecinos cubre los límites del día local.
        const parametros = new URLSearchParams({ fecha_desde: moverFecha(fechas.desde, -1), fecha_hasta: moverFecha(fechas.hasta, 1) });
        const respuesta = await apiFetch(`/api/v1/farmacia/reportes/ventas?${parametros}`, { signal: controller.signal });
        const resultado = await respuesta.json() as { data?: Venta[]; message?: string };
        if (!respuesta.ok) throw new Error(resultado.message || 'No se pudieron consultar las ventas.');
        if (!controller.signal.aborted) setVentas((resultado.data || []).filter(venta => venta.observaciones === 'Origen: farmacia' && fechaDeRegistro(venta.cobrada_en) >= fechas.desde && fechaDeRegistro(venta.cobrada_en) <= fechas.hasta));
      } catch (problema) {
        if (!controller.signal.aborted) { setVentas([]); setError(problema instanceof Error ? problema.message : 'No se pudieron consultar las ventas.'); }
      } finally { if (!controller.signal.aborted) setCargando(false); }
    };
    void cargar();
    return () => controller.abort();
  }, [fechas.desde, fechas.hasta, fechasValidas, version]);

  const seleccionarPeriodo = (valor: Exclude<Periodo, 'personalizado'>) => { setPeriodo(valor); setFechas(rango(valor)); };
  const filasDescargo = useMemo(() => episodios.flatMap(episodio => episodio.recetas.flatMap((documento, indice) => {
    const receta = documento.receta;
    if (!receta) return [];
    const estado = descargos[receta.id || `${episodio.episodioId}-${indice}`];
    if (estado?.estado !== 'recibido' || !estado.recibidoEn) return [];
    const dia = fechaDeRegistro(estado.recibidoEn);
    if (!dia || dia < fechas.desde || dia > fechas.hasta) return [];
    return receta.medicamentos.map(medicamento => ({ id: `${receta.id}-${medicamento.id}`, fecha: estado.recibidoEn!, nombre: medicamento.nombre, codigo: medicamento.codigo || '', cantidad: medicamento.cantidad || 'Sin registrar', paciente: episodio.paciente.paciente, responsable: estado.recibidoPor || 'Sin registro' }));
  })), [episodios, descargos, fechas.desde, fechas.hasta]);
  const coincide = useCallback((valor: string) => valor.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()), [busqueda]);
  const ventasFiltradas = useMemo(() => ventas.filter(venta => coincide(`${venta.codigo} ${venta.cliente?.nombre_razon_social || ''} ${venta.detalles.map(detalle => `${detalle.nombre_item} ${detalle.codigo_item || ''}`).join(' ')}`)), [ventas, coincide]);
  const descargosFiltrados = useMemo(() => filasDescargo.filter(item => coincide(`${item.nombre} ${item.codigo} ${item.paciente} ${item.responsable}`)), [filasDescargo, coincide]);
  const total = ventasFiltradas.reduce((suma, venta) => suma + (Number(venta.total) || 0), 0);
  const unidades = ventasFiltradas.flatMap(venta => venta.detalles).reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0);

  return <section className="farmacia-reporte" aria-label="Reportes de farmacia">
    <header className="farmacia-reporte-cabecera"><div><p>ADMINISTRACIÓN DE FARMACIA</p><h2>Reportes de farmacia</h2><small>Consulta ventas y descargos recibidos por período.</small></div><button type="button" onClick={() => setVersion(actual => actual + 1)} disabled={cargando}><Icon name="refresh" size={16} /> Actualizar</button></header>
    <div className="farmacia-reporte-periodos" role="group" aria-label="Período del reporte">{([['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes']] as const).map(([id, nombre]) => <button key={id} type="button" className={periodo === id ? 'activo' : ''} aria-pressed={periodo === id} onClick={() => seleccionarPeriodo(id)}>{nombre}</button>)}</div>
    <div className="farmacia-reporte-filtros"><label>Desde<input type="date" value={fechas.desde} max={fechas.hasta || undefined} onChange={evento => { setPeriodo('personalizado'); setFechas(actual => ({ ...actual, desde: evento.target.value })); }} /></label><label>Hasta<input type="date" value={fechas.hasta} min={fechas.desde || undefined} onChange={evento => { setPeriodo('personalizado'); setFechas(actual => ({ ...actual, hasta: evento.target.value })); }} /></label><label>Tipo<select value={tipo} onChange={evento => setTipo(evento.target.value as TipoReporte)}><option value="todos">Ventas y descargos</option><option value="ventas">Ventas</option><option value="descargos">Descargos recibidos</option></select></label><label>Buscar<input type="search" value={busqueda} onChange={evento => setBusqueda(evento.target.value)} placeholder="Producto, código o persona" /></label></div>
    {!fechasValidas && <p className="farmacia-reporte-error" role="alert">Selecciona un rango de fechas válido.</p>}
    <div className="farmacia-reporte-metricas"><article><span>Ventas de farmacia</span><strong>{error ? 'No disponible' : cargando ? 'Cargando…' : ventasFiltradas.length}</strong></article><article><span>Total cobrado</span><strong>{error ? 'No disponible' : cargando ? 'Cargando…' : moneda(total)}</strong></article><article><span>Cantidad vendida</span><strong>{error ? 'No disponible' : cargando ? 'Cargando…' : unidades.toLocaleString('es-BO')}</strong></article><article><span>Ítems de descargos recibidos</span><strong>{descargosFiltrados.length}</strong></article></div>
    {error && <p className="farmacia-reporte-error" role="alert">No se pudieron cargar las ventas: {error}</p>}
    {tipo !== 'descargos' && <section className="farmacia-reporte-seccion"><header><h3>Ventas</h3><span>{ventasFiltradas.length} registros</span></header><div className="farmacia-reporte-tabla"><table><thead><tr><th>Fecha y hora</th><th>Venta</th><th>Cliente</th><th>Producto</th><th>Cantidad</th><th>Importe</th></tr></thead><tbody>{ventasFiltradas.flatMap(venta => venta.detalles.map(item => <tr key={`${venta.id}-${item.id}`}><td>{mostrarFecha(venta.cobrada_en)}</td><td>{venta.codigo}</td><td>{venta.cliente?.nombre_razon_social || 'Sin registro'}</td><td><strong>{item.nombre_item}</strong><small>{item.codigo_item || 'Sin código'}</small></td><td>{Number(item.cantidad).toLocaleString('es-BO')}</td><td>{moneda(Number(item.total) || 0)}</td></tr>))}</tbody></table>{!ventasFiltradas.length && <p className="farmacia-reporte-vacio">{cargando ? 'Cargando ventas…' : error ? 'No fue posible consultar las ventas.' : 'No hay ventas de farmacia para este período.'}</p>}</div><p className="farmacia-reporte-nota">El total cobrado incluye los descuentos de cada venta. Solo se incluyen las ventas identificadas como Farmacia.</p></section>}
    {tipo !== 'ventas' && <section className="farmacia-reporte-seccion"><header><h3>Descargos recibidos</h3><span>{descargosFiltrados.length} ítems</span></header><div className="farmacia-reporte-tabla"><table><thead><tr><th>Fecha y hora</th><th>Producto o insumo</th><th>Cantidad</th><th>Paciente</th><th>Recibido por</th></tr></thead><tbody>{descargosFiltrados.map(item => <tr key={item.id}><td>{mostrarFecha(item.fecha)}</td><td><strong>{item.nombre}</strong><small>{item.codigo || 'Sin código'}</small></td><td>{item.cantidad}</td><td>{item.paciente}</td><td>{item.responsable}</td></tr>)}</tbody></table>{!descargosFiltrados.length && <p className="farmacia-reporte-vacio">No hay descargos recibidos para este período.</p>}</div><p className="farmacia-reporte-nota">Los descargos de internación disponibles aquí se guardan en este navegador.</p></section>}
  </section>;
}
