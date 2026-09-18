import { useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../radius/componentes/Icono';

type DatosFactura = { nit: string; razonSocial: string };
type ItemCaja = { id: number; nombre: string; categoria: string; tipo: 'Producto' | 'Servicio'; precio: number; detalle: string; stock?: number };
type Consumo = ItemCaja & { cantidad: number };
type Paciente = {
  id: number; nombres: string; apellidoPaterno: string; apellidoMaterno: string; ci: string; complemento: string; expedidoEn: string;
  celular: string; correo: string; fechaNacimiento: string; genero: string; ciConQr: boolean; afroamericano: boolean;
  pais: string; departamento: string; ciudad: string; zona: string; direccion: string;
  responsableNombre: string; responsableTelefono: string; responsableParentesco: string; procedencia: string; observaciones: string; habilitado: boolean; factura?: DatosFactura;
};
type MetodoPago = 'efectivo' | 'qr' | 'tarjeta' | 'transferencia';
type AnalisisLaboratorio = { nombre: string; precio: number };
const hojaLaboratorio: Record<string, AnalisisLaboratorio[]> = {
  'Hematologia': [{ nombre: 'Grupo sanguineo y factor RH', precio: 35 }, { nombre: 'Hemoglobina', precio: 35 }, { nombre: 'Hemograma completo', precio: 50 }, { nombre: 'Prueba de Coombs directo', precio: 90 }, { nombre: 'VES', precio: 30 }],
  'Coagulograma': [{ nombre: 'A.P.T.T.', precio: 50 }, { nombre: 'Anticardiolipinas IgG IgM', precio: 540 }, { nombre: 'Dimero - D', precio: 260 }, { nombre: 'Tiempo de coagulacion', precio: 30 }, { nombre: 'Tiempo de protrombina PT INR', precio: 50 }],
  'Quimica metabolica': [{ nombre: 'Acido urico', precio: 35 }, { nombre: 'Perfil lipidico', precio: 80 }, { nombre: 'Glucosa', precio: 30 }, { nombre: 'Creatinina', precio: 35 }, { nombre: 'Pruebas hepaticas', precio: 120 }],
  'Electrolitos': [{ nombre: 'Calcio', precio: 40 }, { nombre: 'Calcio ionico', precio: 40 }, { nombre: 'Electrolitos Na - K - Cl - iC', precio: 130 }, { nombre: 'Fosforo', precio: 40 }, { nombre: 'Magnesio', precio: 50 }],
  'Serologia': [{ nombre: 'ANA', precio: 150 }, { nombre: 'Anti-DNA', precio: 150 }, { nombre: 'Anti CCP', precio: 150 }, { nombre: 'C3', precio: 200 }, { nombre: 'Factor RA cuantitativo', precio: 35 }],
  'Uroanalisis': [{ nombre: 'Calcio en orina 24 Hrs', precio: 40 }, { nombre: 'Cociente PCR', precio: 30 }, { nombre: 'Creatinina en orina casual', precio: 80 }, { nombre: 'Examen completo de orina', precio: 30 }, { nombre: 'Urea en orina casual', precio: 45 }],
};

const pacientesIniciales: Paciente[] = [
  { id: 1, nombres: 'Maria', apellidoPaterno: 'Fernandez', apellidoMaterno: 'Lopez', ci: '4839201', complemento: '', expedidoEn: 'Cochabamba', celular: '71234567', correo: '', fechaNacimiento: '', genero: 'Femenino', ciConQr: false, afroamericano: false, pais: 'Bolivia', departamento: 'Cochabamba', ciudad: '', zona: '', direccion: '', responsableNombre: '', responsableTelefono: '', responsableParentesco: '', procedencia: '', observaciones: '', habilitado: true, factura: { nit: '4839201', razonSocial: 'Maria Fernandez Lopez' } },
  { id: 2, nombres: 'Carlos', apellidoPaterno: 'Mendoza', apellidoMaterno: '', ci: '7281044', complemento: '', expedidoEn: 'Cochabamba', celular: '76543210', correo: '', fechaNacimiento: '', genero: 'Masculino', ciConQr: false, afroamericano: false, pais: 'Bolivia', departamento: 'Cochabamba', ciudad: '', zona: '', direccion: '', responsableNombre: '', responsableTelefono: '', responsableParentesco: '', procedencia: '', observaciones: '', habilitado: true },
  { id: 3, nombres: 'Ana', apellidoPaterno: 'Rodriguez', apellidoMaterno: 'Vargas', ci: '6102837', complemento: '', expedidoEn: 'Cochabamba', celular: '70012345', correo: '', fechaNacimiento: '', genero: 'Femenino', ciConQr: false, afroamericano: false, pais: 'Bolivia', departamento: 'Cochabamba', ciudad: '', zona: '', direccion: '', responsableNombre: '', responsableTelefono: '', responsableParentesco: '', procedencia: '', observaciones: '', habilitado: true },
  { id: 4, nombres: 'Paciente', apellidoPaterno: 'Prueba', apellidoMaterno: 'Historial', ci: '9999001', complemento: '', expedidoEn: 'Cochabamba', celular: '70000000', correo: '', fechaNacimiento: '1990-06-15', genero: 'Otro', ciConQr: false, afroamericano: false, pais: 'Bolivia', departamento: 'Cochabamba', ciudad: '', zona: '', direccion: '', responsableNombre: '', responsableTelefono: '', responsableParentesco: '', procedencia: 'Prueba', observaciones: 'Paciente demo para validar el historial de consumos.', habilitado: true },
];
const catalogoCaja: ItemCaja[] = [
  { id: 1, nombre: 'Consulta medica general', categoria: 'Procedimientos', tipo: 'Servicio', precio: 50, detalle: 'Atencion de consulta externa' },
  { id: 2, nombre: 'Radiografia panoramica', categoria: 'Procedimientos', tipo: 'Servicio', precio: 80, detalle: 'Estudio radiologico digital' },
  { id: 3, nombre: 'Laboratorio basico', categoria: 'Laboratorios', tipo: 'Servicio', precio: 45, detalle: 'Procesamiento de muestra basica' },
  { id: 4, nombre: 'Gasa esteril 10 x 10 cm', categoria: 'Insumos', tipo: 'Producto', precio: 12, detalle: 'Caja por 100 unidades', stock: 32 },
  { id: 5, nombre: 'Venda elastica 10 cm', categoria: 'Insumos', tipo: 'Producto', precio: 35, detalle: 'Paquete por 12 rollos', stock: 18 },
  { id: 6, nombre: 'Certificado medico', categoria: 'Servicios', tipo: 'Servicio', precio: 25, detalle: 'Emision de certificado medico' },
];
const historialPorPaciente: Record<number, { id: number; numero: string; fecha: string; servicio: string; total: number; estado: 'Pagado' | 'Preventa' | 'Anulado'; cajero: string }[]> = {
  1: [{ id: 1, numero: '131932', fecha: '10/05/2026 10:56', servicio: 'Consulta general', total: 50, estado: 'Pagado', cajero: 'Recepcion central' }, { id: 2, numero: '131910', fecha: '15/02/2026 19:17', servicio: 'Limpieza dental', total: 30, estado: 'Preventa', cajero: 'Recepcion central' }, { id: 4, numero: '131885', fecha: '03/01/2026 11:05', servicio: 'Radiografia panoramica', total: 80, estado: 'Anulado', cajero: 'Recepcion central' }],
  2: [{ id: 3, numero: '131872', fecha: '02/07/2026 09:20', servicio: 'Laboratorio basico', total: 45, estado: 'Pagado', cajero: 'Caja laboratorio' }],
  4: [{ id: 5, numero: 'PR-001', fecha: '12/09/2026 09:15', servicio: 'Consulta medica general', total: 50, estado: 'Pagado', cajero: 'Recepcion central' }, { id: 6, numero: 'PR-002', fecha: '14/09/2026 11:40', servicio: 'Radiografia panoramica', total: 80, estado: 'Preventa', cajero: 'Recepcion central' }, { id: 7, numero: 'PR-003', fecha: '15/09/2026 16:20', servicio: 'Laboratorio basico', total: 45, estado: 'Anulado', cajero: 'Caja laboratorio' }],
};
const metodosPago: { id: MetodoPago; nombre: string }[] = [{ id: 'efectivo', nombre: 'Efectivo' }, { id: 'qr', nombre: 'QR' }, { id: 'tarjeta', nombre: 'Tarjeta' }, { id: 'transferencia', nombre: 'Transferencia' }];
const formularioPacienteInicial = { nombres: '', apellidoPaterno: '', apellidoMaterno: '', ci: '', complemento: '', expedidoEn: 'Cochabamba', nit: '', razonSocial: '', fechaNacimiento: '', correo: '', celular: '', genero: '', ciConQr: false, afroamericano: false, pais: 'Bolivia', departamento: 'Cochabamba', ciudad: '', zona: '', direccion: '', responsableNombre: '', responsableTelefono: '', responsableParentesco: '', procedencia: '', observaciones: '', habilitado: true };
const facturaInicial = { nit: '', razonSocial: '' };
const formatoBs = (valor: number) => `Bs ${valor.toFixed(2)}`;
const nombreCompleto = (item: Paciente) => [item.nombres, item.apellidoPaterno, item.apellidoMaterno].filter(Boolean).join(' ');
const calcularEdad = (fecha: string) => {
  if (!fecha) return '';
  const nacimiento = new Date(`${fecha}T00:00:00`);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  if (hoy.getMonth() < nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())) edad -= 1;
  return `${Math.max(edad, 0)} anos`;
};
const leerPacientes = (): Paciente[] => { try { const guardados = window.localStorage.getItem('clinica-caja-pacientes'); return guardados ? JSON.parse(guardados) as Paciente[] : pacientesIniciales; } catch { return pacientesIniciales; } };

export function CajaRecepcionView() {
  const [historialReplegado, setHistorialReplegado] = useState(false);
  const [filtroHistorial, setFiltroHistorial] = useState<'Todos' | 'Pagado' | 'Preventa' | 'Anulado'>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [pacientesRegistrados, setPacientesRegistrados] = useState<Paciente[]>(leerPacientes);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const [catalogoNodo, setCatalogoNodo] = useState<HTMLElement | null>(null);
  const [formularioPaciente, setFormularioPaciente] = useState(formularioPacienteInicial);
  const [errorPaciente, setErrorPaciente] = useState('');
  const [emitirFactura, setEmitirFactura] = useState(false);
  const [datosFactura, setDatosFactura] = useState<DatosFactura>(facturaInicial);
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [categoriaCatalogo, setCategoriaCatalogo] = useState('Servicios');
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [analisisMarcados, setAnalisisMarcados] = useState<string[]>([]);
  const [vistaCatalogo, setVistaCatalogo] = useState<'listado' | 'galeria'>('listado');
  const [consumo, setConsumo] = useState<Consumo[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [descuento, setDescuento] = useState(0);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [observacion, setObservacion] = useState('');

  const pacientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();
    if (!termino) return [];
    return pacientesRegistrados.filter((item) => `${nombreCompleto(item)} ${item.ci}`.toLocaleLowerCase().includes(termino)).slice(0, 6);
  }, [busqueda, pacientesRegistrados]);
  const categoriasCatalogo = ['Servicios', 'Productos', 'Insumos', 'Laboratorios', 'Procedimientos'];
  const itemsCatalogo = useMemo(() => {
    const termino = busquedaCatalogo.trim().toLocaleLowerCase();
    return catalogoCaja.filter((item) => (categoriaCatalogo === 'Todos' || item.categoria === categoriaCatalogo) && (!termino || `${item.nombre} ${item.categoria} ${item.tipo}`.toLocaleLowerCase().includes(termino)));
  }, [busquedaCatalogo, categoriaCatalogo]);
  const subtotal = consumo.reduce((total, item) => total + item.precio * item.cantidad, 0);
  const descuentoAplicado = Math.min(Math.max(descuento, 0), subtotal);
  const total = Math.max(subtotal - descuentoAplicado, 0);
  const recibido = Number(montoRecibido) || 0;
  const cambio = metodoPago === 'efectivo' ? Math.max(recibido - total, 0) : 0;
  const faltante = metodoPago === 'efectivo' ? Math.max(total - recibido, 0) : 0;
  const historialPaciente = paciente ? historialPorPaciente[paciente.id] ?? [] : [];
  const historialFiltrado = filtroHistorial === 'Todos' ? historialPaciente : historialPaciente.filter((item) => item.estado === filtroHistorial);
  const puedeCobrar = consumo.length > 0 && (metodoPago !== 'efectivo' || recibido >= total);

  const persistirPacientes = (actualizados: Paciente[]) => { setPacientesRegistrados(actualizados); window.localStorage.setItem('clinica-caja-pacientes', JSON.stringify(actualizados)); };
  const seleccionarPaciente = (item: Paciente) => { setPaciente(item); setBusqueda(''); setRegistroAbierto(false); setErrorPaciente(''); setEmitirFactura(Boolean(item.factura)); setDatosFactura(item.factura ?? facturaInicial); };
  const registrarPaciente = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ci = formularioPaciente.ci.trim();
    if (pacientesRegistrados.some((item) => item.ci === ci)) { setErrorPaciente('Ya existe un paciente registrado con este CI.'); return; }
    const nuevoPaciente: Paciente = {
      id: Date.now(), nombres: formularioPaciente.nombres.trim(), apellidoPaterno: formularioPaciente.apellidoPaterno.trim(), apellidoMaterno: formularioPaciente.apellidoMaterno.trim(), ci,
      complemento: formularioPaciente.complemento.trim(), expedidoEn: formularioPaciente.expedidoEn, celular: formularioPaciente.celular.trim(), correo: formularioPaciente.correo.trim(), fechaNacimiento: formularioPaciente.fechaNacimiento,
      genero: formularioPaciente.genero, ciConQr: formularioPaciente.ciConQr, afroamericano: formularioPaciente.afroamericano, pais: formularioPaciente.pais, departamento: formularioPaciente.departamento,
      ciudad: formularioPaciente.ciudad, zona: formularioPaciente.zona, direccion: formularioPaciente.direccion.trim(), responsableNombre: formularioPaciente.responsableNombre.trim(), responsableTelefono: formularioPaciente.responsableTelefono.trim(),
      responsableParentesco: formularioPaciente.responsableParentesco.trim(), procedencia: formularioPaciente.procedencia, observaciones: formularioPaciente.observaciones.trim(), habilitado: formularioPaciente.habilitado,
      factura: formularioPaciente.nit.trim() && formularioPaciente.razonSocial.trim() ? { nit: formularioPaciente.nit.trim(), razonSocial: formularioPaciente.razonSocial.trim() } : undefined,
    };
    persistirPacientes([...pacientesRegistrados, nuevoPaciente]);
    setFormularioPaciente(formularioPacienteInicial);
    seleccionarPaciente(nuevoPaciente);
  };
  const guardarFactura = () => {
    if (!paciente || !datosFactura.nit.trim() || !datosFactura.razonSocial.trim()) return;
    const actualizado = { ...paciente, factura: { nit: datosFactura.nit.trim(), razonSocial: datosFactura.razonSocial.trim() } };
    persistirPacientes(pacientesRegistrados.map((item) => item.id === paciente.id ? actualizado : item));
    setPaciente(actualizado);
  };
  const limpiarCuenta = () => { setConsumo([]); setDescuento(0); setMontoRecibido(''); setObservacion(''); setEmitirFactura(false); setDatosFactura(paciente?.factura ?? facturaInicial); };
  const agregarItem = (item: ItemCaja) => setConsumo((actual) => {
    const existente = actual.find((registro) => registro.id === item.id);
    return existente ? actual.map((registro) => registro.id === item.id ? { ...registro, cantidad: registro.cantidad + 1 } : registro) : [...actual, { ...item, cantidad: 1 }];
  });
  const cambiarCantidad = (id: number, cambioCantidad: number) => setConsumo((actual) => actual.map((item) => item.id === id ? { ...item, cantidad: Math.max(0, item.cantidad + cambioCantidad) } : item).filter((item) => item.cantidad > 0));

  return <section className={`recepcion-caja caja-con-catalogo ${historialReplegado ? 'historial-replegado' : ''} ${registroAbierto ? 'registro-paciente-activo' : ''}`}>
    <div className="caja-columna-principal">
    {!historialReplegado ? <aside className="panel caja-historial"><div className="panel-cabecera"><div><span>HISTORIAL</span><h2>Consumos previos</h2></div><button className="secundario caja-historial-control" type="button" onClick={() => setHistorialReplegado(true)} aria-label="Replegar historial" title="Replegar historial"><Icon name="chevronLeft" size={15} /></button></div><label className="caja-historial-filtro"><span>Estado</span><select value={filtroHistorial} onChange={(event) => setFiltroHistorial(event.target.value as typeof filtroHistorial)}><option>Todos</option><option>Pagado</option><option>Preventa</option><option>Anulado</option></select></label><div className="caja-historial-lista">{historialPaciente.length > 0 && historialFiltrado.length > 0 ? historialFiltrado.map((item) => <article className={`estado-${item.estado.toLocaleLowerCase()}`} key={item.id}><header><strong>N. {item.numero}</strong><em>{item.estado}</em></header><span>HOSPITAL</span><p>{item.cajero}</p><p>{item.servicio}</p><footer><small>{item.fecha}</small><b>{formatoBs(item.total)}</b></footer></article>) : <div className="caja-historial-vacio"><Icon name="fileText" size={20} /><strong>{historialPaciente.length ? 'Sin resultados para este filtro' : 'Sin consumos previos'}</strong><small>{historialPaciente.length ? 'Prueba con otro estado.' : 'El historial del paciente aparecera aqui.'}</small></div>}</div></aside> : <button className="secundario caja-mostrar-historial" type="button" onClick={() => setHistorialReplegado(false)} aria-label="Desplegar historial" title="Desplegar historial"><Icon name="chevronRight" size={15} /></button>}
    <section ref={setCatalogoNodo} className="panel caja-catalogo-operativo">
      <div className="caja-catalogo-cabecera"><label className="buscador-local"><Icon name="search" size={16} /><input value={busquedaCatalogo} onChange={(event) => setBusquedaCatalogo(event.target.value)} placeholder="Buscar producto o servicio" /></label><div className="caja-vista-catalogo"><button className={vistaCatalogo === 'listado' ? 'activo' : ''} type="button" onClick={() => setVistaCatalogo('listado')}><Icon name="menu" size={15} /> Listado</button><button className={vistaCatalogo === 'galeria' ? 'activo' : ''} type="button" onClick={() => setVistaCatalogo('galeria')}><Icon name="package" size={15} /> Galeria</button></div></div>
      <div className="caja-categorias" aria-label="Categorias del catalogo">{categoriasCatalogo.map((categoria) => <button className={categoriaCatalogo === categoria ? 'activo' : ''} type="button" key={categoria} onClick={() => { setCategoriaCatalogo(categoria); setHojaAbierta(false); }}>{categoria}</button>)}</div>
      {categoriaCatalogo === 'Laboratorios' && <div className="caja-hoja-accion"><button className="primario" type="button" onClick={() => setHojaAbierta((actual) => !actual)}><Icon name="fileText" size={15} /> {hojaAbierta ? 'Ocultar hoja de laboratorio' : 'Tickear laboratorio'}</button></div>}
      {categoriaCatalogo === 'Laboratorios' && hojaAbierta && <section className="caja-hoja-laboratorio"><header><div><span>ORDEN DE LABORATORIO</span><h3>Seleccion de analisis</h3></div><strong>{analisisMarcados.length} marcados</strong></header><div className="caja-hoja-columnas">{Object.entries(hojaLaboratorio).map(([grupo, analisis]) => <fieldset key={grupo}><legend>{grupo}</legend>{analisis.map((item) => <label key={item.nombre}><input type="checkbox" checked={analisisMarcados.includes(item.nombre)} onChange={(event) => setAnalisisMarcados((actual) => event.target.checked ? [...actual, item.nombre] : actual.filter((nombre) => nombre !== item.nombre))} /><span>{item.precio.toFixed(2)}</span><b>{item.nombre}</b></label>)}</fieldset>)}</div><footer><small>Los analisis marcados se agregaran como laboratorios al consumo.</small><button className="primario" type="button" disabled={!analisisMarcados.length} onClick={() => { analisisMarcados.forEach((nombre, index) => agregarItem({ id: 100 + index, nombre, categoria: 'Laboratorios', tipo: 'Servicio', precio: hojaLaboratorio ? Object.values(hojaLaboratorio).flat().find((item) => item.nombre === nombre)?.precio ?? 0 : 0, detalle: 'Analisis de laboratorio' })); setHojaAbierta(false); }}>Agregar seleccionados</button></footer></section>}
      <div className={`caja-items ${vistaCatalogo}`}>
        {itemsCatalogo.map((item) => <button className="caja-item" type="button" key={item.id} onClick={() => agregarItem(item)}><span>{item.tipo} · {item.categoria}</span><strong>{item.nombre}</strong><small>{item.detalle}</small><div><b>{formatoBs(item.precio)}</b>{item.stock !== undefined && <em>{item.stock} disponibles</em>}<Icon name="plus" size={16} /></div></button>)}
        {itemsCatalogo.length === 0 && <p className="caja-catalogo-vacio">No hay productos o servicios que coincidan con la busqueda.</p>}
      </div>
    </section>
    </div>
    <aside className="panel caja-detalle">
      <div className="panel-cabecera"><div><span>CAJA</span><h2>Detalle de cobro</h2></div><button className="secundario" type="button" onClick={limpiarCuenta}>Limpiar</button></div>
      <div className="caja-paciente">
        <div className="clinica-acciones"><button className="secundario caja-registrar-paciente" type="button" onClick={() => { setRegistroAbierto((actual) => !actual); setErrorPaciente(''); }}><Icon name="plus" size={15} /> Registrar paciente</button></div>
        <label className="buscador-local"><Icon name="search" size={16} /><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por CI, nombre o apellido" /></label>
        {pacientesFiltrados.length > 0 && <div className="search-results caja-resultados">{pacientesFiltrados.map((item) => <button key={item.id} type="button" onClick={() => seleccionarPaciente(item)}><strong>{nombreCompleto(item)}</strong><small>CI {item.ci} · {item.celular}</small></button>)}</div>}
        {busqueda.trim() && pacientesFiltrados.length === 0 && <p className="caja-sin-coincidencias">No encontramos coincidencias. Puedes registrar al paciente.</p>}
        {registroAbierto && catalogoNodo && createPortal(<form className="caja-form-paciente" onSubmit={registrarPaciente}>
          <div className="caja-form-cabecera"><strong>Registro de paciente</strong><button type="button" onClick={() => setRegistroAbierto(false)} aria-label="Cerrar registro"><Icon name="close" size={15} /></button></div>
          {errorPaciente && <p className="caja-form-error">{errorPaciente}</p>}
          <fieldset className="caja-grupo-paciente"><legend>Datos personales</legend><div className="caja-campos-paciente">
            <label>Nombres *<input required value={formularioPaciente.nombres} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, nombres: event.target.value })} /></label>
            <label>Apellido paterno *<input required value={formularioPaciente.apellidoPaterno} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, apellidoPaterno: event.target.value })} /></label>
            <label>Apellido materno *<input required value={formularioPaciente.apellidoMaterno} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, apellidoMaterno: event.target.value })} /></label>
            <label>CI *<input required value={formularioPaciente.ci} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, ci: event.target.value })} /></label>
            <label>Complemento<input value={formularioPaciente.complemento} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, complemento: event.target.value })} /></label>
            <label>Expedido en<select value={formularioPaciente.expedidoEn} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, expedidoEn: event.target.value })}><option>Cochabamba</option><option>La Paz</option><option>Santa Cruz</option><option>Otro</option></select></label>
            <label>Fecha de nacimiento *<input required type="date" value={formularioPaciente.fechaNacimiento} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, fechaNacimiento: event.target.value })} /></label>
            <label>Edad<input readOnly value={calcularEdad(formularioPaciente.fechaNacimiento)} placeholder="Se calcula automaticamente" /></label>
            <label>Genero *<select required value={formularioPaciente.genero} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, genero: event.target.value })}><option value="">Seleccionar</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label>
            <label>Correo electronico<input type="email" value={formularioPaciente.correo} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, correo: event.target.value })} /></label>
            <label>Telefono *<input required type="tel" value={formularioPaciente.celular} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, celular: event.target.value })} /></label>
            <label className="campo-completo caja-opciones"><span><input type="checkbox" checked={formularioPaciente.ciConQr} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, ciConQr: event.target.checked })} /> CI con QR</span><span><input type="checkbox" checked={formularioPaciente.afroamericano} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, afroamericano: event.target.checked })} /> Afroamericano</span></label>
          </div></fieldset>
          <fieldset className="caja-grupo-paciente"><legend>Domicilio</legend><div className="caja-campos-paciente"><label>Pais<select value={formularioPaciente.pais} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, pais: event.target.value })}><option>Bolivia</option></select></label><label>Departamento<select value={formularioPaciente.departamento} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, departamento: event.target.value })}><option>Cochabamba</option><option>La Paz</option><option>Santa Cruz</option><option>Otro</option></select></label><label>Ciudad<input value={formularioPaciente.ciudad} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, ciudad: event.target.value })} /></label><label>Zona<input value={formularioPaciente.zona} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, zona: event.target.value })} /></label><label className="campo-completo">Direccion de domicilio<input value={formularioPaciente.direccion} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, direccion: event.target.value })} /></label></div></fieldset>
          <fieldset className="caja-grupo-paciente"><legend>Datos de facturacion</legend><div className="caja-campos-paciente"><label>NIT<input value={formularioPaciente.nit} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, nit: event.target.value })} /></label><label>Razon social<input value={formularioPaciente.razonSocial} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, razonSocial: event.target.value })} /></label></div></fieldset>
          <fieldset className="caja-grupo-paciente"><legend>Persona responsable</legend><div className="caja-campos-paciente"><label>Nombre completo<input value={formularioPaciente.responsableNombre} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, responsableNombre: event.target.value })} /></label><label>Telefono de contacto<input type="tel" value={formularioPaciente.responsableTelefono} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, responsableTelefono: event.target.value })} /></label><label className="campo-completo">Parentesco<input value={formularioPaciente.responsableParentesco} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, responsableParentesco: event.target.value })} placeholder="Ej. Padre, madre o tutor" /></label></div></fieldset>
          <fieldset className="caja-grupo-paciente"><legend>Registro</legend><div className="caja-campos-paciente"><label className="campo-completo">Como se entero de nosotros? *<select required value={formularioPaciente.procedencia} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, procedencia: event.target.value })}><option value="">Seleccionar</option><option>Recomendacion</option><option>Redes sociales</option><option>Internet</option><option>Otro</option></select></label><label className="campo-completo">Observaciones<textarea value={formularioPaciente.observaciones} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, observaciones: event.target.value })} rows={2} /></label><label className="campo-completo caja-opciones"><span><input type="checkbox" checked={formularioPaciente.habilitado} onChange={(event) => setFormularioPaciente({ ...formularioPaciente, habilitado: event.target.checked })} /> Paciente habilitado</span></label></div></fieldset>
          <button className="primario caja-guardar-paciente" type="submit"><Icon name="check" size={15} /> Guardar paciente</button>
        </form>, catalogoNodo)}
        {paciente && <div className="caja-paciente-seleccionado"><div><span>Paciente seleccionado</span><strong>{nombreCompleto(paciente)}</strong><small>CI {paciente.ci} · {paciente.celular}</small></div><button type="button" onClick={() => { setPaciente(null); setEmitirFactura(false); setDatosFactura(facturaInicial); }} aria-label="Quitar paciente"><Icon name="close" size={15} /></button></div>}
      </div>
      <div className="caja-consumo"><div className="caja-consumo-titulo"><strong>Consumo actual</strong><span>{consumo.length ? `${consumo.length} item(s)` : 'Sin prestaciones'}</span></div>{consumo.length === 0 ? <p className="modulo-vacio">Selecciona un producto o servicio del catalogo.</p> : consumo.map((item) => <article key={item.id}><div><strong>{item.nombre}</strong><small>{formatoBs(item.precio)} unitario</small></div><div className="caja-cantidad"><button type="button" onClick={() => cambiarCantidad(item.id, -1)} aria-label={`Quitar ${item.nombre}`}>-</button><span>{item.cantidad}</span><button type="button" onClick={() => cambiarCantidad(item.id, 1)} aria-label={`Agregar ${item.nombre}`}>+</button></div><b>{formatoBs(item.precio * item.cantidad)}</b></article>)}</div>
      <div className="caja-pago"><label><span>Descuento</span><input type="number" min={0} max={subtotal} value={descuento || ''} onChange={(event) => setDescuento(Number(event.target.value) || 0)} placeholder="0.00" /></label><label><span>Metodo de pago</span><select value={metodoPago} onChange={(event) => setMetodoPago(event.target.value as MetodoPago)}>{metodosPago.map((metodo) => <option key={metodo.id} value={metodo.id}>{metodo.nombre}</option>)}</select></label>{metodoPago === 'efectivo' && <label><span>Monto recibido</span><input type="number" min={0} value={montoRecibido} onChange={(event) => setMontoRecibido(event.target.value)} placeholder="0.00" /></label>}<label className="caja-observacion"><span>Observacion</span><textarea value={observacion} onChange={(event) => setObservacion(event.target.value)} placeholder="Nota interna para caja" rows={2} /></label></div>
      <section className="caja-factura"><div><strong>Factura</strong><small>Datos tributarios para esta venta.</small></div><button className={emitirFactura ? 'activo' : ''} type="button" onClick={() => setEmitirFactura((actual) => !actual)} aria-pressed={emitirFactura}>{emitirFactura ? 'Factura activada' : 'Emitir factura'}</button>{emitirFactura && <div className="caja-factura-campos"><label>NIT<input value={datosFactura.nit} onChange={(event) => setDatosFactura({ ...datosFactura, nit: event.target.value })} placeholder="Numero de NIT" /></label><label>Razon social<input value={datosFactura.razonSocial} onChange={(event) => setDatosFactura({ ...datosFactura, razonSocial: event.target.value })} placeholder="Nombre o empresa" /></label>{paciente?.factura && <small>Se cargaron los datos guardados de {nombreCompleto(paciente)}.</small>}{paciente && <button className="caja-guardar-factura" type="button" onClick={guardarFactura}>Guardar para proximas ventas</button>}</div>}</section>
      <div className="caja-resumen"><div><span>Subtotal</span><strong>{formatoBs(subtotal)}</strong></div><div><span>Descuento</span><strong>- {formatoBs(descuentoAplicado)}</strong></div><div className="total"><span>Total a cobrar</span><strong>{formatoBs(total)}</strong></div>{metodoPago === 'efectivo' && <div className={faltante > 0 ? 'pendiente' : 'cambio'}><span>{faltante > 0 ? 'Faltante' : 'Cambio'}</span><strong>{formatoBs(faltante > 0 ? faltante : cambio)}</strong></div>}</div>
      <button className="primario caja-cobrar" disabled={!puedeCobrar}>Registrar cobro <Icon name="arrowRight" size={16} /></button>
    </aside>
  </section>;
}
