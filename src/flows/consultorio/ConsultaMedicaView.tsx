import { useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import type { CitaConfirmada } from './AgendaAmbulatoriaView';
import './ConsultaMedicaView.css';

const registrosTriaje: Record<string, Record<string, string>> = {
  '4839201': { temperatura: '36.7 °C', presionSistolica: '118 mmHg', presionDiastolica: '76 mmHg', frecuencia: '74 lpm', respiratoria: '18 rpm', saturacion: '98 %', peso: '64 kg', estatura: '162 cm', imc: '24.4' },
  '7281044': { temperatura: '36.8 °C', presionSistolica: '122 mmHg', presionDiastolica: '80 mmHg', frecuencia: '78 lpm', respiratoria: '18 rpm', saturacion: '97 %', peso: '76 kg' },
  '6102837': { temperatura: '36.5 °C', presionSistolica: '110 mmHg', presionDiastolica: '70 mmHg', frecuencia: '68 lpm', respiratoria: '16 rpm', saturacion: '99 %', peso: '58 kg', estatura: '157 cm', imc: '23.5' },
  '7013659': { temperatura: '36.7 °C', presionSistolica: '118 mmHg', presionDiastolica: '76 mmHg', frecuencia: '74 lpm', respiratoria: '18 rpm', saturacion: '98 %', peso: '64 kg', estatura: '162 cm', imc: '24.4' },
};
const campos = [
  ['temperatura', 'Temperatura'], ['glicemia', 'Glicemia capilar'], ['frecuencia', 'Frec. cardíaca'], ['respiratoria', 'Frec. respiratoria'],
  ['presionSistolica', 'Presión sistólica'], ['presionDiastolica', 'Presión diastólica'], ['saturacion', 'Saturación ambiente'],
  ['oxigeno', 'Oxígeno'], ['saturacionOxigeno', 'Saturación con oxígeno'], ['peso', 'Peso'],
  ['estatura', 'Estatura'], ['imc', 'IMC'], ['perimetroCintura', 'Perímetro cintura'], ['perimetroCadera', 'Perímetro cadera'],
] as const;

function OrdenesConsulta() {
  const [mensaje, setMensaje] = useState('');
  const avisar = () => setMensaje('Selecciona primero un paciente en atención.');
  return <><nav className="consulta-ordenes"><button className="orden-laboratorio" type="button" onClick={avisar}><Icon name="lab" size={17} /> Orden de laboratorio</button><button className="orden-imagenologia" type="button" onClick={avisar}><Icon name="image" size={17} /> Orden de imagenología</button><button className="orden-internacion" type="button" onClick={avisar}><Icon name="patient" size={17} /> Orden de internación</button></nav>{mensaje && <em className="consulta-aviso">{mensaje}</em>}</>;
}

function HistoriaClinicaButton() {
  return <button className="orden-historia consulta-historia-lateral" type="button"><Icon name="fileText" size={17} /> Historia clínica</button>;
}

function ResumenHistoriaPaciente({ paciente }: { paciente: CitaConfirmada }) {
  const [carpetaAbierta, setCarpetaAbierta] = useState<string | null>(null);
  const carpetas = [
    { id: 'laboratorio', icono: 'lab' as const, titulo: 'Resultados de laboratorio', nombre: 'Hemograma completo', tipo: 'Laboratorio', fecha: '28 sep. 2026', relevante: 'Resultado validado', detalle: 'Resultado disponible para revisión clínica.' },
    { id: 'imagenologia', icono: 'image' as const, titulo: 'Resultados de imagenología', nombre: 'Radiografía panorámica', tipo: 'Imagenología', fecha: '27 sep. 2026', relevante: 'Informe emitido', detalle: 'Estudio e informe disponibles en el historial.' },
    { id: 'ultima-visita', icono: 'fileText' as const, titulo: 'Última visita médica', nombre: 'Consulta ambulatoria', tipo: 'Atención médica', fecha: '15 sep. 2026', relevante: 'Motivo: control clínico', detalle: 'Información principal y motivo de la última atención registrada.' },
  ];
  return <section className="consulta-historial-lateral"><header><p>HISTORIA CLÍNICA</p><strong>Carpetas inspeccionables</strong></header>{carpetas.map((carpeta) => <article className="historial-carpeta" key={carpeta.id}><span><Icon name={carpeta.icono} size={17} /></span><div><strong>{carpeta.titulo}</strong><b>{carpeta.nombre}</b><small>{carpeta.tipo} · {carpeta.fecha}</small><em>{carpeta.relevante}</em></div><button type="button" onClick={() => setCarpetaAbierta((actual) => actual === carpeta.id ? null : carpeta.id)}>{carpetaAbierta === carpeta.id ? 'Cerrar' : 'Ver'}</button>{carpetaAbierta === carpeta.id && <p>{carpeta.detalle}</p>}</article>)}<footer>Historial de {paciente.paciente}.</footer></section>;
}

export function ConsultaMedicaView({ paciente, onCerrarAtencion }: { paciente: CitaConfirmada | null; onCerrarAtencion?: () => void }) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [vitales, setVitales] = useState<Record<string, string>>({});
  const vitalesTriaje = useMemo(() => paciente ? registrosTriaje[paciente.ci] : undefined, [paciente]);
  if (!paciente) return <section className="consulta-inicio"><aside className="consulta-pacientes panel"><label className="consulta-buscar"><Icon name="search" size={17} /><input placeholder="Buscar paciente o CI" /></label><HistoriaClinicaButton /><header><p>PACIENTES EN ESPERA</p><strong>0 pendientes</strong></header></aside><section className="consulta-area panel"><header><div><p>CONSULTA MÉDICA</p><h2>Sin paciente en atención</h2><small>La información se cargará al pulsar “Atender” desde la Agenda.</small></div><OrdenesConsulta /></header><div className="consulta-area-vacia"><Icon name="userCheck" size={30} /><strong>Aún no hay una consulta iniciada</strong><small>Selecciona “Atender” en la Agenda para cargar los datos del paciente.</small></div></section></section>;
  const datos = Object.keys(vitales).length ? vitales : (vitalesTriaje ?? {});
  return <section className="consulta-medica" aria-label={`Consulta de ${paciente.paciente}`}>
    <button className="consulta-cerrar-atencion consulta-cerrar-encima-historia" type="button" onClick={onCerrarAtencion}><Icon name="close" size={16} /> Cerrar atención</button>
    <aside className="consulta-paciente-activo panel"><label className="consulta-buscar"><Icon name="search" size={17} /><input placeholder="Buscar paciente o CI" /></label><HistoriaClinicaButton /><ResumenHistoriaPaciente paciente={paciente} /></aside>
    <section className="consulta-activa-derecha">
      <header className="consulta-area-cabecera"><div><p>CONSULTA MÉDICA</p><h2>{paciente.paciente}</h2><small>CI {paciente.ci} · Cita {paciente.hora}</small></div><OrdenesConsulta /></header>
      <section className="consulta-signos panel"><header><div><p>SIGNOS VITALES</p><h3>{vitalesTriaje ? 'Registrados en triaje' : 'Sin registro de triaje'}</h3><small>{vitalesTriaje ? 'Información completada por enfermería antes de la consulta.' : 'El médico puede registrarlos opcionalmente.'}</small></div><button className="secundario" type="button" onClick={() => { if (!mostrarFormulario) setVitales((actual) => ({ ...(vitalesTriaje ?? {}), ...actual })); setMostrarFormulario((actual) => !actual); }}><Icon name="edit" size={15} /> {mostrarFormulario ? 'Cancelar edición' : 'Editar opcionalmente'}</button></header>{vitalesTriaje || Object.keys(vitales).length ? <div className="consulta-signos-grid">{campos.map(([id, etiqueta]) => <article key={id}><small>{etiqueta}</small><strong>{datos[id] || 'No registrado'}</strong></article>)}</div> : null}{mostrarFormulario && <div className="consulta-signos-form">{campos.map(([id, etiqueta]) => <label key={id}>{etiqueta}<input value={vitales[id] || ''} onChange={(event) => setVitales((actual) => ({ ...actual, [id]: event.target.value }))} placeholder="Opcional" /></label>)}</div>}</section>
    </section>
  </section>;
}
