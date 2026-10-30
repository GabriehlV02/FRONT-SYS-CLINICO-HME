import { useEffect, useState } from 'react';
import { useInternacionesVinculadas } from './useInternacionesVinculadas';
import Icon from '../../radius/componentes/Icono';
import './TerapiaIntensivaView.css';
import './TerapiaIntensivaAltura.css';
import './TerapiaIntensivaInspeccion.css';
import './TerapiaIntensivaEncabezado.css';

type CamaUci = { cama: string; paciente: string; historia: string; diagnostico: string; frecuencia: number; saturacion: number; presion: string; respiracion: number; estado: 'estable' | 'alerta' | 'sin-asignar' | 'sin-datos' };



function VistaInspeccionUci({ cama, onVolver }: { cama: CamaUci; onVolver: () => void }) {
  return <section className="uci-inspeccion" aria-label={`Inspección de ${cama.cama}`}>
    <header className="uci-inspeccion-cabecera"><button type="button" onClick={onVolver}><Icon name="chevronLeft" size={17} /> Volver a camas UCI</button><div><p>INSPECCIÓN DE CAMA</p><h2>{cama.cama} · {cama.paciente}</h2><small>{cama.historia} · {cama.diagnostico}</small></div><b>{cama.estado === 'alerta' ? 'Requiere revisión' : cama.estado === 'estable' ? 'Paciente estable' : 'Cama disponible'}</b></header>
    <div className="uci-inspeccion-tablero"><section className="uci-inspeccion-monitor"><header><span><i /> MONITOREO</span><small>Sin mediciones conectadas</small></header>{(cama.estado === 'sin-asignar' || cama.estado === 'sin-datos') ? <p>No hay mediciones conectadas al monitor.</p> : <><div className="uci-inspeccion-signos"><div><small>Frecuencia cardiaca</small><strong>{cama.frecuencia}<em>lpm</em></strong></div><div><small>Saturación de oxígeno</small><strong>{cama.saturacion}<em>%</em></strong></div><div><small>Presión arterial</small><strong>{cama.presion}<em>mmHg</em></strong></div><div><small>Frecuencia respiratoria</small><strong>{cama.respiracion}<em>rpm</em></strong></div></div><div className="uci-inspeccion-trazo"><svg viewBox="0 0 700 140" preserveAspectRatio="none"><path d="M0 85h72l18-24 20 48 24-91 24 110 22-53 26 10h65l20-24 20 48 24-91 24 110 22-53 26 10h65l20-24 20 48 24-91 24 110 22-53 26 10h70" /></svg></div></>}</section><section className="uci-inspeccion-camara"><header><span><Icon name="eye" size={16} /> Cámara de seguridad · {cama.cama}</span><small><i /> Sin conexión</small></header><div className="uci-inspeccion-video"><div className="uci-camara-cama" aria-hidden="true"><i /><b /><em /></div><span><Icon name="eye" size={20} /> Vista protegida de la cama</span><time>Acceso auditado · conexión segura</time></div></section></div>
  </section>;
}

function VistaInspeccionUciMejorada({ cama, onVolver }: { cama: CamaUci; onVolver: () => void }) {
  const [visorAmpliado, setVisorAmpliado] = useState<'monitor' | 'camara' | null>(null);

  useEffect(() => {
    const cerrarConEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setVisorAmpliado(null); };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, []);

  const MonitorContenido = () => cama.estado === 'sin-asignar'
    ? <p>No hay mediciones conectadas al monitor.</p>
    : <><div className="uci-inspeccion-signos"><div><small>Frecuencia cardiaca</small><strong>{cama.frecuencia}<em>lpm</em></strong></div><div><small>Saturación de oxígeno</small><strong>{cama.saturacion}<em>%</em></strong></div><div><small>Presión arterial</small><strong>{cama.presion}<em>mmHg</em></strong></div><div><small>Frecuencia respiratoria</small><strong>{cama.respiracion}<em>rpm</em></strong></div></div><div className="uci-inspeccion-trazo"><svg viewBox="0 0 700 140" preserveAspectRatio="none"><path d="M0 85h72l18-24 20 48 24-91 24 110 22-53 26 10h65l20-24 20 48 24-91 24 110 22-53 26 10h65l20-24 20 48 24-91 24 110 22-53 26 10h70" /></svg></div></>;
  const CamaraContenido = () => <div className="uci-inspeccion-video"><div className="uci-camara-cama" aria-hidden="true"><i /><b /><em /></div><span><Icon name="eye" size={20} /> Vista protegida de la cama</span><time>Acceso auditado · conexión segura</time></div>;

  return <section className="uci-inspeccion" aria-label={`Inspección de ${cama.cama}`}>
    <header className="uci-inspeccion-cabecera"><button type="button" onClick={onVolver}><Icon name="chevronLeft" size={17} /> Volver a camas UCI</button><div><p>INSPECCIÓN DE CAMA</p><h2>{cama.cama} · {cama.paciente}</h2><small>{cama.historia} · {cama.diagnostico}</small></div><b>{cama.estado === 'alerta' ? 'Requiere revisión' : cama.estado === 'estable' ? 'Paciente estable' : 'Cama disponible'}</b></header>
    <div className="uci-inspeccion-tablero">
      <section className="uci-inspeccion-monitor"><header><span><i /> MONITOREO</span><div className="uci-visor-acciones"><small>Sin mediciones conectadas</small><button type="button" className="uci-ampliar-visor" onClick={() => setVisorAmpliado('monitor')}><Icon name="eye" size={14} /> Ampliar</button></div></header><MonitorContenido /></section>
      <section className="uci-inspeccion-camara"><header><span><Icon name="eye" size={16} /> Cámara de seguridad · {cama.cama}</span><div className="uci-visor-acciones"><small><i /> Sin conexión</small><button type="button" className="uci-ampliar-visor" onClick={() => setVisorAmpliado('camara')}><Icon name="eye" size={14} /> Ampliar</button></div></header><CamaraContenido /></section>
    </div>
    {visorAmpliado && <div className="uci-visor-modal-fondo" role="presentation" onMouseDown={() => setVisorAmpliado(null)}><section className={`uci-visor-modal ${visorAmpliado}`} role="dialog" aria-modal="true" aria-label={visorAmpliado === 'monitor' ? 'Monitor de signos vitales ampliado' : 'Cámara de seguridad ampliada'} onMouseDown={(event) => event.stopPropagation()}><header><div><span>{visorAmpliado === 'monitor' ? 'MONITOREO CLÍNICO' : 'CÁMARA DE SEGURIDAD'}</span><h3>{visorAmpliado === 'monitor' ? 'Signos vitales en vista ampliada' : `Vista ampliada · ${cama.cama}`}</h3></div><button type="button" aria-label="Cerrar visor ampliado" onClick={() => setVisorAmpliado(null)}>×</button></header><div className="uci-visor-modal-contenido">{visorAmpliado === 'monitor' ? <MonitorContenido /> : <CamaraContenido />}</div></section></div>}
  </section>;
}

export function TerapiaIntensivaView() {
  const internaciones = useInternacionesVinculadas();
  const camas: CamaUci[] = internaciones.filter(r=>r.estado==='confirmada' && /terapia|uci/i.test(r.servicio || '')).map(r=>({cama:[r.sala,r.cama].filter(Boolean).join(' / '),paciente:r.paciente,historia:'HC-'+r.ci,diagnostico:r.motivo,frecuencia:0,saturacion:0,presion:'Sin medición',respiracion:0,estado:'sin-datos'}));
  const [camaInspeccionada, setCamaInspeccionada] = useState<CamaUci | null>(null);
  if (camaInspeccionada) return <VistaInspeccionUciMejorada cama={camaInspeccionada} onVolver={() => setCamaInspeccionada(null)} />;
  return <section className="uci-monitorizacion" aria-label="Monitorización de camas UCI">
    <header className="uci-cabecera"><div><p>TERAPIA INTENSIVA</p><h2>Monitorización de camas</h2><small>Signos vitales y cámaras de seguridad por cama.</small></div><span><i /> Sin conexión de monitoreo</span></header>
    <div className="uci-camas">
      {camas.map((cama) => <article className={`uci-cama ${cama.estado}`} key={cama.cama}>
        <header className="uci-cama-contexto"><div className="uci-cama-info"><div className="uci-cama-ubicacion"><span>UCI ASIGNADA</span><strong>{cama.cama}</strong></div><div className="uci-cama-paciente"><span>PACIENTE</span><h3>{cama.paciente}</h3><small>{cama.historia}</small></div><div className="uci-cama-diagnostico"><span>DIAGNÓSTICO EN TERAPIA INTENSIVA</span><strong>{cama.diagnostico}</strong></div></div><div className="uci-cama-acciones"><b>{cama.estado === 'estable' ? 'Estable' : cama.estado === 'alerta' ? 'Revisar' : 'Disponible'}</b><button type="button" onClick={() => setCamaInspeccionada(cama)}><Icon name="eye" size={15} /> Inspeccionar</button></div></header>
        <section className="uci-monitor" aria-label={`Monitor de signos vitales de ${cama.cama}`}>
          <header><span><i /> MONITOR DE SIGNOS VITALES</span><small>Sin mediciones conectadas</small></header>
          {(cama.estado === 'sin-asignar' || cama.estado === 'sin-datos') ? <p className="uci-monitor-vacio">No hay mediciones conectadas al monitor.</p> : <div className="uci-signos"><div><small>FC</small><strong>{cama.frecuencia}</strong><span>lpm</span></div><div><small>SpO₂</small><strong>{cama.saturacion}</strong><span>%</span></div><div><small>PANI</small><strong>{cama.presion}</strong><span>mmHg</span></div><div><small>FR</small><strong>{cama.respiracion}</strong><span>rpm</span></div></div>}
          <div className="uci-trazo" aria-hidden="true"><svg viewBox="0 0 340 42" preserveAspectRatio="none"><path d="M0 25h35l9-8 10 16 12-29 12 34 11-14 12 1h30l11-8 10 16 12-29 12 34 11-14 12 1h30l11-8 10 16 12-29 12 34 11-14 12 1h31" /></svg></div>
        </section>
        <section className="uci-camara" aria-label={`Cámara de seguridad de ${cama.cama}`}>
          <header><span><Icon name="eye" size={15} /> CÁMARA DE SEGURIDAD</span><small><i /> Sin conexión</small></header>
          <div className="uci-camara-visor"><div className="uci-camara-cama" aria-hidden="true"><i /><b /><em /></div><span><Icon name="eye" size={18} /> Vista protegida · {cama.cama}</span><time>{new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date())}</time></div>
        </section>
      </article>)}
    </div>
  </section>;
}
