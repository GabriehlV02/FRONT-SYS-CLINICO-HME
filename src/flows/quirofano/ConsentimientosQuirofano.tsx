import { createPortal } from 'react-dom';
import { useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import './ConsentimientosQuirofano.css';

type PacienteConsentimiento = { nombre: string; ci: string; nacimiento: string; telefono: string };
type AcompananteConsentimiento = { nombres: string; apellidoPaterno: string; apellidoMaterno: string; ci: string; nacimiento: string; vinculo: string; telefono: string };
type CirugiaConsentimiento = { medico: string; tipo: string; quirofano: string; fecha: string; hora: string };
type Documento = 'quirurgico' | 'anestesia';

const fechaLegible = (fecha: string) => /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }) : fecha || '—';
const nombreAcompanante = (item: AcompananteConsentimiento) => [item.nombres, item.apellidoPaterno, item.apellidoMaterno].filter(Boolean).join(' ') || '—';

function DocumentoConsentimiento({ tipo, paciente, acompanante, cirugia }: { tipo: Documento; paciente: PacienteConsentimiento; acompanante: AcompananteConsentimiento; cirugia: CirugiaConsentimiento }) {
  const quirurgico = tipo === 'quirurgico';
  return <article className="cq-documento">
    <header><p>HOSPITAL MARÍA ESPERANZA · QUIRÓFANO</p><h2>{quirurgico ? 'Consentimiento informado para procedimiento quirúrgico' : 'Consentimiento informado para anestesia'}</h2><small>Formato para revisión, explicación y firma presencial. La impresión no acredita consentimiento.</small></header>
    <div className="cq-doc-grid"><p><b>Paciente</b>{paciente.nombre}</p><p><b>CI del paciente</b>{paciente.ci}</p><p><b>Fecha de nacimiento</b>{fechaLegible(paciente.nacimiento)}</p><p><b>Teléfono</b>{paciente.telefono || '—'}</p><p><b>Familiar o acompañante</b>{nombreAcompanante(acompanante)}</p><p><b>CI del acompañante</b>{acompanante.ci}</p><p><b>Vínculo con el paciente</b>{acompanante.vinculo}</p><p><b>Teléfono del acompañante</b>{acompanante.telefono}</p><p><b>Médico cirujano</b>{cirugia.medico}</p><p><b>Tipo de cirugía</b>{cirugia.tipo}</p><p><b>Quirófano</b>{cirugia.quirofano}</p><p><b>Fecha y hora programadas</b>{fechaLegible(cirugia.fecha)} · {cirugia.hora}</p></div>
    <div className="cq-doc-campos"><p><b>{quirurgico ? 'Procedimiento específico propuesto' : 'Técnica anestésica propuesta'}:</b> _______________________________________________________________________</p><p><b>Profesional que brinda la información:</b> ______________________________________________________________</p><p><b>Información brindada sobre beneficios, riesgos, alternativas y dudas:</b></p><div className="cq-doc-renglones"/><p><b>Observaciones:</b></p><div className="cq-doc-renglones corto"/></div>
    <p className="cq-doc-nota">Este formato debe adaptarse y validarse con los protocolos institucionales vigentes. Los espacios de explicación y firmas se completan durante el proceso presencial de consentimiento informado.</p>
    <div className="cq-doc-firmas"><div><span>Firma / huella del paciente</span><small>Nombre y CI: ______________________________</small></div><div><span>Firma del representante, si corresponde</span><small>Nombre y CI: ______________________________</small></div><div><span>Firma y sello del profesional</span><small>Nombre: __________________________________</small></div></div>
    <p className="cq-doc-lugar">Lugar y fecha de firma: _______________________________________________________</p>
  </article>;
}

export function ConsentimientosQuirofano({ paciente, acompanante, cirugia, acompananteCompleto }: { paciente: PacienteConsentimiento | null; acompanante: AcompananteConsentimiento; cirugia: CirugiaConsentimiento; acompananteCompleto: boolean }) {
  const [tipo, setTipo] = useState<Documento>('quirurgico');
  const datosCompletos = Boolean(paciente && acompananteCompleto && cirugia.medico && cirugia.tipo && cirugia.quirofano && cirugia.fecha && cirugia.hora);
  return <section className="cuenta-q-paso cq-consentimientos" aria-label="Consentimientos"><header><b>4</b><div><h3>Consentimientos</h3><small>Documentos para imprimir con los datos de paciente, acompañante y cirugía.</small></div></header>
    <div className="cq-consent-contenido"><div className="cq-consent-opciones"><button type="button" className={tipo === 'quirurgico' ? 'activo' : ''} onClick={() => setTipo('quirurgico')}><strong>Procedimiento quirúrgico</strong><small>Paciente, familiar, cirujano y cirugía programada</small></button><button type="button" className={tipo === 'anestesia' ? 'activo' : ''} onClick={() => setTipo('anestesia')}><strong>Anestesia</strong><small>Identificación y datos quirúrgicos de referencia</small></button></div>
      <div className="cq-consent-acciones"><p>{datosCompletos ? 'Datos listos. Revisa el documento antes de imprimirlo.' : 'Completa los apartados 1, 2 y 3 para generar los documentos.'}</p><button type="button" disabled={!datosCompletos} onClick={() => window.print()}><Icon name="print" size={16}/> Imprimir documento</button></div>
      {datosCompletos && paciente && <div className="cq-consent-vista"><DocumentoConsentimiento tipo={tipo} paciente={paciente} acompanante={acompanante} cirugia={cirugia}/></div>}
      <small className="cq-consent-advertencia">Formato de trabajo: no sustituye la explicación clínica ni la firma del consentimiento aprobado por la institución.</small>
    </div>
    {datosCompletos && paciente && createPortal(<div className="cq-print-root"><DocumentoConsentimiento tipo={tipo} paciente={paciente} acompanante={acompanante} cirugia={cirugia}/></div>, document.body)}
  </section>;
}
