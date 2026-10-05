import { useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import { HojaLaboratorios } from './HojaLaboratorios';
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

type TipoOrden = 'laboratorio' | 'imagenologia' | 'internacion';
type SeccionConsulta = 'atencion' | 'resultados' | 'historia' | 'tratamientos';
const titulosOrden: Record<TipoOrden, string> = { laboratorio: 'laboratorio', imagenologia: 'imagenología', internacion: 'internación' };
const seccionesConsulta: { id: SeccionConsulta; nombre: string; icono: 'userCheck' | 'lab' | 'fileText' | 'patient' }[] = [
  { id: 'atencion', nombre: 'Atención', icono: 'userCheck' },
  { id: 'resultados', nombre: 'Resultados de estudios', icono: 'lab' },
  { id: 'historia', nombre: 'Historia clínica', icono: 'fileText' },
  { id: 'tratamientos', nombre: 'Tratamientos', icono: 'patient' },
];

function OrdenesConsulta({ paciente, onAbrir }: { paciente: CitaConfirmada | null; onAbrir?: (tipo: TipoOrden) => void }) {
  const [mensaje, setMensaje] = useState('');
  const abrir = (tipo: TipoOrden) => { if (!paciente) { setMensaje('Selecciona primero un paciente en atención.'); return; } setMensaje(''); onAbrir?.(tipo); };
  return <><nav className="consulta-ordenes"><button className="orden-laboratorio" type="button" onClick={() => abrir('laboratorio')}><Icon name="lab" size={17} /> Orden de laboratorio</button><button className="orden-imagenologia" type="button" onClick={() => abrir('imagenologia')}><Icon name="image" size={17} /> Orden de imagenología</button><button className="orden-internacion" type="button" onClick={() => abrir('internacion')}><Icon name="patient" size={17} /> Orden de internación</button></nav>{mensaje && <em className="consulta-aviso">{mensaje}</em>}</>;
}

export function ConsultaMedicaView({ paciente }: { paciente: CitaConfirmada | null }) {
  const [seccion, setSeccion] = useState<SeccionConsulta>('atencion');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [vitales, setVitales] = useState<Record<string, string>>({});
  const [notasMedicas, setNotasMedicas] = useState<Record<string, string>>({});
  const [tipoOrden, setTipoOrden] = useState<TipoOrden | null>(null);
  const [detalleOrden, setDetalleOrden] = useState('');
  const [laboratoriosElegidos, setLaboratoriosElegidos] = useState('');
  const vitalesTriaje = useMemo(() => paciente ? registrosTriaje[paciente.ci] : undefined, [paciente]);
  if (!paciente) return <section className="consulta-inicio consulta-inicio-sin-lista"><section className="consulta-area panel"><header><div><p>CONSULTA MÉDICA</p><h2>Sin paciente en atención</h2><small>La información se cargará al pulsar “Atender” desde la Agenda.</small></div><OrdenesConsulta paciente={null} /></header><div className="consulta-area-vacia"><Icon name="userCheck" size={30} /><strong>Aún no hay una consulta iniciada</strong><small>Selecciona “Atender” en la Agenda para cargar los datos del paciente.</small></div></section></section>;
  const datos = Object.keys(vitales).length ? vitales : (vitalesTriaje ?? {});
  return <section className="consulta-medica" aria-label={`Consulta de ${paciente.paciente}`}>
    <section className="consulta-activa-derecha">
      <header className="consulta-area-cabecera"><div><p>CONSULTA MÉDICA</p><h2>{paciente.paciente}</h2><small>CI {paciente.ci} · Cita {paciente.hora}</small></div><OrdenesConsulta paciente={paciente} onAbrir={(tipo) => { setTipoOrden(tipo); setDetalleOrden(''); }} /></header>
      <nav className="consulta-secciones" aria-label="Secciones de la consulta">
        {seccionesConsulta.map(item => <button key={item.id} type="button" className={seccion === item.id ? 'activo' : ''} aria-current={seccion === item.id ? 'page' : undefined} onClick={() => setSeccion(item.id)}><Icon name={item.icono} size={16} /><span>{item.nombre}</span></button>)}
      </nav>
      {seccion === 'atencion' && <>
      {tipoOrden === 'laboratorio' && <HojaLaboratorios paciente={paciente.paciente} onCerrar={() => setTipoOrden(null)} onAceptar={items => { setLaboratoriosElegidos(items.map(i => i.nombre).join(' · ')); setTipoOrden(null); }} />}{laboratoriosElegidos && <p className="consulta-aviso">Laboratorios seleccionados: {laboratoriosElegidos}</p>}{tipoOrden && tipoOrden !== 'laboratorio' && <section className="consulta-orden-panel panel" aria-label={`Orden de ${titulosOrden[tipoOrden]}`}><header><div><p>ORDEN DE {titulosOrden[tipoOrden].toUpperCase()}</p><h3>{paciente.paciente}</h3><small>CI {paciente.ci} · Cita {paciente.hora}</small></div><button type="button" onClick={() => setTipoOrden(null)} aria-label="Cerrar orden">×</button></header><label>{tipoOrden === 'imagenologia' ? 'Estudios y regiones solicitados' : 'Motivo e indicaciones de internación'}<textarea value={detalleOrden} onChange={(event) => setDetalleOrden(event.target.value)} placeholder="Escribe las indicaciones para esta paciente" /></label><footer><button type="button" onClick={() => setTipoOrden(null)}>Cancelar</button><button type="button" disabled={!detalleOrden.trim()} onClick={() => window.print()}>Imprimir orden</button></footer></section>}
      <div className="consulta-atencion-superior">
        <section className="consulta-signos panel"><header><div><p>SIGNOS VITALES</p><h3>{vitalesTriaje ? 'Registrados en triaje' : 'Sin registro de triaje'}</h3><small>{vitalesTriaje ? 'Información completada por enfermería antes de la consulta.' : 'El médico puede registrarlos opcionalmente.'}</small></div><button className="secundario" type="button" onClick={() => { if (!mostrarFormulario) setVitales((actual) => ({ ...(vitalesTriaje ?? {}), ...actual })); setMostrarFormulario((actual) => !actual); }}><Icon name="edit" size={15} /> {mostrarFormulario ? 'Cancelar edición' : 'Editar opcionalmente'}</button></header>{vitalesTriaje || Object.keys(vitales).length ? <div className="consulta-signos-grid">{campos.map(([id, etiqueta]) => <article key={id}><small>{etiqueta}</small><strong>{datos[id] || 'No registrado'}</strong></article>)}</div> : null}{mostrarFormulario && <div className="consulta-signos-form">{campos.map(([id, etiqueta]) => <label key={id}>{etiqueta}<input value={vitales[id] || ''} onChange={(event) => setVitales((actual) => ({ ...actual, [id]: event.target.value }))} placeholder="Opcional" /></label>)}</div>}</section>
        <section className="consulta-nota panel">
          <header><p>NOTAS MÉDICAS</p><h3>Notas Médicas</h3><small>Escribe libremente las observaciones de la consulta.</small></header>
          <textarea aria-label="Notas Médicas" value={notasMedicas[paciente.ci] ?? ''} onChange={(event) => setNotasMedicas((actual) => ({ ...actual, [paciente.ci]: event.target.value }))} placeholder="Escribe aquí las notas médicas..." />
        </section>
      </div>
      </>}
      {seccion === 'resultados' && <section className="consulta-seccion-contenido panel"><header><span><Icon name="lab" size={20} /></span><div><p>RESULTADOS DE ESTUDIOS</p><h3>Laboratorio e imagenología</h3><small>Resultados vinculados a la historia clínica de {paciente.paciente}.</small></div></header><div className="consulta-estado-vacio"><Icon name="fileText" size={30} /><strong>No hay resultados disponibles</strong><small>Los informes validados de laboratorio e imagenología aparecerán en esta sección.</small></div></section>}
      {seccion === 'historia' && <section className="consulta-seccion-contenido panel"><header><span><Icon name="fileText" size={20} /></span><div><p>HISTORIA CLÍNICA</p><h3>Antecedentes y consultas previas</h3><small>Resumen cronológico de atenciones del paciente.</small></div></header><div className="consulta-resumen-clinico"><article><small>Antecedentes patológicos</small><strong>Sin antecedentes registrados</strong></article><article><small>Alergias</small><strong>Sin alergias registradas</strong></article><article><small>Cirugías previas</small><strong>Sin cirugías registradas</strong></article></div><div className="consulta-estado-vacio compacto"><Icon name="calendar" size={27} /><strong>Sin consultas anteriores</strong><small>Las atenciones finalizadas se mostrarán aquí en orden cronológico.</small></div></section>}
      {seccion === 'tratamientos' && <section className="consulta-seccion-contenido panel"><header><span><Icon name="patient" size={20} /></span><div><p>TRATAMIENTOS</p><h3>Indicaciones y seguimiento</h3><small>Medicación, procedimientos y planes activos del paciente.</small></div></header><div className="consulta-estado-vacio"><Icon name="fileText" size={30} /><strong>No hay tratamientos registrados</strong><small>Los tratamientos indicados durante la consulta quedarán organizados en esta sección.</small><button type="button"><Icon name="plus" size={15} /> Registrar tratamiento</button></div></section>}
    </section>
  </section>;
}
