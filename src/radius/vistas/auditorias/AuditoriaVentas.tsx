import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../../api';
import Icon from '../../componentes/Icono';
import './AuditoriaVentas.css';

type Venta = { id: string; codigo: string; cobrada_en: string; total: string | number; moneda?: string; sucursal?: string | null; caja?: string | null; caja_codigo?: string | null; usuario_nombres?: string | null; usuario_apellidos?: string | null; usuario?: string | null; cliente?: string | null };
type Opcion = { id: string | number; nombre?: string; codigo?: string; nombres?: string; apellidos?: string; usuario?: string; sucursal_id?: number };
type Respuesta = { data: Venta[]; current_page: number; last_page: number; total: number; total_ventas: number; sucursales: Opcion[]; cajas: Opcion[]; usuarios: Opcion[] };

const formatoFecha = (fecha: string) => fecha ? new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(fecha)) : '—';
const formatoDinero = (monto: number | string) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(Number(monto) || 0);
const esc = (texto: string) => texto.replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter] || caracter);

export default function AuditoriaVentas() {
  const [datos, setDatos] = useState<Respuesta>({ data: [], current_page: 1, last_page: 1, total: 0, total_ventas: 0, sucursales: [], cajas: [], usuarios: [] });
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [sucursal, setSucursal] = useState('');
  const [caja, setCaja] = useState('');
  const [usuario, setUsuario] = useState('');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exportacion, setExportacion] = useState(false);
  const [exportDesde, setExportDesde] = useState('');
  const [exportHasta, setExportHasta] = useState('');
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const controlador = new AbortController();
    const temporizador = window.setTimeout(() => {
      const parametros = new URLSearchParams({ per_page: '25', page: String(pagina) });
      if (busqueda.trim()) parametros.set('buscar', busqueda.trim());
      if (desde) parametros.set('fecha_desde', desde);
      if (hasta) parametros.set('fecha_hasta', hasta);
      if (sucursal) parametros.set('sucursal_id', sucursal);
      if (caja) parametros.set('caja_id', caja);
      if (usuario) parametros.set('usuario_id', usuario);
      setCargando(true); setError('');
      void apiFetch(`/api/auditorias/ventas?${parametros}`, { signal: controlador.signal }).then(async respuesta => {
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.message || 'No se pudo consultar el historial de ventas.');
        setDatos(resultado as Respuesta);
      }).catch(causa => { if (!controlador.signal.aborted) setError(causa instanceof Error ? causa.message : 'No se pudo consultar el historial de ventas.'); }).finally(() => { if (!controlador.signal.aborted) setCargando(false); });
    }, 220);
    return () => { window.clearTimeout(temporizador); controlador.abort(); };
  }, [busqueda, desde, hasta, sucursal, caja, usuario, pagina]);

  const cambiarFiltro = (actualizar: (valor: string) => void) => (valor: string) => { actualizar(valor); setPagina(1); };
  const cajasVisibles = datos.cajas.filter(item => !sucursal || String(item.sucursal_id) === sucursal);

  const exportar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const ventana = window.open('', '_blank');
    if (!ventana) { setError('Permite ventanas emergentes para generar el PDF.'); return; }
    ventana.document.write('<!doctype html><html lang="es"><meta charset="utf-8"><body style="font:16px Arial;padding:30px">Preparando historial de ventas…</body></html>');
    ventana.document.close(); setExportando(true); setError('');
    try {
      const filas: Venta[] = []; let paginaConsulta = 1; let paginas = 1;
      do {
        const parametros = new URLSearchParams({ per_page: '100', page: String(paginaConsulta), fecha_desde: exportDesde, fecha_hasta: exportHasta });
        if (busqueda.trim()) parametros.set('buscar', busqueda.trim());
        if (sucursal) parametros.set('sucursal_id', sucursal);
        if (caja) parametros.set('caja_id', caja);
        if (usuario) parametros.set('usuario_id', usuario);
        const respuesta = await apiFetch(`/api/auditorias/ventas?${parametros}`);
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.message || 'No se pudo obtener el historial para exportar.');
        filas.push(...resultado.data); paginas = resultado.last_page || 1; paginaConsulta += 1;
      } while (paginaConsulta <= paginas);
      const cuerpo = filas.length ? filas.map(venta => `<tr><td>${esc(venta.codigo)}</td><td>${esc(formatoFecha(venta.cobrada_en))}</td><td>${esc(venta.sucursal || 'Sin asignar')}</td><td>${esc(venta.caja || 'Sin asignar')}</td><td>${esc(`${venta.usuario_nombres || ''} ${venta.usuario_apellidos || ''}`.trim() || venta.usuario || 'Sin usuario')}</td><td>${esc(venta.cliente || 'Sin cliente')}</td><td class="monto">${esc(formatoDinero(venta.total))}</td></tr>`).join('') : '<tr><td colspan="7">No hay ventas en el periodo seleccionado.</td></tr>';
      ventana.document.open();
      ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Historial de ventas</title><style>*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#193b56;margin:28px}header{border-bottom:2px solid #0786bd;padding-bottom:14px}h1{margin:0 0 8px;font-size:22px}p{color:#60778b}.resumen{font-weight:bold;color:#0879ae}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{text-align:left;padding:9px 7px;border-bottom:1px solid #d8e4ec}th{background:#edf6fb;font-size:9px;text-transform:uppercase}.monto{text-align:right;white-space:nowrap}td:last-child,th:last-child{text-align:right}tr{break-inside:avoid}@media print{body{margin:12mm}thead{display:table-header-group}}</style></head><body><header><h1>Historial de ventas</h1><p>Periodo: ${esc(exportDesde)} al ${esc(exportHasta)}</p><p class="resumen">${filas.length} ventas · Total ${esc(formatoDinero(filas.reduce((suma, item) => suma + Number(item.total || 0), 0)))}</p></header><table><thead><tr><th>Código</th><th>Fecha</th><th>Sucursal</th><th>Caja</th><th>Usuario</th><th>Cliente</th><th>Total</th></tr></thead><tbody>${cuerpo}</tbody></table><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`);
      ventana.document.close(); setExportacion(false);
    } catch (causa) { ventana.close(); setError(causa instanceof Error ? causa.message : 'No se pudo generar el PDF.'); }
    finally { setExportando(false); }
  };

  return <section className="auditoria-ventas">
    <div className="auditoria-ventas-resumen"><article><small>Ventas encontradas</small><strong>{datos.total}</strong></article><article><small>Importe del filtro</small><strong>{formatoDinero(datos.total_ventas)}</strong></article><button type="button" onClick={() => { setExportDesde(desde); setExportHasta(hasta); setExportacion(true); }}><Icon name="download" size={17}/> Exportar historial</button></div>
    <div className="auditoria-ventas-filtros"><label className="auditoria-ventas-buscar"><Icon name="search" size={17}/><input type="search" value={busqueda} onChange={event => cambiarFiltro(setBusqueda)(event.target.value)} placeholder="Buscar código, cliente o usuario" aria-label="Buscar ventas"/></label><label><span>Desde</span><input type="date" value={desde} max={hasta || undefined} onChange={event => cambiarFiltro(setDesde)(event.target.value)}/></label><label><span>Hasta</span><input type="date" value={hasta} min={desde || undefined} onChange={event => cambiarFiltro(setHasta)(event.target.value)}/></label><label><span>Sucursal</span><select value={sucursal} onChange={event => { cambiarFiltro(setSucursal)(event.target.value); setCaja(''); }}><option value="">Todas</option>{datos.sucursales.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><label><span>Caja</span><select value={caja} onChange={event => cambiarFiltro(setCaja)(event.target.value)}><option value="">Todas</option>{cajasVisibles.map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.codigo}</option>)}</select></label><label><span>Usuario</span><select value={usuario} onChange={event => cambiarFiltro(setUsuario)(event.target.value)}><option value="">Todos</option>{datos.usuarios.map(item => <option key={item.id} value={item.id}>{`${item.nombres || ''} ${item.apellidos || ''}`.trim() || item.usuario}</option>)}</select></label></div>
    {error && <p className="auditoria-ventas-error" role="alert">{error}</p>}
    <div className="auditoria-ventas-tabla"><div className="auditoria-ventas-fila cabecera"><span>Venta</span><span>Fecha</span><span>Sucursal</span><span>Caja</span><span>Usuario</span><span>Cliente</span><span>Total</span></div>{cargando ? <div className="auditoria-ventas-vacio">Cargando ventas…</div> : datos.data.length ? datos.data.map(venta => <article className="auditoria-ventas-fila" key={venta.id}><strong>{venta.codigo}</strong><span data-label="Fecha">{formatoFecha(venta.cobrada_en)}</span><span data-label="Sucursal">{venta.sucursal || 'Sin asignar'}</span><span data-label="Caja">{venta.caja ? `${venta.caja}${venta.caja_codigo ? ` · ${venta.caja_codigo}` : ''}` : 'Sin asignar'}</span><span data-label="Usuario">{`${venta.usuario_nombres || ''} ${venta.usuario_apellidos || ''}`.trim() || venta.usuario || 'Sin usuario'}</span><span data-label="Cliente">{venta.cliente || 'Sin cliente'}</span><b data-label="Total">{formatoDinero(venta.total)}</b></article>) : <div className="auditoria-ventas-vacio">No hay ventas para los filtros seleccionados.</div>}</div>
    <footer className="auditoria-ventas-paginacion"><span>{datos.total} registros · Página {datos.current_page} de {datos.last_page}</span><div><button type="button" disabled={pagina <= 1 || cargando} onClick={() => setPagina(actual => actual - 1)}>Anterior</button><button type="button" disabled={pagina >= datos.last_page || cargando} onClick={() => setPagina(actual => actual + 1)}>Siguiente</button></div></footer>
    {exportacion && <div className="auditoria-ventas-capa" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setExportacion(false); }}><form className="auditoria-ventas-modal" onSubmit={event => void exportar(event)}><header><div><small>EXPORTAR HISTORIAL</small><h3>Periodo del reporte</h3><p>Los filtros actuales de sucursal, caja y usuario también se aplicarán.</p></div><button type="button" aria-label="Cerrar" onClick={() => setExportacion(false)}><Icon name="close" size={18}/></button></header><div><label>Desde<input required type="date" value={exportDesde} max={exportHasta || undefined} onChange={event => setExportDesde(event.target.value)}/></label><label>Hasta<input required type="date" value={exportHasta} min={exportDesde || undefined} onChange={event => setExportHasta(event.target.value)}/></label></div><footer><button type="button" onClick={() => setExportacion(false)}>Cancelar</button><button type="submit" disabled={exportando}><Icon name="download" size={16}/>{exportando ? 'Preparando…' : 'Generar PDF'}</button></footer></form></div>}
  </section>;
}
