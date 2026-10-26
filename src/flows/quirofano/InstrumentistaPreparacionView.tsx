import { useEffect, useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import { guardarEsterilizacion, leerEsterilizacion, type EstadoEsterilizacion, type KitEsteril, type MaterialEsteril } from './almacenEsterilizacion';
import './InstrumentistaPreparacionView.css';

type Cirugia = { id: string; hora: string; sala: string; paciente: string; procedimiento: string; cirujano: string; historia: string; ci: string; edad: string; diagnostico: string; anestesiologo: string; ayudante: string; instrumentista: string; circulante: string };

const disponible = (kit: KitEsteril, materiales: MaterialEsteril[]) => kit.materialIds.length > 0 && kit.materialIds.every(id => materiales.find(material => material.id === id)?.estado === 'limpio');

export function InstrumentistaPreparacionView({ cirugia, onVolver }: { cirugia: Cirugia; onVolver: () => void }) {
  const [estado, setEstado] = useState<EstadoEsterilizacion>(leerEsterilizacion);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [cirugiaIniciada, setCirugiaIniciada] = useState(false);
  const [cirugiaFinalizada, setCirugiaFinalizada] = useState(false);
  const [subvista, setSubvista] = useState<'precirugia' | 'cirugia' | 'poscirugia'>('precirugia');
  const recargar = () => setEstado(leerEsterilizacion());

  useEffect(() => {
    window.addEventListener('storage', recargar);
    window.addEventListener('hme:esterilizacion:actualizado', recargar);
    return () => { window.removeEventListener('storage', recargar); window.removeEventListener('hme:esterilizacion:actualizado', recargar); };
  }, []);

  const kitsDisponibles = useMemo(() => estado.kits.filter(kit => disponible(kit, estado.materiales)), [estado]);
  const kitsPreparados = useMemo(() => estado.kits.filter(kit => kit.materialIds.length && kit.materialIds.every(id => {
    const material = estado.materiales.find(item => item.id === id);
    return material?.cirugiaId === cirugia.id && ['reservado', 'cirugia'].includes(material.estado);
  })), [estado, cirugia.id]);
  const idsEnKit = useMemo(() => new Set(estado.kits.flatMap(kit => kit.materialIds)), [estado.kits]);
  const individuales = estado.materiales.filter(material => material.cirugiaId === cirugia.id && !idsEnKit.has(material.id) && ['reservado', 'cirugia'].includes(material.estado));
  const utilizados = estado.materiales.filter(material => material.cirugiaId === cirugia.id && material.estado === 'cirugia');
  const preparados = kitsPreparados.length + individuales.length;

  const abrirSolicitud = () => { setSeleccionados([]); setMensaje(''); setModalAbierto(true); };
  const iniciarCirugia = () => {
    if (!preparados) { setMensaje('Prepara al menos un kit o material antes de iniciar la cirugía.'); return; }
    const fecha = new Date().toISOString();
    const materiales = estado.materiales.map(material => material.cirugiaId === cirugia.id && material.estado === 'reservado' ? { ...material, estado: 'cirugia' as const, actualizadoEn: fecha } : material);
    const movimientos = estado.movimientos.concat(estado.materiales.filter(material => material.cirugiaId === cirugia.id && material.estado === 'reservado').map(material => ({ id: crypto.randomUUID(), materialId: material.id, desde: 'reservado' as const, hacia: 'cirugia' as const, cirugiaId: cirugia.id, fecha })));
    const siguiente = { ...estado, materiales, movimientos };
    guardarEsterilizacion(siguiente);
    setEstado(siguiente);
    setCirugiaIniciada(true);
    setSubvista('cirugia');
    setMensaje('Cirugía iniciada. El material preparado fue marcado como en uso.');
  };
  const finalizarCirugia = () => {
    setCirugiaFinalizada(true);
    setSubvista('poscirugia');
    setMensaje('Cirugía finalizada. Completa el conteo y el cierre posquirúrgico.');
  };
  const confirmarSolicitud = () => {
    const kits = estado.kits.filter(kit => seleccionados.includes(kit.id));
    if (!kits.length) return;
    if (kits.some(kit => !disponible(kit, estado.materiales))) { setMensaje('Uno de los kits dejó de estar disponible. Actualiza la selección.'); recargar(); return; }
    const ids = new Set(kits.flatMap(kit => kit.materialIds));
    const fecha = new Date().toISOString();
    const materiales = estado.materiales.map(material => ids.has(material.id) ? { ...material, estado: 'reservado' as const, cirugiaId: cirugia.id, sector: cirugia.sala, actualizadoEn: fecha } : material);
    const movimientos = estado.movimientos.concat(estado.materiales.filter(material => ids.has(material.id)).map(material => ({ id: crypto.randomUUID(), materialId: material.id, desde: material.estado, hacia: 'reservado' as const, cirugiaId: cirugia.id, fecha })));
    const siguiente = { ...estado, materiales, movimientos };
    guardarEsterilizacion(siguiente);
    setEstado(siguiente);
    setModalAbierto(false);
    setMensaje(`${kits.length} kit${kits.length === 1 ? '' : 's'} reservado${kits.length === 1 ? '' : 's'} para preparación.`);
  };

  return <div className="instrumentista-preparacion">
    <nav className="instrumentista-subsubvistas" aria-label="Etapas de enfermería instrumentista">
      <button type="button" className={subvista === 'precirugia' ? 'activo' : ''} onClick={() => setSubvista('precirugia')}><Icon name="asset" size={15}/> Precirugía</button>
      <button type="button" className={subvista === 'cirugia' ? 'activo' : ''} onClick={() => setSubvista('cirugia')} disabled={!cirugiaIniciada} title={!cirugiaIniciada ? 'Inicia la cirugía para habilitar esta etapa' : undefined}><Icon name="arrowRight" size={15}/> En cirugía</button>
      <button type="button" className={subvista === 'poscirugia' ? 'activo' : ''} onClick={() => setSubvista('poscirugia')} disabled={!cirugiaFinalizada} title={!cirugiaFinalizada ? 'Finaliza la cirugía para habilitar esta etapa' : undefined}><Icon name="check" size={15}/> Poscirugía</button>
    </nav>
    {subvista !== 'poscirugia' ? <>
    <div className="instrumentista-ficha-cirugia">
    <div className="instrumentista-cabecera-resumen">
    <header className="instrumentista-preparacion-contexto"><button type="button" onClick={onVolver}><Icon name="chevronLeft" size={16}/> Cirugías programadas</button><div className="instrumentista-cirugia-titulo"><span>{cirugia.sala} · {cirugia.hora}</span><h3>{cirugia.procedimiento}</h3></div></header>
    <section className="instrumentista-resumen-clinico" aria-label="Datos del paciente"><article className="instrumentista-resumen-completo"><section className="instrumentista-paciente-resumen"><header><p>DATOS DEL PACIENTE</p><strong>{cirugia.paciente}</strong></header><div><span><b>HC</b>{cirugia.historia}</span><span><b>CI</b>{cirugia.ci}</span><span><b>Edad</b>{cirugia.edad}</span><span className="instrumentista-diagnostico"><b>Diagnóstico</b>{cirugia.diagnostico}</span></div><aside className="instrumentista-accion-paciente"><button type="button" className={`instrumentista-iniciar-cirugia${cirugiaIniciada && !cirugiaFinalizada ? ' en-curso' : ''}${cirugiaFinalizada ? ' finalizada' : ''}`} onClick={cirugiaIniciada ? finalizarCirugia : iniciarCirugia} disabled={cirugiaFinalizada}>{cirugiaFinalizada ? 'Cirugía finalizada' : cirugiaIniciada ? 'Finalizar cirugía' : 'Iniciar cirugía'}</button></aside></section></article></section>
    </div>
    <section className="instrumentista-resumen-clinico instrumentista-equipo-inferior" aria-label="Equipo quirúrgico"><article className="instrumentista-resumen-completo"><section className="instrumentista-equipo-resumen"><header><p>EQUIPO QUIRÚRGICO</p><strong>Personal involucrado</strong></header><div><span><b>Cirujano/a</b>{cirugia.cirujano}</span><span><b>Anestesiología</b>{cirugia.anestesiologo}</span><span><b>Ayudante</b>{cirugia.ayudante}</span><span><b>Instrumentista</b>{cirugia.instrumentista}</span><span><b>Circulante</b>{cirugia.circulante}</span></div></section></article></section>
    </div>
    <div className={`instrumentista-preparacion-layout${subvista === 'precirugia' ? ' solo-precirugia' : ''}`}>
      <aside className="instrumentista-material-preparado"><header><div><p>MATERIAL PARA CIRUGÍA</p><h4>En preparación</h4><small>{preparados ? `${preparados} registro${preparados === 1 ? '' : 's'} preparado${preparados === 1 ? '' : 's'}.` : 'Aún no hay material solicitado.'}</small></div><button type="button" onClick={abrirSolicitud}><Icon name="plus" size={16}/> Solicitar material</button></header>
        {preparados ? <div className="instrumentista-material-lista">{kitsPreparados.map(kit => <article key={kit.id}><span><Icon name="package" size={17}/></span><div><strong>{kit.nombre}</strong><small>{kit.materialIds.length} instrumentos · Kit reservado</small></div><b>Preparado</b></article>)}{individuales.map(material => <article key={material.id}><span><Icon name="asset" size={17}/></span><div><strong>{material.nombre}</strong><small>{material.codigo} · Asignado por Esterilización</small></div><b>{material.estado === 'cirugia' ? 'En uso' : 'Reservado'}</b></article>)}</div> : <div className="instrumentista-material-vacio"><Icon name="package" size={27}/><strong>Sin material preparado</strong><small>Solicita kits disponibles para iniciar la preparación.</small><button type="button" onClick={abrirSolicitud}>Solicitar material</button></div>}
      </aside>
      {subvista === 'cirugia' && <section className="instrumentista-preparacion-info">
        <section className="instrumentista-monitor" aria-label="Monitor de signos vitales">
          <header><div><p>MONITOR DEL PACIENTE</p><h4>Signos vitales</h4><small>Lectura clínica durante la preparación</small></div><span><i />En línea</span></header>
          <div className="instrumentista-vitales">
            <article><small>FC</small><strong>76 <em>lpm</em></strong></article><article><small>SpO₂</small><strong>98 <em>%</em></strong></article><article><small>PA</small><strong>118/76 <em>mmHg</em></strong></article><article><small>FR</small><strong>16 <em>rpm</em></strong></article><article><small>Temp.</small><strong>36.7 <em>°C</em></strong></article>
          </div>
        </section>
        <section className="instrumentista-uso-registro">
          <header><div><p>REGISTRO DE USO</p><h4>Material utilizado o aplicado</h4></div><span>{utilizados.length} en uso</span></header>
          {utilizados.length ? <div className="instrumentista-uso-lista">{utilizados.map(material => <article key={material.id}><span><Icon name="asset" size={18}/></span><div><strong>{material.nombre}</strong><small>{material.codigo}{idsEnKit.has(material.id) ? ' · Material de kit' : ' · Instrumental individual'}</small></div><b>En uso</b></article>)}</div> : <div className="instrumentista-uso-vacio"><Icon name="asset" size={24}/><strong>Aún no hay usos registrados</strong><small>El material aparecerá aquí cuando sea marcado en uso durante la cirugía.</small></div>}
        </section>
        {mensaje && <p className="instrumentista-preparacion-mensaje" role="status">{mensaje}</p>}
      </section>}
    </div>
    {subvista === 'precirugia' && mensaje && <p className="instrumentista-preparacion-mensaje" role="status">{mensaje}</p>}
    </> : <section className="instrumentista-poscirugia" aria-labelledby="instrumentista-poscirugia-titulo"><header><div><p>ENFERMERÍA INSTRUMENTISTA · POSCIRUGÍA</p><h3 id="instrumentista-poscirugia-titulo">Cierre y control posquirúrgico</h3><small>{cirugia.paciente} · {cirugia.procedimiento} · {cirugia.sala}</small></div><span>Pendiente de cierre</span></header><div className="instrumentista-poscirugia-grid"><article><span><Icon name="check" size={19}/></span><div><strong>Conteo final de instrumental</strong><small>Verifica que el instrumental utilizado esté completo.</small></div><button type="button">Registrar conteo</button></article><article><span><Icon name="package" size={19}/></span><div><strong>Material para esterilización</strong><small>Clasifica y entrega los materiales utilizados durante la cirugía.</small></div><button type="button">Registrar entrega</button></article><article><span><Icon name="fileText" size={19}/></span><div><strong>Observaciones posquirúrgicas</strong><small>Documenta incidencias, faltantes o novedades del procedimiento.</small></div><button type="button">Añadir observación</button></article></div></section>}
    {subvista === 'cirugia' && modalAbierto && <div className="instrumentista-solicitud-fondo" role="presentation" onMouseDown={() => setModalAbierto(false)}><section className="instrumentista-solicitud-modal" role="dialog" aria-modal="true" aria-labelledby="solicitar-material-titulo" onMouseDown={event => event.stopPropagation()}><header><div><p>SOLICITUD DE MATERIAL</p><h3 id="solicitar-material-titulo">Kits disponibles</h3><small>Selecciona los kits que necesitas para {cirugia.procedimiento}.</small></div><button type="button" aria-label="Cerrar" onClick={() => setModalAbierto(false)}><Icon name="close" size={18}/></button></header><div className="instrumentista-kits-disponibles">{kitsDisponibles.length ? kitsDisponibles.map(kit => <label key={kit.id}><input type="checkbox" checked={seleccionados.includes(kit.id)} onChange={() => setSeleccionados(actual => actual.includes(kit.id) ? actual.filter(id => id !== kit.id) : [...actual, kit.id])}/><span><Icon name="package" size={18}/></span><div><strong>{kit.nombre}</strong><small>{kit.materialIds.length} instrumentos · {(kit.especialidades || []).join(', ') || 'Uso general'}</small></div></label>) : <p>No hay kits completos y disponibles en Esterilización.</p>}</div><footer><button type="button" onClick={() => setModalAbierto(false)}>Cancelar</button><button type="button" disabled={!seleccionados.length} onClick={confirmarSolicitud}>Solicitar {seleccionados.length ? `(${seleccionados.length})` : ''}</button></footer></section></div>}
  </div>;
}
