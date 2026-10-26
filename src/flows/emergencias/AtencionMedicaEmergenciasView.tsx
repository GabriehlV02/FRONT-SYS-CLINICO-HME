import { useEffect, useRef, useState, type FormEvent } from 'react';
import AnamnesisEmergencia from './AnamnesisEmergencia';
import RevisionSistemas from './RevisionSistemas';
import Icon from '../../radius/componentes/Icono';
import { apiEmergencias, camposIdentidad, fechaEmergencia, nombrePaciente, tiposOrden, type CuentaEmergencia, type ItemEmergencia, type OrdenEmergencia } from './emergenciasApi';
import { HojaLaboratorios } from '../consultorio/HojaLaboratorios';
import { HistoriaHojeable, type PacienteHistoria } from '../consultorio/ConsultorioView';
import './TriajeEmergenciasView.css';
import './AtencionMedicaEmergenciasView.css';
import { cubiculosEmergencias, nombreCubiculo } from './cubiculos';

type BorradorOrden = Pick<OrdenEmergencia, 'id' | 'revision' | 'tipo' | 'titulo' | 'indicaciones' | 'dosis' | 'via' | 'frecuencia' | 'duracion' | 'itemId' | 'porHora'>;
const nuevaOrden = (tipo = 'medicamento'): BorradorOrden => ({ id: crypto.randomUUID(), revision: 0, tipo, titulo: '', indicaciones: '', dosis: '', via: '', frecuencia: '', duracion: '', itemId: '', porHora: false });
const vitales = [['temperatura', 'Temperatura', '°C'], ['frecuenciaCardiaca', 'Frec. cardíaca', 'lpm'], ['frecuenciaRespiratoria', 'Frec. respiratoria', 'rpm'], ['presionSistolica', 'Presión sistólica', 'mmHg'], ['presionDiastolica', 'Presión diastólica', 'mmHg'], ['saturacion', 'Saturación', '%'], ['glicemia', 'Glicemia', 'mg/dL'], ['peso', 'Peso', 'kg']];
const tiposImagen = ['Rayos X', 'Tomografía', 'Ecografía', 'Electrocardiograma', 'Holter', 'Resonancia magnética', 'Mamografía', 'Densitometría ósea'];
const datosPacienteIncompletos = (identidad: Record<string, string> | null) => !identidad || ['nombres', 'apellidos', 'documento', 'nacimiento', 'sexo', 'telefono', 'direccion'].some(campo => !identidad[campo]?.trim());
const regionesImagen = ['Cráneo', 'Cuello', 'Tórax', 'Abdomen', 'Pelvis', 'Columna cervical', 'Columna dorsal', 'Columna lumbar', 'Miembro superior', 'Miembro inferior'];
type EstudioImagen = { id: string; tipo: string; contraste: 'sin contraste' | 'con contraste'; regiones: string[] };
const estadoEstudio = (orden: OrdenEmergencia) => ({ pendiente: 'Pendiente', en_curso: 'En proceso', aplicada: 'Resultado disponible', cancelada: 'Cancelado' }[orden.estado]);
const horaIngreso = (fecha: string) => new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(fecha));
const horaActual = () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
const edadPaciente = (nacimiento?: string) => {
  if (!nacimiento) return 'No registrada';
  const fecha = new Date(`${nacimiento}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return 'No registrada';
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  if (hoy.getMonth() < fecha.getMonth() || (hoy.getMonth() === fecha.getMonth() && hoy.getDate() < fecha.getDate())) edad--;
  return edad >= 0 ? `${edad} años` : 'No registrada';
};

const estadoPaciente = (cuenta: CuentaEmergencia) => {
  const campos = cuenta.evaluaciones?.at(-1)?.campos || {};
  const valor = `${campos.estadoPaciente || campos.gravedad || campos.clasificacion || ''}`.trim().toLowerCase();
  if (valor.includes('crit')) return { etiqueta: 'Crítico', clase: 'critico' };
  if (valor.includes('grave')) return { etiqueta: 'Grave', clase: 'grave' };
  if (valor.includes('estable')) return { etiqueta: 'Estable', clase: 'estable' };
  if (valor.includes('leve')) return { etiqueta: 'Leve', clase: 'leve' };
  return { etiqueta: 'Sin clasificar', clase: 'sin-clasificar' };
};

function GraficaEvolucionSignos({ mediciones, signo }: { mediciones: CuentaEmergencia['signos']; signo: string }) {
  const configuracion = vitales.find(([clave]) => clave === signo) || vitales[0];
  const [, titulo, unidad] = configuracion;
  const lecturas = [...mediciones]
    .sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha))
    .map(medicion => ({ fecha: medicion.fecha, valor: Number(medicion.valores[signo]) }))
    .filter(lectura => Number.isFinite(lectura.valor));

  if (!lecturas.length) return <p className="em-vacio em-evolucion-sin-datos">No hay registros de {titulo.toLowerCase()} para graficar.</p>;

  const ancho = 760, alto = 280, izquierda = 56, derecha = 20, arriba = 24, abajo = 48;
  const valores = lecturas.map(lectura => lectura.valor);
  const minimoBase = Math.min(...valores), maximoBase = Math.max(...valores);
  const margen = Math.max((maximoBase - minimoBase) * 0.12, 1);
  const minimo = minimoBase - margen, maximo = maximoBase + margen, rango = maximo - minimo || 1;
  const areaAncho = ancho - izquierda - derecha, areaAlto = alto - arriba - abajo;
  const x = (indice: number) => lecturas.length === 1 ? izquierda + areaAncho / 2 : izquierda + (indice / (lecturas.length - 1)) * areaAncho;
  const y = (valor: number) => arriba + ((maximo - valor) / rango) * areaAlto;
  const puntos = lecturas.map((lectura, indice) => `${x(indice)},${y(lectura.valor)}`).join(' ');
  const formatoHora = (fecha: string) => new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(fecha));

  return <section className="em-grafica-signos" aria-label={`Gráfica temporal de ${titulo}`}>
    <div className="em-grafica-resumen"><strong>{titulo}</strong><span>{lecturas.length} {lecturas.length === 1 ? 'medición' : 'mediciones'} · {unidad}</span></div>
    <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={`Evolución de ${titulo} en el tiempo`}>
      {[0, 1, 2, 3, 4].map(indice => {
        const valor = maximo - (indice / 4) * rango;
        const posicionY = arriba + (indice / 4) * areaAlto;
        return <g key={indice}><line className="em-grafica-guia" x1={izquierda} x2={ancho - derecha} y1={posicionY} y2={posicionY} /><text className="em-grafica-eje" x={izquierda - 9} y={posicionY + 4} textAnchor="end">{valor.toFixed(1)}</text></g>;
      })}
      <line className="em-grafica-eje-linea" x1={izquierda} x2={izquierda} y1={arriba} y2={alto - abajo} />
      <line className="em-grafica-eje-linea" x1={izquierda} x2={ancho - derecha} y1={alto - abajo} y2={alto - abajo} />
      <polyline className="em-grafica-linea" points={puntos} />
      {lecturas.map((lectura, indice) => <g key={`${lectura.fecha}-${indice}`}><circle className="em-grafica-punto" cx={x(indice)} cy={y(lectura.valor)} r="4" /><title>{`${fechaEmergencia(lectura.fecha)}: ${lectura.valor} ${unidad}`}</title>{(indice === 0 || indice === lecturas.length - 1 || lecturas.length <= 4) && <text className="em-grafica-eje" x={x(indice)} y={alto - 18} textAnchor="middle">{formatoHora(lectura.fecha)}</text>}</g>)}
      <text className="em-grafica-unidad" x={izquierda} y="14">{unidad}</text>
    </svg>
  </section>;
}

export function AtencionMedicaEmergenciasView({ cuentaInicialId = '' }: { cuentaInicialId?: string }) {
  const [cuentas, setCuentas] = useState<CuentaEmergencia[]>([]), [activa, setActiva] = useState(''), [busqueda, setBusqueda] = useState('');
  const [subvista, setSubvista] = useState<'atencion' | 'historial'>('atencion'), [cargando, setCargando] = useState(true), [error, setError] = useState('');
  const [catalogo, setCatalogo] = useState<ItemEmergencia[]>([]), [errorCatalogo, setErrorCatalogo] = useState('');
  const [iniciando, setIniciando] = useState(false), [cubiculoNuevo, setCubiculoNuevo] = useState('');
  const [horaIngresoNueva, setHoraIngresoNueva] = useState('');
  const [selectorCubiculoAbierto, setSelectorCubiculoAbierto] = useState(false), [errorCubiculo, setErrorCubiculo] = useState('');
  const [datosNuevos, setDatosNuevos] = useState({ nombres: '', apellidos: '', documento: '', nacimiento: '', telefono: '', familiar: '', parentesco: '', telefonoFamiliar: '', documentoFamiliar: '' });
  const [mostrarAcompanante, setMostrarAcompanante] = useState(false);
  const guardando = useRef(false), secuencia = useRef(0), formularioSucio = useRef(false), solicitud = useRef(crypto.randomUUID());
  async function cargar() {
    if (guardando.current) return;
    const lectura = ++secuencia.current;
    try { const datos = await apiEmergencias<{ cuentas: CuentaEmergencia[] }>(); if (lectura === secuencia.current) { setCuentas(actuales => JSON.stringify(actuales) === JSON.stringify(datos.cuentas) ? actuales : datos.cuentas); setError(''); } }
    catch (e) { if (lectura === secuencia.current) setError((e as Error).message); }
    finally { setCargando(false); }
  }
  async function cargarCatalogo() {
    try { setCatalogo(await apiEmergencias<ItemEmergencia[]>('/catalogo')); setErrorCatalogo(''); }
    catch (e) { setErrorCatalogo((e as Error).message); }
  }
  useEffect(() => {
    void cargar(); void cargarCatalogo();
    const t = window.setInterval(() => void cargar(), 5000);
    const salir = (e: BeforeUnloadEvent) => { if (formularioSucio.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', salir);
    return () => { clearInterval(t); secuencia.current++; window.removeEventListener('beforeunload', salir); };
  }, []);
  useEffect(() => {
    if (cuentaInicialId && cuentas.some(cuenta => cuenta.id === cuentaInicialId)) setActiva(cuentaInicialId);
  }, [cuentaInicialId, cuentas]);
  const cuenta = cuentas.find(c => c.id === activa);
  const visibles = cuentas.filter(c => (subvista === 'historial' ? Boolean(c.fin) : !c.fin) && `${c.cubiculo} ${nombrePaciente(c)} ${c.identidad?.documento || ''}`.toLowerCase().includes(busqueda.toLowerCase()));
  const cubiculosDisponibles = cubiculosEmergencias.filter(cubiculo => !cuentas.some(cuenta => !cuenta.fin && cuenta.cubiculo === cubiculo.id));
  const volverAlListado = () => {
    if (formularioSucio.current && !window.confirm('Hay datos sin guardar. ¿Volver al listado y descartar el borrador?')) return;
    formularioSucio.current = false;
    setActiva('');
  };
  async function iniciarAtencion(evento: FormEvent) {
    evento.preventDefault();
    if (!cubiculoNuevo) { setErrorCubiculo('Selecciona un cubículo de atención antes de iniciar.'); setSelectorCubiculoAbierto(true); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.em-medica-nueva .em-selector-cubiculo > button')?.focus()); return; }
    setErrorCubiculo('');
    guardando.current = true; setError('');
    try {
      const identidad = Object.fromEntries(Object.entries(datosNuevos).filter(([, valor]) => valor.trim()));
      const creada = await apiEmergencias<CuentaEmergencia>('', { cubiculo: cubiculoNuevo, identidad, horaIngreso: horaIngresoNueva, solicitudId: solicitud.current });
      setCuentas(actuales => [creada, ...actuales.filter(item => item.id !== creada.id)]);
      setActiva(creada.id); setIniciando(false); setCubiculoNuevo(''); setHoraIngresoNueva(''); setSelectorCubiculoAbierto(false); solicitud.current = crypto.randomUUID();
      setDatosNuevos({ nombres: '', apellidos: '', documento: '', nacimiento: '', telefono: '', familiar: '', parentesco: '', telefonoFamiliar: '', documentoFamiliar: '' }); setMostrarAcompanante(false);
    } catch (e) { setError((e as Error).message); }
    finally { guardando.current = false; }
  }
    return <section className="emergencias-vista em-medica"
      onPointerDownCapture={() => window.dispatchEvent(new Event('clinico:replegar-sidebar'))}
      onFocusCapture={() => window.dispatchEvent(new Event('clinico:replegar-sidebar'))}>
    <header className={`em-cabecera ${cuenta ? 'em-cabecera-con-paciente' : ''}`}>{cuenta && <button type="button" className="em-volver-listado" onClick={volverAlListado}><Icon name="chevronLeft" size={17}/> Regresar</button>}<div className="em-cabecera-titulo"><p>EMERGENCIAS · ATENCIÓN MÉDICA</p>{!cuenta && <nav className="em-subvistas" aria-label="Vistas de atención médica"><button type="button" className={subvista === 'atencion' ? 'activa' : ''} onClick={() => setSubvista('atencion')}>Atención emergencias</button><button type="button" className={subvista === 'historial' ? 'activa' : ''} onClick={() => setSubvista('historial')}>Historial de atención</button></nav>}</div>{!cuenta && <div className="em-medica-cabecera-acciones"><button className="em-actualizar" type="button" onClick={() => void cargar()}><Icon name="refresh" size={18}/> Actualizar</button>{subvista === 'atencion' && <button className="em-primario em-iniciar-atencion" type="button" onClick={() => { setHoraIngresoNueva(horaActual()); setMostrarAcompanante(false); setIniciando(true); }}><Icon name="plus" size={20} strokeWidth={2.3}/> Iniciar atención</button>}</div>}</header>
    {iniciando && <div className="em-modal-inicio" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setIniciando(false); }}><form className="em-panel em-medica-nueva" role="dialog" aria-modal="true" aria-labelledby="em-medica-inicio-titulo" onSubmit={iniciarAtencion}>
      <header><div><span>INGRESO DIRECTO</span><h3 id="em-medica-inicio-titulo">Iniciar atención médica</h3><p>Selecciona un cubículo y registra los datos disponibles para abrir la atención.</p></div><button type="button" aria-label="Cerrar" onClick={() => setIniciando(false)}><Icon name="close" size={18}/></button></header>
      <div className="em-inicio-datos"><div className="em-selector-cubiculo" onKeyDown={evento => { if (evento.key === 'Escape') setSelectorCubiculoAbierto(false); }}><span>Cubículo de atención *</span><button type="button" disabled={guardando.current || !cubiculosDisponibles.length} className={cubiculoNuevo ? 'seleccionado' : ''} aria-haspopup="listbox" aria-expanded={selectorCubiculoAbierto} onClick={() => setSelectorCubiculoAbierto(abierto => !abierto)}>{cubiculoNuevo ? nombreCubiculo(cubiculoNuevo) : cubiculosDisponibles.length ? 'Selecciona un cubículo' : 'No hay cubículos libres'}<Icon name="chevronDown" size={16} /></button>{selectorCubiculoAbierto && <div className="em-opciones-cubiculo" role="listbox" aria-label="Cubículo de atención">{cubiculosDisponibles.map(cubiculo => <button type="button" role="option" aria-selected={cubiculoNuevo === cubiculo.id} key={cubiculo.id} onClick={() => { setCubiculoNuevo(cubiculo.id); setSelectorCubiculoAbierto(false); setErrorCubiculo(''); solicitud.current = crypto.randomUUID(); }}>{cubiculoNuevo === cubiculo.id && <Icon name="check" size={15} />}{cubiculo.nombre}</button>)}</div>}</div><label className="em-hora-ingreso">Hora de ingreso *<input type="time" required value={horaIngresoNueva} onChange={evento => setHoraIngresoNueva(evento.target.value)} /></label></div>
      {!cubiculosDisponibles.length && <p className="em-error em-error-cubiculo" role="alert">No hay cubículos libres. Finaliza, da de alta o traslada a un paciente para liberar un espacio.</p>}
      {errorCubiculo && <p className="em-error em-error-cubiculo" role="alert">{errorCubiculo}</p>}
      <fieldset><legend>Datos básicos del paciente · opcionales</legend><div className="em-form-grid">{([['nombres','Nombres','text'],['apellidos','Apellidos','text'],['documento','Documento de identidad','text'],['nacimiento','Fecha de nacimiento','date'],['telefono','Teléfono','tel']] as const).map(([campo, etiqueta, tipo]) => <label key={campo}>{etiqueta}<input type={tipo} maxLength={200} value={datosNuevos[campo]} onChange={evento => setDatosNuevos(actual => ({ ...actual, [campo]: evento.target.value }))}/></label>)}</div></fieldset>
      <div className="em-acompanante-toggle"><button type="button" aria-expanded={mostrarAcompanante} aria-controls="em-medica-acompanante" onClick={() => setMostrarAcompanante(abierto => !abierto)}><Icon name={mostrarAcompanante ? 'chevronDown' : 'plus'} size={16}/>{mostrarAcompanante ? 'Ocultar datos del acompañante/responsable' : 'Registrar acompañante/responsable'}</button></div>
      <fieldset id="em-medica-acompanante" className="em-medica-acompanante" hidden={!mostrarAcompanante}><legend>Datos del acompañante / responsable · opcionales</legend><div className="em-form-grid">{([['familiar','Nombre completo','text'],['parentesco','Parentesco','text'],['telefonoFamiliar','Teléfono','tel'],['documentoFamiliar','Documento de identidad','text']] as const).map(([campo, etiqueta, tipo]) => <label key={campo}>{etiqueta}<input type={tipo} maxLength={200} value={datosNuevos[campo]} onChange={evento => setDatosNuevos(actual => ({ ...actual, [campo]: evento.target.value }))}/></label>)}</div></fieldset>
      <footer><button type="button" onClick={() => { setIniciando(false); setMostrarAcompanante(false); }}>Cancelar</button><button className="em-primario" disabled={guardando.current}><Icon name="plus" size={16}/> Iniciar y atender</button></footer>
    </form></div>}
    <div className="em-medica-layout">
      {!cuenta && <aside className="em-panel em-cubiculos"><label className="em-buscar"><Icon name="search" size={16} /><input placeholder="Paciente, CI o cubículo" aria-label="Buscar paciente de emergencias" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label><small className="em-subvista-ayuda">{subvista === 'historial' ? 'Atenciones finalizadas' : 'Atenciones activas en cubículos de emergencia'}</small>
        {!!visibles.length && <div className="em-lista-cabecera" role="row"><span>Cubículo</span><span>Paciente</span><span>N.º HCL</span><span>Edad</span><span>Sexo</span><span>Hora ingreso</span><span>Médico de admisión</span><span>Estado</span><span>Acción</span></div>}
        {visibles.map(c => <button key={c.id} className="em-cubiculo" disabled={guardando.current} onClick={() => {
          if (guardando.current) return;
          if (formularioSucio.current && !window.confirm('Hay datos sin guardar. ¿Atender a este paciente y descartar el borrador?')) return;
          formularioSucio.current = false; setActiva(c.id);
        }}><strong>{nombreCubiculo(c.cubiculo)}</strong><span className="em-paciente-lista">{nombrePaciente(c)}</span><span>{c.identidad?.historiaClinica || 'Sin registro'}</span><span>{edadPaciente(c.identidad?.nacimiento)}</span><span>{c.identidad?.sexo || 'No registrado'}</span><time>{horaIngreso(c.inicio)}</time><span>{c.identidad?.medicoAdmision || 'Médico de turno'}</span><span className={`em-estado-paciente ${estadoPaciente(c).clase}`}>{estadoPaciente(c).etiqueta}</span><span className="em-accion-lista">Atender</span></button>)}
        {!visibles.length && <p className="em-vacio">{cargando ? 'Cargando pacientes…' : 'No hay atenciones activas. Puedes iniciar una desde esta vista.'}</p>}
      </aside>}
      {cuenta ? <AtencionPaciente key={cuenta.id} {...{ cuenta, catalogo, errorCatalogo, cargarCatalogo }} alEditar={valor => { formularioSucio.current = valor; }} ejecutar={async (ruta, body) => {
        if (guardando.current) throw new Error('Espera a que termine la operación actual.');
        guardando.current = true; secuencia.current++;
        try { const actualizada = await apiEmergencias<CuentaEmergencia>(ruta, body); secuencia.current++; setCuentas(prev => prev.map(c => c.id === actualizada.id ? actualizada : c)); }
        finally { guardando.current = false; }
      }} /> : null}
    </div>
  </section>;
}

function AtencionPaciente({ cuenta, catalogo, errorCatalogo, cargarCatalogo, ejecutar, alEditar }: {
  cuenta: CuentaEmergencia; catalogo: ItemEmergencia[]; errorCatalogo: string; cargarCatalogo: () => Promise<void>;
  ejecutar: (ruta: string, body: object) => Promise<void>; alEditar: (valor: boolean) => void;
}) {
  const [cierre, setCierre] = useState<{ condicionEgreso: 'vivo' | 'muerto'; causaEgreso: 'hospitalaria' | 'solicitada' | 'fuga' | 'transferencia' | 'deceso' | 'internacion'; observacionEgreso: string } | null>(null);
  const [orden, setOrden] = useState<BorradorOrden | null>(null), [buscarItem, setBuscarItem] = useState('');
  const [estudiosImagen, setEstudiosImagen] = useState<EstudioImagen[]>([]), [tipoImagen, setTipoImagen] = useState('Rayos X');
  const [valoresSignos, setValoresSignos] = useState<Record<string, string>>({}), [observacionSignos, setObservacionSignos] = useState('');
  const [signoEvolucion, setSignoEvolucion] = useState('temperatura');
  const [registroSignosAbierto, setRegistroSignosAbierto] = useState(false), [horaSignos, setHoraSignos] = useState(horaActual());
  const evolucionDialogo = useRef<HTMLDialogElement>(null);
  const [identidad, setIdentidad] = useState<{ revision: number; datos: Record<string, string> } | null>(null);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState(''), [mensaje, setMensaje] = useState('');
  const [historiaClinicaAbierta, setHistoriaClinicaAbierta] = useState(false);
  const [cobroAbierto, setCobroAbierto] = useState(false), [montoRecibido, setMontoRecibido] = useState(''), [montoPagado, setMontoPagado] = useState(0);
  const [confirmarLiberacion, setConfirmarLiberacion] = useState(false);
  const bloqueo = useRef(false), editorOrden = useRef<HTMLDivElement>(null);
  useEffect(() => { alEditar(Boolean(orden || cierre || identidad)); }, [orden, cierre, identidad]);
  async function guardar(ruta: string, body: object, aviso: string) {
    if (bloqueo.current) return false;
    bloqueo.current = true; setOcupado(true); setError(''); setMensaje('');
    try { await ejecutar(ruta, body); setMensaje(aviso); return true; }
    catch (e) { setError((e as Error).message); return false; }
    finally { bloqueo.current = false; setOcupado(false); }
  }
  function abrirOrden(tipo: string, existente?: OrdenEmergencia) {
    if (orden && !window.confirm('¿Descartar el borrador de la indicación actual?')) return;
    setOrden(existente ? { ...existente } : nuevaOrden(tipo)); setBuscarItem(''); setEstudiosImagen([]); setTipoImagen('Rayos X');
    window.setTimeout(() => editorOrden.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }
  const ultimoSigno = [...cuenta.signos].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))[0];
  const abrirRegistroSignos = () => { setValoresSignos({}); setObservacionSignos(''); setHoraSignos(horaActual()); setRegistroSignosAbierto(true); };
  const totalConsumido = cuenta.consumos.reduce((total, consumo) => total + consumo.precio * consumo.cantidad, 0);
  const saldoPendiente = Math.max(0, totalConsumido - montoPagado);
  const estudios = (cuenta.ordenes || []).filter(ordenActual => ['laboratorio', 'imagenologia'].includes(ordenActual.tipo));
  const datosPaciente = cuenta.identidad || {};
  const liberarCubiculo = () => {
    if (saldoPendiente > 0) { setCobroAbierto(true); return; }
    setConfirmarLiberacion(true);
  };
  const confirmarSalidaCubiculo = () => {
    setConfirmarLiberacion(false);
    setCierre({ condicionEgreso: 'vivo', causaEgreso: 'hospitalaria', observacionEgreso: '' });
    window.setTimeout(() => document.querySelector<HTMLElement>('.em-cierre-emergencia')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  };
  return <div className="em-medica-atencion">
    <main key={`paneles-atencion-v2-${cuenta.id}`} className="em-trabajo">
      <header className="em-panel em-medica-cabecera em-ficha-atencion">
        <div className="em-ficha-principal"><p>ATENCIÓN MÉDICA · {nombreCubiculo(cuenta.cubiculo)}</p><h2>{nombrePaciente(cuenta)}</h2>
          <div className="em-ficha-resumen">
            <section className="em-ficha-persona"><header><b>Paciente</b><span>{datosPaciente.historiaClinica || 'Sin historia clínica'}</span></header><dl><div><dt>Documento</dt><dd>{datosPaciente.documento || 'Sin registro'}</dd></div><div><dt>Edad / sexo</dt><dd>{edadPaciente(datosPaciente.nacimiento)} · {datosPaciente.sexo || 'Sin registro'}</dd></div><div><dt>Teléfono</dt><dd>{datosPaciente.telefono || 'Sin registro'}</dd></div><div><dt>Dirección</dt><dd>{datosPaciente.direccion || 'Sin registro'}</dd></div></dl></section>
            <section className="em-ficha-persona em-ficha-familiar"><header><b>Familiar responsable</b><span>{datosPaciente.parentesco || 'Parentesco sin registrar'}</span></header><dl><div><dt>Nombre completo</dt><dd>{datosPaciente.familiar || 'Sin registro'}</dd></div><div><dt>Teléfono</dt><dd>{datosPaciente.telefonoFamiliar || 'Sin registro'}</dd></div><div><dt>Documento</dt><dd>{datosPaciente.documentoFamiliar || 'Sin registro'}</dd></div></dl></section>
          </div>
          <div className="em-ficha-datos"><span><b>Cuenta</b>{cuenta.id.slice(0, 8).toUpperCase()}</span><span><b>Ingreso</b>{fechaEmergencia(cuenta.inicio)}</span><span><b>Profesional</b>{datosPaciente.medicoAdmision || 'Sin registro'}</span><span><b>Diagnóstico</b>{cuenta.evaluaciones?.at(-1)?.campos.diagnostico || 'Sin registro'}</span></div>
        </div>
        <div className="em-ficha-total"><small>Total consumido</small><strong>Bs {totalConsumido.toFixed(2)}</strong><small>{cuenta.consumos.some(consumo => consumo.porHora && !consumo.fin) ? 'Incluye servicios en curso' : 'Registrado en la cuenta'}</small><button className="em-ver-historia" type="button" onClick={() => setHistoriaClinicaAbierta(true)}><Icon name="fileText" size={15} /> Historia clínica</button>{!cuenta.fin && datosPacienteIncompletos(cuenta.identidad) && <button className="em-completar-paciente" type="button" onClick={() => setIdentidad({ revision: cuenta.revision, datos: { ...datosPaciente } })}><Icon name="edit" size={15} /> Completar datos del paciente</button>}{!cuenta.fin && <button className="em-liberar-cubiculo" type="button" onClick={liberarCubiculo}><Icon name="close" size={15} /> Liberar cubículo</button>}</div>
        {!cuenta.fin && <nav className="em-accesos-orden"><button onClick={() => abrirOrden('medicamento')}>Receta / indicación</button><button onClick={() => abrirOrden('laboratorio')}><Icon name="lab" size={15} /> Laboratorio</button><button onClick={() => abrirOrden('imagenologia')}><Icon name="image" size={15} /> Imagenología</button><button onClick={() => abrirOrden('internacion')}>Internación</button></nav>}
      </header>
      {error && <div className="em-error" role="alert">{error}</div>}{mensaje && <div className="em-aviso" role="status">{mensaje}</div>}
      {cobroAbierto && <div className="em-modal-orden" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setCobroAbierto(false); }}><section className="em-panel em-cobro-cuenta" role="dialog" aria-modal="true"><header className="em-panel-titulo"><div><h3>Cobro pendiente de la cuenta</h3><small>El cubículo se libera al completar el saldo.</small></div><button type="button" onClick={() => setCobroAbierto(false)}><Icon name="close" size={18}/></button></header><div className="em-cobro-detalle"><strong>Detalle de cargos</strong>{cuenta.consumos.map(consumo => <p key={consumo.registroId}><span>{consumo.nombre} × {consumo.cantidad}</span><b>Bs {(consumo.precio * consumo.cantidad).toFixed(2)}</b></p>)}<p><span>Total</span><b>Bs {totalConsumido.toFixed(2)}</b></p><p><span>Pagado</span><b>Bs {montoPagado.toFixed(2)}</b></p><p className="em-cobro-saldo"><span>Saldo pendiente</span><b>Bs {saldoPendiente.toFixed(2)}</b></p></div><form onSubmit={evento => { evento.preventDefault(); const recibido = Number(montoRecibido); if (recibido > 0) { setMontoPagado(actual => actual + recibido); setMontoRecibido(''); if (recibido >= saldoPendiente) setCobroAbierto(false); } }}><label>Monto recibido<input type="number" min="0" step="0.01" required value={montoRecibido} onChange={evento => setMontoRecibido(evento.target.value)} placeholder="0.00" /></label><div className="em-acciones"><button type="button" onClick={() => setCobroAbierto(false)}>Cancelar</button><button className="em-primario">Registrar cobro</button></div></form></section></div>}
      {confirmarLiberacion && <div className="em-modal-orden" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setConfirmarLiberacion(false); }}><section className="em-panel em-confirmar-liberacion" role="dialog" aria-modal="true" aria-labelledby="em-confirmar-liberacion-titulo"><header><span><Icon name="check" size={22}/></span><div><h3 id="em-confirmar-liberacion-titulo">Cuenta sin deuda</h3><p>El paciente ya no tiene ninguna deuda. ¿Estás seguro que quieres liberar el cubículo de atención {nombreCubiculo(cuenta.cubiculo)}?</p></div></header><footer><button type="button" onClick={() => setConfirmarLiberacion(false)}>No, mantener cubículo</button><button type="button" className="em-primario" onClick={confirmarSalidaCubiculo}>Sí, liberar cubículo</button></footer></section></div>}
      {identidad && <div className="em-modal-orden" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setIdentidad(null); }}><section className="em-panel em-orden-estudio" role="dialog" aria-modal="true" aria-labelledby="em-datos-paciente-titulo"><header className="em-panel-titulo"><div><h3 id="em-datos-paciente-titulo">Completar datos del paciente</h3><small>Revisa lo registrado y completa o corrige la información conocida.</small></div><button type="button" aria-label="Cerrar" onClick={() => setIdentidad(null)}><Icon name="close" size={18} /></button></header><form onSubmit={async evento => { evento.preventDefault(); if (await guardar(`/${cuenta.id}/identidad`, { ...identidad.datos, revision: identidad.revision }, 'Datos del paciente actualizados.')) setIdentidad(null); }}><div className="em-form-grid">{camposIdentidad.map(([campo, etiqueta]) => <label key={campo}>{etiqueta}<input type={campo === 'nacimiento' ? 'date' : 'text'} maxLength={200} value={identidad.datos[campo] || ''} onChange={evento => setIdentidad(actual => actual ? { ...actual, datos: { ...actual.datos, [campo]: evento.target.value } } : actual)} /></label>)}</div><div className="em-acciones"><button type="button" onClick={() => setIdentidad(null)}>Cancelar</button><button className="em-primario" disabled={ocupado}>Guardar datos</button></div></form></section></div>}
      <AnamnesisEmergencia key={`anamnesis-${cuenta.id}`} cuentaId={cuenta.id} cerrada={Boolean(cuenta.fin)} inicial={cuenta.evaluaciones?.at(-1)?.campos.enfermedadActual} />
      <RevisionSistemas key={`revision-${cuenta.id}`} cuentaId={cuenta.id} cerrada={Boolean(cuenta.fin)} />
      <section className="em-panel em-diagnostico-final" aria-labelledby="em-diagnostico-final-titulo">
        <header className="em-panel-titulo"><h3 id="em-diagnostico-final-titulo">Diagnóstico Final</h3></header>
        <p className="em-vacio">{cuenta.evaluaciones?.at(-1)?.campos.diagnostico || 'Aún no se ha registrado el diagnóstico final.'}</p>
      </section>
      <section className="em-panel em-cierre-emergencia"><header className="em-panel-titulo"><div><h3>Cierre de atención de emergencia</h3><small>Completa este paso al finalizar. Se registra automáticamente el tiempo de estadía.</small></div>{!cuenta.fin && !cierre && <button onClick={() => setCierre({ condicionEgreso: 'vivo', causaEgreso: 'hospitalaria', observacionEgreso: '' })}>Finalizar atención</button>}</header>
        {cierre ? <form onSubmit={async e => { e.preventDefault(); if (!window.confirm('¿Finalizar esta atención? Ya no se podrán registrar nuevas evaluaciones u órdenes.')) return; if (await guardar(`/${cuenta.id}/cierre`, cierre, 'Atención de emergencia finalizada.')) setCierre(null); }}><div className="em-form-grid"><label>Condición de egreso<select value={cierre.condicionEgreso} onChange={e => setCierre({ ...cierre, condicionEgreso: e.target.value as typeof cierre.condicionEgreso })}><option value="vivo">Vivo</option><option value="muerto">Muerto</option></select></label><label>Causa de alta de emergencia<select value={cierre.causaEgreso} onChange={e => setCierre({ ...cierre, causaEgreso: e.target.value as typeof cierre.causaEgreso })}><option value="hospitalaria">Alta hospitalaria</option><option value="solicitada">Alta solicitada</option><option value="fuga">Fuga</option><option value="transferencia">Transferencia</option><option value="deceso">Deceso</option><option value="internacion">Internación</option></select></label></div><label>Observación de egreso<textarea maxLength={3000} value={cierre.observacionEgreso} onChange={e => setCierre({ ...cierre, observacionEgreso: e.target.value })} placeholder="Resumen, destino, recomendaciones o información relevante del egreso" /></label><div className="em-acciones"><button type="button" onClick={() => setCierre(null)}>Cancelar</button><button className="em-primario" disabled={ocupado}>Confirmar cierre de atención</button></div></form> : cuenta.cierre ? <div className="em-cierre-registrado"><strong>Atención finalizada · {fechaEmergencia(cuenta.cierre.fecha)}</strong><span>Condición: {cuenta.cierre.condicionEgreso === 'vivo' ? 'Vivo' : 'Muerto'} · Causa: {cuenta.cierre.causaEgreso}</span>{cuenta.cierre.observacionEgreso && <p>{cuenta.cierre.observacionEgreso}</p>}<small>Registrado por {cuenta.cierre.usuario}</small></div> : <p className="em-vacio">Pendiente de cierre. Se registrarán condición, causa de egreso, observación y tiempo de estadía.</p>}
      </section>
      <div ref={editorOrden} className={orden && orden.tipo !== 'laboratorio' ? 'em-modal-orden' : undefined}>{orden?.tipo === 'laboratorio' && <HojaLaboratorios paciente={nombrePaciente(cuenta)} onCerrar={() => setOrden(null)} onAceptar={async items => { const detalle = items.map(i => i.nombre).join(' · '); if (await guardar(`/${cuenta.id}/orden`, { ...orden, titulo: `Laboratorio: ${items.length} análisis`, indicaciones: detalle }, 'Orden de laboratorio guardada.')) setOrden(null); else throw new Error('No se pudo guardar la orden.'); }} />}
        {orden?.tipo === 'imagenologia' && <section className="em-panel em-orden-estudio"><header className="em-panel-titulo"><div><h3>Orden de imagenología</h3><small>Agrega todos los estudios requeridos y define sus regiones.</small></div></header><form onSubmit={async e => { e.preventDefault(); if (!estudiosImagen.length) { setError('Agrega al menos un estudio de imagenología.'); return; } const detalle = estudiosImagen.map(x => `${x.tipo}${x.tipo === 'Tomografía' ? ` (${x.contraste})` : ''}: ${x.regiones.join(', ') || 'región por definir'}`).join(' · '); if (await guardar(`/${cuenta.id}/orden`, { ...orden, titulo: `Imagenología: ${estudiosImagen.length} estudio(s)`, indicaciones: detalle }, 'Orden de imagenología guardada.')) setOrden(null); }}><div className="em-agregar-imagen"><label>Tipo de estudio<select value={tipoImagen} onChange={e => setTipoImagen(e.target.value)}>{tiposImagen.map(tipo => <option key={tipo}>{tipo}</option>)}</select></label><button type="button" onClick={() => setEstudiosImagen(actual => [...actual, { id: crypto.randomUUID(), tipo: tipoImagen, contraste: 'sin contraste', regiones: [] }])}><Icon name="plus" size={15} /> Agregar estudio</button></div>{!estudiosImagen.length && <p className="em-vacio">Aún no hay estudios agregados.</p>}<div className="em-estudios-imagen">{estudiosImagen.map((estudio, indice) => <article key={estudio.id}><header><strong>{indice + 1}. {estudio.tipo}</strong><button type="button" onClick={() => setEstudiosImagen(actual => actual.filter(x => x.id !== estudio.id))}>Quitar</button></header>{estudio.tipo === 'Tomografía' && <label className="em-switch">Contraste<select value={estudio.contraste} onChange={e => setEstudiosImagen(actual => actual.map(x => x.id === estudio.id ? { ...x, contraste: e.target.value as EstudioImagen['contraste'] } : x))}><option value="sin contraste">Sin contraste</option><option value="con contraste">Con contraste</option></select></label>}<fieldset><legend>{estudio.tipo === 'Rayos X' ? 'Piezas / regiones a radiografiar' : 'Regiones a contemplar'}</legend><div>{regionesImagen.map(region => <label className="em-check" key={region}><input type="checkbox" checked={estudio.regiones.includes(region)} onChange={() => setEstudiosImagen(actual => actual.map(x => x.id !== estudio.id ? x : { ...x, regiones: x.regiones.includes(region) ? x.regiones.filter(r => r !== region) : [...x.regiones, region] }))} />{region}</label>)}</div></fieldset></article>)}</div><div className="em-acciones"><button type="button" onClick={() => setOrden(null)}>Cancelar</button><button type="button" onClick={() => window.print()}>Imprimir</button><button type="button" onClick={() => window.print()}>Descargar PDF</button><button className="em-primario" disabled={ocupado}>Aceptar y guardar</button></div></form></section>}
        {orden?.tipo === 'internacion' && <section className="em-panel em-orden-estudio"><header className="em-panel-titulo"><div><h3>Orden de internación</h3><small>Registra el motivo y las indicaciones para continuar la atención.</small></div><button type="button" onClick={() => setOrden(null)}>Cerrar</button></header><form onSubmit={async e => { e.preventDefault(); if (await guardar(`/${cuenta.id}/orden`, { ...orden, titulo: orden.titulo || 'Solicitud de internación' }, 'Orden de internación registrada.')) setOrden(null); }}><label>Motivo de internación<input required maxLength={200} value={orden.titulo} onChange={e => setOrden({ ...orden, titulo: e.target.value })} placeholder="Diagnóstico o motivo clínico" /></label><label>Indicaciones<textarea required maxLength={3000} value={orden.indicaciones} onChange={e => setOrden({ ...orden, indicaciones: e.target.value })} placeholder="Sala requerida, cuidados y observaciones" /></label><div className="em-acciones"><button type="button" onClick={() => setOrden(null)}>Cancelar</button><button className="em-primario" disabled={ocupado}>Registrar internación</button></div></form></section>}
        {orden && !['laboratorio', 'imagenologia', 'internacion'].includes(orden.tipo) && <section className="em-panel em-orden-estudio"><header className="em-panel-titulo"><div><h3>{orden.revision ? 'Editar indicación pendiente' : 'Nueva receta / orden médica'}</h3><small>Se enviará a enfermería al guardar</small></div><button type="button" onClick={() => setOrden(null)}>Cerrar</button></header>
        <form onSubmit={async e => { e.preventDefault(); if (await guardar(`/${cuenta.id}/orden`, orden, 'Indicación enviada a Triaje de emergencias.')) setOrden(null); }}>
          <div className="em-form-grid"><label>Tipo de orden<select value={orden.tipo} onChange={e => setOrden({ ...orden, tipo: e.target.value })}>{tiposOrden.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label><label>Nombre / medicamento / procedimiento<input required maxLength={200} value={orden.titulo} onChange={e => setOrden({ ...orden, titulo: e.target.value })} /></label></div>
          <label>Indicaciones para enfermería<textarea required maxLength={3000} value={orden.indicaciones} onChange={e => setOrden({ ...orden, indicaciones: e.target.value })} placeholder="Escribe la prescripción o instrucción que debe seguir enfermería" /></label>
          <div className="em-form-grid">{[['dosis', 'Dosis prescrita y unidad'], ['via', 'Vía de administración'], ['frecuencia', 'Frecuencia / momento de aplicación'], ['duracion', 'Duración indicada']].map(([k, titulo]) => <label key={k}>{titulo}<input maxLength={200} value={String(orden[k as keyof BorradorOrden])} onChange={e => setOrden({ ...orden, [k]: e.target.value })} /></label>)}</div>
          <details open={!!orden.itemId}><summary>Precargar un producto o servicio del catálogo</summary>
            {errorCatalogo && <p className="em-error">{errorCatalogo}</p>}<div className="em-buscador-catalogo"><label>Buscar en catálogo<input value={buscarItem} onChange={e => setBuscarItem(e.target.value)} placeholder="Nombre o código" /></label><button type="button" onClick={() => void cargarCatalogo()}>Actualizar catálogo</button></div>
            <label>Ítem para enfermería<select value={orden.itemId} onChange={e => { const i = catalogo.find(x => x.id === e.target.value); setOrden({ ...orden, itemId: e.target.value, titulo: orden.titulo || i?.nombre || '', porHora: i?.tipo === 'producto' ? false : orden.porHora }); }}><option value="">Sin vincular: enfermería seleccionará el ítem utilizado</option>{catalogo.filter(i => i.id === orden.itemId || `${i.nombre} ${i.codigo}`.toLowerCase().includes(buscarItem.toLowerCase())).map(i => <option value={i.id} key={i.id}>{i.nombre} · {i.codigo} · {i.unidad}</option>)}</select></label>
            {!catalogo.length && <small>El catálogo está vacío o no disponible. Puedes emitir la indicación escrita ahora y vincular el consumo al aplicarla.</small>}
          </details>
          <label className="em-check"><input type="checkbox" disabled={catalogo.find(i => i.id === orden.itemId)?.tipo === 'producto'} checked={orden.porHora} onChange={e => setOrden({ ...orden, porHora: e.target.checked })} /> Servicio por hora: enfermería iniciará y finalizará el contador.</label>
          <div className="em-acciones"><button type="button" onClick={() => setOrden(null)}>Cancelar</button><button className="em-primario" disabled={ocupado || !!cuenta.fin}>Enviar a enfermería</button></div>
        </form>
      </section>}</div>
    </main>
    <aside className="em-medica-datos">
      <details className="em-panel em-signos-desplegable"><summary><span><strong>Signos vitales</strong><small>Registrados por enfermería</small></span><Icon name="patient" size={20} /></summary><div className="em-signos-contenido">
        <p className="em-ultima-toma">{ultimoSigno ? <>Última toma: <time dateTime={ultimoSigno.fecha}>{fechaEmergencia(ultimoSigno.fecha)}</time></> : 'Aún no hay tomas de signos vitales registradas.'}</p>
        <dialog ref={evolucionDialogo} className="em-evolucion-dialogo" aria-labelledby="em-evolucion-titulo" onClick={e => { if (e.target === e.currentTarget) evolucionDialogo.current?.close(); }}>
          <div className="em-evolucion-interior"><header className="em-panel-titulo"><div><h3 id="em-evolucion-titulo">Evolución de signos vitales</h3><small>{nombrePaciente(cuenta)}</small></div><button type="button" autoFocus onClick={() => evolucionDialogo.current?.close()} aria-label="Cerrar evolución de signos vitales"><Icon name="close" size={18}/></button></header>
          {cuenta.signos.length ? <><div className="em-evolucion-controles" role="group" aria-label="Signo vital a graficar">{vitales.map(([clave, titulo, unidad]) => <button key={clave} type="button" className={signoEvolucion === clave ? 'activo' : ''} aria-pressed={signoEvolucion === clave} onClick={() => setSignoEvolucion(clave)}>{titulo}<small>{unidad}</small></button>)}</div><GraficaEvolucionSignos mediciones={cuenta.signos} signo={signoEvolucion} /><details className="em-evolucion-tabla"><summary>Ver mediciones registradas ({cuenta.signos.length})</summary><div><table><thead><tr><th scope="col">Fecha y hora</th>{vitales.map(([clave, titulo, unidad]) => <th scope="col" key={clave}>{titulo}<br/><small>{unidad}</small></th>)}<th scope="col">Observación</th></tr></thead><tbody>{[...cuenta.signos].sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha)).map(s => <tr key={s.id}><th scope="row">{fechaEmergencia(s.fecha)}</th>{vitales.map(([clave]) => <td key={clave}>{s.valores[clave] ?? '—'}</td>)}<td>{s.observacion || '—'}</td></tr>)}</tbody></table></div></details></> : <p className="em-vacio">Aún no hay mediciones registradas para mostrar su evolución.</p>}
          </div>
        </dialog>
        <div className="em-medica-vitales em-ultimo-signo">{vitales.map(([k, t, u]) => <div key={k}><small>{t}</small><strong>{ultimoSigno?.valores[k] === undefined ? '—' : `${ultimoSigno.valores[k]} ${u}`}</strong></div>)}</div>
        <div className="em-signos-acciones"><button type="button" onClick={() => evolucionDialogo.current?.showModal()}>Ver evolución</button></div>
        {!cuenta.fin && <div className="em-signos-registro-accion"><button type="button" className="em-primario" onClick={abrirRegistroSignos}><Icon name="plus" size={16} /> Registrar signos vitales</button></div>}
        {registroSignosAbierto && <div className="em-modal-orden em-modal-signos" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setRegistroSignosAbierto(false); }}><section className="em-panel em-orden-estudio" role="dialog" aria-modal="true" aria-labelledby="em-registro-signos-titulo"><header className="em-panel-titulo"><div><h3 id="em-registro-signos-titulo">Registrar signos vitales</h3><small>La hora actual se propone automáticamente; puedes corregirla si la medición fue tomada antes.</small></div><button type="button" aria-label="Cerrar" onClick={() => setRegistroSignosAbierto(false)}><Icon name="close" size={18} /></button></header><form onSubmit={async evento => { evento.preventDefault(); const valores = Object.fromEntries(Object.entries(valoresSignos).filter(([, valor]) => valor !== '').map(([campo, valor]) => [campo, Number(valor)])); if (!Object.keys(valores).length) { setError('Registra al menos un signo vital.'); return; } if (await guardar(`/${cuenta.id}/signos`, { valores, observacion: observacionSignos, hora: horaSignos }, 'Signos vitales guardados.')) setRegistroSignosAbierto(false); }}><label className="em-hora-registro">Hora de medición<input type="time" required value={horaSignos} onChange={evento => setHoraSignos(evento.target.value)} /></label><div className="em-medica-vitales">{vitales.map(([k, t, u]) => <label key={k}><small>{t}</small><span><input type="number" min="0" max={k === 'saturacion' ? 100 : undefined} step="any" value={valoresSignos[k] || ''} onChange={evento => setValoresSignos(actual => ({ ...actual, [k]: evento.target.value }))} />{u}</span></label>)}</div><label>Observación<textarea maxLength={1000} value={observacionSignos} onChange={evento => setObservacionSignos(evento.target.value)} placeholder="Opcional" /></label><div className="em-acciones"><button type="button" onClick={() => setRegistroSignosAbierto(false)}>Cancelar</button><button className="em-primario" disabled={ocupado}>Guardar signos</button></div></form></section></div>}
        {ultimoSigno?.observacion && <p className="em-texto-clinico">{ultimoSigno.observacion}</p>}
        {cuenta.signos.length > 1 && <details><summary>Mediciones anteriores ({cuenta.signos.length - 1})</summary>{cuenta.signos.slice(0, -1).reverse().map(s => <p key={s.id}><strong>{fechaEmergencia(s.fecha)}</strong><br />{vitales.filter(([k]) => s.valores[k] !== undefined).map(([k, t, u]) => `${t}: ${s.valores[k]} ${u}`).join(' · ')}{s.observacion && ` · ${s.observacion}`}</p>)}</details>}
      </div></details>
      <section className="em-panel em-resultados-estudios"><header className="em-panel-titulo"><div><h3>Resultados de estudios</h3><small>Laboratorio e imagenología solicitados</small></div><span>{estudios.length}</span></header>
        {estudios.length ? <ul>{estudios.map(estudio => { const resultado = estudio.aplicaciones.at(-1)?.observacion; return <li key={estudio.id}><div><strong>{estudio.titulo || (estudio.tipo === 'laboratorio' ? 'Estudio de laboratorio' : 'Estudio de imagenología')}</strong><small>{estudio.indicaciones || 'Sin detalle adicional'}</small></div><div><em className={`em-estado-estudio ${estudio.estado}`}>{estadoEstudio(estudio)}</em>{resultado && <p>{resultado}</p>}</div></li>; })}</ul> : <p className="em-vacio">Aún no hay estudios solicitados para este paciente.</p>}
      </section>
      <section className="em-panel em-resultados-estudios em-resumen-ordenes" aria-label="Órdenes y medicamentos">
        <header className="em-panel-titulo"><div><h3>Órdenes y medicamentos</h3><small>Indicaciones médicas del paciente</small></div><span>{(cuenta.ordenes || []).filter(o => !['laboratorio', 'imagenologia'].includes(o.tipo)).length}</span></header>
        {(cuenta.ordenes || []).some(o => !['laboratorio', 'imagenologia'].includes(o.tipo)) ? <ul>{(cuenta.ordenes || []).filter(o => !['laboratorio', 'imagenologia'].includes(o.tipo)).map(o => <li key={o.id}><div><strong>{o.titulo || tiposOrden.find(([tipo]) => tipo === o.tipo)?.[1] || 'Orden médica'}</strong><small>{o.indicaciones}</small>{[o.dosis, o.via, o.frecuencia, o.duracion].some(Boolean) && <small>{[o.dosis, o.via, o.frecuencia, o.duracion].filter(Boolean).join(' · ')}</small>}<em className={`em-estado-estudio ${o.estado}`}>{estadoEstudio(o)}</em></div></li>)}</ul> : <p className="em-vacio">Aún no hay órdenes ni medicamentos registrados para este paciente.</p>}
      </section>
      <section className="em-panel"><h3>Actividad de enfermería</h3><small>{cuenta.consumos.length} consumo(s) registrado(s)</small>{cuenta.consumos.filter(c => c.porHora && !c.fin).map(c => <p className="em-servicio-activo" key={c.registroId}>● {c.nombre}<small>En uso desde {fechaEmergencia(c.inicio)}</small></p>)}</section>
    </aside>
    {historiaClinicaAbierta && <HistoriaHojeable paciente={{ nombre: nombrePaciente(cuenta), ci: datosPaciente.documento || '', edad: Number.parseInt(edadPaciente(datosPaciente.nacimiento), 10) || 0, fechaNacimiento: datosPaciente.nacimiento || 'Sin registro', numeroHistoria: datosPaciente.historiaClinica || 'Sin historia registrada', datoRelevante: cuenta.evaluaciones?.at(-1)?.campos.diagnostico || 'Sin antecedentes relevantes registrados', estado: cuenta.fin ? 'Al día' : 'Pendiente' } satisfies PacienteHistoria} onCerrar={() => setHistoriaClinicaAbierta(false)} />}
  </div>;
}
