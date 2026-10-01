import { useMemo, useState } from 'react';
import Icon from '../../../radius/componentes/Icono';
import { InternacionModal } from './InternacionModal';
type Tipo = 'Producto' | 'Insumo' | 'Servicio';
type Item = {
  id: string;
  nombre: string;
  tipo: Tipo;
  codigo: string;
  precio: number;
  stock?: number;
  categoria?: string;
  subcategoria?: string;
};
type Linea = Item & { cantidad: number };
type Pago = { id: number; metodo: string; monto: string };
const catalogo: Item[] = [
  {
    id: 'consulta',
    nombre: 'Consulta médica general',
    tipo: 'Servicio',
    codigo: 'SRV-001',
    precio: 80,
  },
  {
    id: 'hemograma',
    nombre: 'Hemograma completo',
    tipo: 'Servicio',
    codigo: 'LAB-009',
    precio: 50,
    categoria: 'Laboratorio',
    subcategoria: 'Hematología',
  },
  {
    id: 'rayos',
    nombre: 'Radiografía panorámica',
    tipo: 'Servicio',
    codigo: 'IMG-014',
    precio: 120,
  },
  {
    id: 'gasa',
    nombre: 'Gasa estéril 10 × 10 cm',
    tipo: 'Insumo',
    codigo: 'INS-021',
    precio: 12,
    stock: 84,
  },
  {
    id: 'venda',
    nombre: 'Venda elástica 10 cm',
    tipo: 'Insumo',
    codigo: 'INS-034',
    precio: 18,
    stock: 35,
  },
  {
    id: 'paracetamol',
    nombre: 'Paracetamol 500 mg',
    tipo: 'Producto',
    codigo: 'PRD-104',
    precio: 8,
    stock: 146,
  },
];
const serviciosLaboratorio: Item[] = [
  { id: 'lab-grupo-sanguineo', nombre: 'Grupo sanguíneo y factor RH', tipo: 'Servicio', codigo: 'LAB-001', precio: 35, categoria: 'Laboratorio', subcategoria: 'Hematología' },
  { id: 'lab-hemoglobina', nombre: 'Hemoglobina', tipo: 'Servicio', codigo: 'LAB-002', precio: 35, categoria: 'Laboratorio', subcategoria: 'Hematología' },
  { id: 'lab-hemograma', nombre: 'Hemograma completo', tipo: 'Servicio', codigo: 'LAB-009', precio: 50, categoria: 'Laboratorio', subcategoria: 'Hematología' },
  { id: 'lab-coombs-directo', nombre: 'Prueba de Coombs directo', tipo: 'Servicio', codigo: 'LAB-010', precio: 90, categoria: 'Laboratorio', subcategoria: 'Hematología' },
  { id: 'lab-coagulograma', nombre: 'A.P.T.T.', tipo: 'Servicio', codigo: 'LAB-011', precio: 50, categoria: 'Laboratorio', subcategoria: 'Hemostasia - Coagulograma' },
  { id: 'lab-dimero', nombre: 'Dímero D', tipo: 'Servicio', codigo: 'LAB-012', precio: 260, categoria: 'Laboratorio', subcategoria: 'Hemostasia - Coagulograma' },
  { id: 'lab-calcio', nombre: 'Calcio', tipo: 'Servicio', codigo: 'LAB-020', precio: 40, categoria: 'Laboratorio', subcategoria: 'Electrolitos' },
  { id: 'lab-calcio-ionico', nombre: 'Calcio iónico', tipo: 'Servicio', codigo: 'LAB-021', precio: 40, categoria: 'Laboratorio', subcategoria: 'Electrolitos' },
  { id: 'lab-electrolitos', nombre: 'Electrolitos Na - K - Cl - IC', tipo: 'Servicio', codigo: 'LAB-022', precio: 130, categoria: 'Laboratorio', subcategoria: 'Electrolitos' },
  { id: 'lab-gasometria-a', nombre: 'Gasometría arterial', tipo: 'Servicio', codigo: 'LAB-030', precio: 360, categoria: 'Laboratorio', subcategoria: 'Gasometría' },
  { id: 'lab-gasometria-v', nombre: 'Gasometría venosa', tipo: 'Servicio', codigo: 'LAB-031', precio: 360, categoria: 'Laboratorio', subcategoria: 'Gasometría' },
  { id: 'lab-ana', nombre: 'ANA', tipo: 'Servicio', codigo: 'LAB-040', precio: 150, categoria: 'Laboratorio', subcategoria: 'Serología' },
  { id: 'lab-anca', nombre: 'ANCA C (PR3 anti proteinasa 3)', tipo: 'Servicio', codigo: 'LAB-041', precio: 200, categoria: 'Laboratorio', subcategoria: 'Serología' },
  { id: 'lab-anti-dna', nombre: 'Anti - DNA', tipo: 'Servicio', codigo: 'LAB-042', precio: 150, categoria: 'Laboratorio', subcategoria: 'Serología' },
  { id: 'lab-iga', nombre: 'IgA', tipo: 'Servicio', codigo: 'LAB-050', precio: 130, categoria: 'Laboratorio', subcategoria: 'Inmunoglobulinas' },
  { id: 'lab-igg', nombre: 'IgG', tipo: 'Servicio', codigo: 'LAB-051', precio: 130, categoria: 'Laboratorio', subcategoria: 'Inmunoglobulinas' },
  { id: 'lab-examen-orina', nombre: 'Examen completo de orina', tipo: 'Servicio', codigo: 'LAB-060', precio: 30, categoria: 'Laboratorio', subcategoria: 'Uroanálisis' },
  { id: 'lab-creatinina-orina', nombre: 'Creatinina en orina casual', tipo: 'Servicio', codigo: 'LAB-061', precio: 80, categoria: 'Laboratorio', subcategoria: 'Uroanálisis' },
  { id: 'lab-coprologico', nombre: 'Coproparasitológico directo', tipo: 'Servicio', codigo: 'LAB-070', precio: 30, categoria: 'Laboratorio', subcategoria: 'Parasitología / Examen en heces' },
  { id: 'lab-sangre-oculta', nombre: 'Sangre oculta', tipo: 'Servicio', codigo: 'LAB-071', precio: 80, categoria: 'Laboratorio', subcategoria: 'Parasitología / Examen en heces' },
];
const dinero = (n: number) => `Bs ${n.toFixed(2)}`;
const pagoNuevo = (id: number): Pago => ({ id, metodo: 'Efectivo', monto: '' });
const pacientesEjemplo = [
  { nombre: 'Luis Escobar', ci: '6845210' }, { nombre: 'Luis Alberto Escobar Rojas', ci: '4982157' },
  { nombre: 'María Fernández López', ci: '7351842' }, { nombre: 'Ana Rodríguez Vargas', ci: '6129478' },
];
export function CajaRecepcionView({ onAbrirCuenta }: { onAbrirCuenta?: (origen: 'emergencias' | 'internacion', paciente: string) => void }) {
  const [busqueda, setBusqueda] = useState(''),
    [tipo, setTipo] = useState<'Todos' | Tipo>('Todos'),
    [vista, setVista] = useState<'galeria' | 'listado'>('galeria'),
    [lineas, setLineas] = useState<Linea[]>([]),
    [paciente, setPaciente] = useState(''),
    [busquedaPaciente, setBusquedaPaciente] = useState(''),
    [historialAbierto, setHistorialAbierto] = useState(true),
    [filtroHistorial, setFiltroHistorial] = useState('Todos'),
    [mostrandoLaboratorio, setMostrandoLaboratorio] = useState(false),
    [mostrandoInternacion, setMostrandoInternacion] = useState(false),
    [mostrandoNuevoPaciente, setMostrandoNuevoPaciente] = useState(false),
    [modo, setModo] = useState<'inicio' | 'buscar' | 'registrar'>('inicio'),
    [pagos, setPagos] = useState<Pago[]>([pagoNuevo(1)]),
    [descuento, setDescuento] = useState(''),
    [mensaje, setMensaje] = useState('');
  const resultados = useMemo(
    () =>
      catalogo.filter(
        (i) =>
          (tipo === 'Todos' || i.tipo === tipo) &&
          `${i.nombre} ${i.codigo} ${i.tipo}`
            .toLowerCase()
            .includes(busqueda.toLowerCase()),
      ),
    [busqueda, tipo],
  );
  const laboratorioAgrupado = useMemo(() => {
    const filtrados = [...catalogo, ...serviciosLaboratorio].filter((item) =>
      item.categoria === 'Laboratorio' && `${item.nombre} ${item.codigo} ${item.subcategoria}`.toLowerCase().includes(busqueda.toLowerCase()),
    );
    return filtrados.reduce<Record<string, Item[]>>((grupos, item) => {
      const clave = item.subcategoria || 'Sin subcategoría';
      (grupos[clave] ||= []).push(item);
      return grupos;
    }, {});
  }, [busqueda]);
  const subtotal = lineas.reduce((t, i) => t + i.precio * i.cantidad, 0),
    rebaja = Math.min(Math.max(Number(descuento) || 0, 0), subtotal),
    total = subtotal - rebaja,
    pagado = pagos.reduce((t, p) => t + Math.max(Number(p.monto) || 0, 0), 0),
    pendiente = Math.max(total - pagado, 0),
    cambio = Math.max(pagado - total, 0);
  const agregar = (i: Item) => {
    setLineas((a) =>
      a.some((x) => x.id === i.id)
        ? a.map((x) => (x.id === i.id ? { ...x, cantidad: x.cantidad + 1 } : x))
        : [...a, { ...i, cantidad: 1 }],
    );
    setMensaje(`${i.nombre} agregado al carrito.`);
  };
  const cantidad = (id: string, d: number) =>
    setLineas((a) =>
      a
        .map((x) =>
          x.id === id ? { ...x, cantidad: Math.max(0, x.cantidad + d) } : x,
        )
        .filter((x) => x.cantidad),
    );
  const coincidenciasPaciente = useMemo(() => {
    const termino = busquedaPaciente.trim().toLocaleLowerCase('es');
    return termino ? pacientesEjemplo.filter(p => `${p.nombre} ${p.ci}`.toLocaleLowerCase('es').includes(termino)).slice(0, 6) : [];
  }, [busquedaPaciente]);
  const historialPaciente = paciente === 'Luis Escobar'
    ? [{ n: 'EM-000318', fecha: '29 de septiembre de 2026 09:08', total: '238.00', estado: 'A cuenta', detalle: 'Emergencias · Oxígeno y materiales' }, { n: 'EM-000317', fecha: '29 de septiembre de 2026 08:45', total: '95.00', estado: 'A cuenta', detalle: 'Emergencias · Medicamentos e insumos' }, { n: '131909', fecha: '18 de agosto de 2026 19:02', total: '160.00', estado: 'Pagado', detalle: 'Descargos Ambulatorios 510' }]
    : [{ n: '131932', fecha: '19 de agosto de 2026 10:56', total: '160.00', estado: 'Pagado', detalle: 'Descargos Ambulatorios 510' }, { n: '131910', fecha: '18 de agosto de 2026 19:17', total: '780.00', estado: 'A cuenta', detalle: 'Descargos Ambulatorios 510' }, { n: '131912', fecha: '18 de agosto de 2026 21:02', total: '2.400.00', estado: 'Pre venta', detalle: 'Descargos Ambulatorios 510' }, { n: '131909', fecha: '18 de agosto de 2026 19:02', total: '160.00', estado: 'Anulado', detalle: 'Descargos Ambulatorios 510' }];
  const seleccionar = (nombre?: string) => {
    if (nombre) { setPaciente(nombre); setHistorialAbierto(true); setBusquedaPaciente(''); setModo('inicio'); return; }
    setHistorialAbierto(true);
    setPaciente('María Fernández López');
    setModo('inicio');
  };
  const cobrar = () => {
    if (!lineas.length || pendiente > 0) return;
    setMensaje('Venta registrada correctamente. Lista para imprimir factura.');
    setLineas([]);
    setPagos([pagoNuevo(Date.now())]);
    setDescuento('');
  };
  return (
    <section className="punto-pos">
      {mostrandoInternacion && <InternacionModal onCerrar={() => setMostrandoInternacion(false)} />}
      {mostrandoNuevoPaciente && <div className="punto-nuevo-paciente-fondo" role="presentation" onClick={() => setMostrandoNuevoPaciente(false)}>
        <form className="punto-nuevo-paciente-modal" role="dialog" aria-modal="true" aria-label="Nuevo paciente" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); setMostrandoNuevoPaciente(false); }}>
          <header><div><span><Icon name="users" size={20} /></span><div><p>NUEVO PACIENTE</p><h2>Registrar paciente</h2></div></div><button type="button" aria-label="Cerrar" onClick={() => setMostrandoNuevoPaciente(false)}><Icon name="close" size={18} /></button></header>
          <div className="punto-nuevo-paciente-contenido">
            <section className="nuevo-paciente-busqueda"><label><Icon name="search" size={17} /><input placeholder="Buscar paciente registrado" /></label><button type="button"><Icon name="fileText" size={16} /> Imprimir formulario</button></section>
            <fieldset className="nuevo-paciente-seccion"><legend>Datos del paciente</legend><div className="nuevo-paciente-campos">
              <label>Nombres *<input required placeholder="Nombres" /></label><label>Apellido paterno *<input required placeholder="Apellido paterno" /></label><label>Apellido materno *<input required placeholder="Apellido materno" /></label><label>CI *<input required placeholder="CI" /></label><label>Complemento<input placeholder="Complemento" /></label><label>Expedido en<select defaultValue=""><option value="" disabled>Seleccionar</option><option>Cochabamba</option><option>La Paz</option><option>Santa Cruz</option></select></label><label>NIT<input placeholder="NIT" /></label><label>Razón social<input placeholder="Razón social" /></label><label>Fecha de nacimiento *<input required type="date" /></label><label>Teléfono<input type="tel" placeholder="+591" /></label><label>Género *<select required defaultValue=""><option value="" disabled>Seleccionar</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label>
            </div><div className="nuevo-paciente-opciones"><label><input type="checkbox" /> CI con QR</label><label><input type="checkbox" /> Afroamericano</label></div></fieldset>
            <fieldset className="nuevo-paciente-seccion"><legend>Domicilio</legend><div className="nuevo-paciente-campos nuevo-paciente-domicilio"><label>País<select defaultValue="Bolivia"><option>Bolivia</option></select></label><label>Departamento<select defaultValue="Cochabamba"><option>Cochabamba</option><option>La Paz</option><option>Santa Cruz</option></select></label><label>Ciudad<input placeholder="Ciudad" /></label><label>Zona / barrio<input placeholder="Zona cardinal" /></label><label className="campo-ancho">Dirección domicilio<input placeholder="Dirección" /></label></div></fieldset>
            <fieldset className="nuevo-paciente-seccion"><legend>Persona responsable</legend><div className="nuevo-paciente-campos nuevo-paciente-responsable"><label>Nombre completo<input placeholder="Nombre completo" /></label><label>Teléfono de contacto<input type="tel" placeholder="Teléfono" /></label><label>Parentesco<input placeholder="Ej. Padre, madre o tutor" /></label></div></fieldset>
            <fieldset className="nuevo-paciente-seccion"><legend>Preguntas</legend><div className="nuevo-paciente-campos nuevo-paciente-preguntas"><label className="campo-ancho">¿Cómo se enteró de nosotros? *<select required defaultValue=""><option value="" disabled>Seleccionar una opción</option><option>Recomendación</option><option>Redes sociales</option><option>Otro</option></select></label><label className="campo-ancho">Observaciones<textarea placeholder="Observaciones" /></label></div><label className="nuevo-paciente-habilitado"><input type="checkbox" defaultChecked /> Habilitado</label></fieldset>
          </div>
          <footer><button type="button" onClick={() => setMostrandoNuevoPaciente(false)}>Cancelar</button><button type="submit">Guardar paciente</button></footer>
        </form>
      </div>}
      <header className="punto-pos-cabecera punto-pos-contexto">
        <div className="punto-contexto">
          <label>
            Sucursal
            <select defaultValue="Hospital María Esperanza">
              <option>Hospital María Esperanza</option>
              <option>Centro de Hemodiálisis</option>
              <option>Policonsultorio</option>
            </select>
          </label>
          <label>
            Caja
            <select defaultValue="Caja 01 · Recepción">
              <option>Caja 01 · Recepción</option>
              <option>Caja 02 · Farmacia</option>
            </select>
          </label>
        </div>
      </header>
      <div className={`punto-pos-layout ${paciente ? (historialAbierto ? 'con-historial' : 'historial-plegado') : ''}`}>
        {paciente && <aside className="punto-historial-paciente">
          <button className="punto-historial-control" type="button" aria-expanded={historialAbierto} aria-label={historialAbierto ? 'Ocultar historial del paciente' : 'Mostrar historial del paciente'} title={historialAbierto ? 'Ocultar historial' : 'Mostrar historial'} onClick={() => setHistorialAbierto(abierto => !abierto)}><Icon name={historialAbierto ? 'chevronLeft' : 'chevronRight'} size={16} />{historialAbierto && <span>Ocultar</span>}</button>
          {historialAbierto && <div className="punto-historial-contenido punto-historial-nuevo"><header><div><p>CUENTAS ANTERIORES</p><h3>{paciente}</h3></div><b>HC-004821</b></header>{paciente === 'Luis Escobar' && <section className="punto-acceso-internacion"><strong>Internado</strong><button type="button" onClick={() => onAbrirCuenta?.('internacion', paciente)}>Ver cuenta <Icon name="arrowRight" size={14} /></button></section>}<select value={filtroHistorial} onChange={e => setFiltroHistorial(e.target.value)} aria-label="Filtrar cuentas históricas"><option>Todos</option><option>Pagado</option><option>A cuenta</option><option>Anulado</option><option>Pre venta</option></select><div className="punto-historial-lista">{historialPaciente.filter(c => filtroHistorial === 'Todos' || c.estado === filtroHistorial).map(c => <article key={c.n} className={`estado-${c.estado.toLowerCase().replace(' ', '-')}`}><div><strong>N.º {c.n}</strong><small>HOSPITAL</small></div><span className="punto-historial-estado">{c.estado}</span><p><Icon name="chevronRight" size={14} /> Cajero/a: farmacia test farmacia test<br /><em>{c.detalle}</em></p><footer><small>{c.fecha}</small><b>Bs. {c.total}</b></footer></article>)}</div></div>}
        </aside>}
        <section className="punto-catalogo">
          <div className="punto-busquedas">
          <label>
            <Icon name="search" size={17} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto por nombre, código o categoría…"
            />
          </label>
          <button
            className="punto-accion-laboratorio"
            type="button"
            aria-pressed={mostrandoLaboratorio}
            onClick={() => { setMostrandoLaboratorio((abierto) => !abierto); setBusqueda(''); setMensaje(''); }}
          >
            <Icon name="lab" size={16} /> Laboratorio
          </button>
          <button
            className="punto-accion-internacion"
            type="button"
            aria-haspopup="dialog"
            onClick={() => { setMensaje(''); setMostrandoInternacion(true); }}
          >
            <Icon name="plus" size={16} /> Internación
          </button>
          <button
            className="punto-accion-nuevo-paciente"
            type="button"
            onClick={() => { setMostrandoNuevoPaciente(true); setMensaje(''); }}
          >
            <Icon name="plus" size={16} /> Nuevo paciente
          </button>
        </div>
          {!mostrandoLaboratorio && <div className="punto-catalogo-filtros">
            <div className="punto-categorias">
              {(['Todos', 'Producto', 'Insumo', 'Servicio'] as const).map(
                (o) => (
                  <button
                    type="button"
                    className={tipo === o ? 'activo' : ''}
                    key={o}
                    onClick={() => setTipo(o)}
                  >
                    {o}
                  </button>
                ),
              )}
            </div>
            <div
              className="punto-modo-vista"
              role="group"
              aria-label="Cambiar vista de catálogo"
            >
              <button
                type="button"
                className={vista === 'listado' ? 'activo' : ''}
                onClick={() => setVista('listado')}
              >
                <Icon name="menu" size={16} /> Listado
              </button>
              <button
                type="button"
                className={vista === 'galeria' ? 'activo' : ''}
                onClick={() => setVista('galeria')}
              >
                <Icon name="image" size={16} /> Galería
              </button>
            </div>
          </div>}
          {mensaje && <p className="punto-aviso exito">{mensaje}</p>}
          {mostrandoLaboratorio ? (
            <section className="punto-laboratorio" aria-label="Servicios de laboratorio">
              <header>
                <div><small>CATÁLOGO DE SERVICIOS</small><h2>Laboratorio</h2></div>
                <span>{Object.values(laboratorioAgrupado).flat().length} servicios</span>
              </header>
              {Object.keys(laboratorioAgrupado).length ? <div className="punto-laboratorio-grupos">
                {Object.entries(laboratorioAgrupado).map(([subcategoria, servicios]) => <section key={subcategoria}>
                  <h3>{subcategoria}</h3>
                  {servicios.map((servicio) => <button type="button" key={servicio.id} onClick={() => agregar(servicio)}>
                    <span className="punto-laboratorio-check" aria-hidden="true" /><b>{dinero(servicio.precio)}</b><span>{servicio.nombre}</span><Icon name="plus" size={15} />
                  </button>)}
                </section>)}
              </div> : <p className="punto-laboratorio-vacio">No se encontraron servicios de laboratorio.</p>}
            </section>
          ) : vista === 'galeria' ? (
            <div className="punto-tarjetas">
              {resultados.map((i) => (
                <article key={i.id}>
                  <div className="punto-tarjeta-avatar">
                    <span>
                      {i.nombre
                        .split(' ')
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join('')}
                    </span>
                  </div>
                  <div className="punto-tarjeta-info">
                    <small>{i.codigo}</small>
                    <strong>{i.nombre}</strong>
                    <span>
                      {i.tipo}
                      {i.stock !== undefined ? ` · Stock ${i.stock}` : ''}
                    </span>
                  </div>
                  <footer>
                    <div>
                      <b>{dinero(i.precio)}</b>
                      <small>{i.tipo}</small>
                    </div>
                    <button type="button" onClick={() => agregar(i)}>
                      <Icon name="plus" size={16} /> Agregar
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="punto-listado">
              {resultados.map((i) => (
                <article key={i.id}>
                  <div className="punto-listado-avatar">
                    {i.nombre
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')}
                  </div>
                  <div className="punto-listado-info">
                    <strong>{i.nombre}</strong>
                    <span>
                      {i.codigo} · {i.tipo}
                    </span>
                  </div>
                  <b>{dinero(i.precio)}</b>
                  <button type="button" onClick={() => agregar(i)}>
                    <Icon name="plus" size={16} /> Agregar
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
        <aside className="punto-carrito">
          <header>
            <div>
              <p>CARRITO DE VENTA</p>
              <strong>
                {lineas.reduce((t, i) => t + i.cantidad, 0)} productos
              </strong>
            </div>
            <Icon name="asset" size={24} />
          </header>
          <section className="punto-cliente">
            <header>
              <strong>Paciente</strong>
              {paciente && (
                <button
                  className="cliente-cambiar"
                  type="button"
                  onClick={() => setPaciente('')}
                >
                  Cambiar
                </button>
              )}
            </header>
            {!paciente && modo === 'inicio' && (
              <div className="cliente-acciones">
                <button type="button" onClick={() => setModo('buscar')}>
                  <Icon name="search" size={15} /> Buscar paciente
                </button>
                <button type="button" onClick={() => setModo('registrar')}>
                  <Icon name="plus" size={15} /> Registrar cliente
                </button>
              </div>
            )}
            {!paciente && modo === 'buscar' && (
              <div className="cliente-busqueda">
                <label>
                  <Icon name="search" size={16} />
                  <input autoFocus value={busquedaPaciente} onChange={e => setBusquedaPaciente(e.target.value)} placeholder="Buscar por nombre o CI" />
                </label>
                {!!busquedaPaciente && <div className="cliente-coincidencias" role="listbox" aria-label="Coincidencias de pacientes">{coincidenciasPaciente.length ? coincidenciasPaciente.map(p => <button type="button" role="option" key={p.ci} onClick={() => seleccionar(p.nombre)}><span><b>{p.nombre}</b><small>CI: {p.ci}</small></span><Icon name="chevronRight" size={15} /></button>) : <p>No se encontraron coincidencias.</p>}</div>}
                <button
                  className="cliente-secundario"
                  type="button"
                  onClick={() => { setBusquedaPaciente(''); setModo('inicio'); }}
                >
                  Cancelar
                </button>
              </div>
            )}
            {!paciente && modo === 'registrar' && (
              <div className="cliente-formulario">
                <input placeholder="Nombres y apellidos *" />
                <input placeholder="CI *" />
                <input placeholder="Número de celular" />
                <div>
                  <button type="button" onClick={() => seleccionar()}>
                    Guardar paciente
                  </button>
                  <button
                    className="cliente-secundario"
                    type="button"
                    onClick={() => setModo('inicio')}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {paciente && (
              <button className="cliente-resumen" type="button">
                <span>
                  <small>Paciente</small>
                  <b>{paciente}</b>
                </span>
                <span>
                  <small>Historia clínica</small>
                  <b>HC-004821</b>
                </span>
                <Icon name="chevronDown" size={18} />
              </button>
            )}
          </section>
          <div className="punto-carrito-lineas">
            {lineas.length ? (
              lineas.map((i) => (
                <article key={i.id}>
                  <strong>{i.nombre}</strong>
                  <small>{dinero(i.precio)} c/u</small>
                  <div>
                    <button type="button" onClick={() => cantidad(i.id, -1)}>
                      −
                    </button>
                    <b>{i.cantidad}</b>
                    <button type="button" onClick={() => cantidad(i.id, 1)}>
                      +
                    </button>
                    <span>{dinero(i.precio * i.cantidad)}</span>
                    <button
                      className="punto-quitar"
                      type="button"
                      onClick={() =>
                        setLineas((a) => a.filter((x) => x.id !== i.id))
                      }
                    >
                      ×
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p>No hay productos en el carrito.</p>
            )}
          </div>
          <section className="punto-resumen">
            <div>
              <span>Subtotal</span>
              <b>{dinero(subtotal)}</b>
            </div>
            <label>
              Descuento
              <input
                type="number"
                min="0"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                placeholder="0.00"
              />
            </label>
            <div className="punto-total">
              <span>Total</span>
              <b>{dinero(total)}</b>
            </div>
          </section>
          <section className="punto-pago-mixto">
            <header>
              <div>
                <strong>Pago mixto</strong>
                <small>Agrega métodos hasta completar el total</small>
              </div>
              <Icon name="asset" size={20} />
            </header>
            {pagos.map((p) => (
              <div className="punto-pago-fila" key={p.id}>
                <select
                  value={p.metodo}
                  onChange={(e) =>
                    setPagos((a) =>
                      a.map((x) =>
                        x.id === p.id ? { ...x, metodo: e.target.value } : x,
                      ),
                    )
                  }
                >
                  <option>Efectivo</option>
                  <option>QR</option>
                  <option>Tarjeta</option>
                  <option>Transferencia</option>
                </select>
                <input
                  type="number"
                  min="0"
                  value={p.monto}
                  onChange={(e) =>
                    setPagos((a) =>
                      a.map((x) =>
                        x.id === p.id ? { ...x, monto: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Monto"
                />
                {pagos.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPagos((a) => a.filter((x) => x.id !== p.id))
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              className="punto-agregar-pago"
              type="button"
              onClick={() => setPagos((a) => [...a, pagoNuevo(Date.now())])}
            >
              <Icon name="plus" size={15} /> Agregar método de pago
            </button>
            <div className="punto-pago-totales">
              <span>
                Total pagado <b>{dinero(pagado)}</b>
              </span>
              <span>
                Saldo pendiente <b>{dinero(pendiente)}</b>
              </span>
              {cambio > 0 && (
                <span>
                  Cambio <b>{dinero(cambio)}</b>
                </span>
              )}
            </div>
          </section>
          <button
            className="punto-cobrar"
            type="button"
            disabled={!lineas.length || pendiente > 0}
            onClick={cobrar}
          >
            <Icon name="check" size={17} /> Cobrar e imprimir factura
          </button>
        </aside>
      </div>
    </section>
  );
}
