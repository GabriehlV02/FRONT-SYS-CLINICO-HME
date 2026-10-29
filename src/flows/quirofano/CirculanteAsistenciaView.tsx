import { useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import { RegistroIntraoperatorio } from './RegistroIntraoperatorio';
import './CirculanteAsistenciaView.css';

type Cirugia = { id: string; hora: string; sala: string; paciente: string; procedimiento: string; cirujano: string };

const verificaciones = [
  ['identidad', 'Identidad del paciente', 'Paciente y procedimiento verificados.'],
  ['sala', 'Sala y equipamiento', 'Sala preparada y equipo coordinado.'],
  ['equipo', 'Equipo quirúrgico', 'Personal presente y registro de ingreso.'],
] as const;

export function CirculanteAsistenciaView({ cirugia, onVolver }: { cirugia: Cirugia; onVolver: () => void }) {
  const [completadas, setCompletadas] = useState<string[]>([]);
  const [registroActivo, setRegistroActivo] = useState(false);
  const alternar = (id: string) => setCompletadas(actual => actual.includes(id) ? actual.filter(item => item !== id) : [...actual, id]);

  return <section className="circulante-asistencia">
    <header className="circulante-contexto"><button type="button" onClick={onVolver}><Icon name="chevronLeft" size={16} /> Cirugías programadas</button><div><span>{cirugia.sala} · {cirugia.hora}</span><h3>{cirugia.procedimiento}</h3><small>{cirugia.paciente} · {cirugia.cirujano}</small></div><b>{completadas.length}/{verificaciones.length} verificaciones</b></header>
    <div className="circulante-resumen"><span><Icon name="userCheck" size={21} /></span><div><p>ASISTENCIA CIRCULANTE</p><h4>Preparación y acompañamiento del paciente</h4><small>Completa las verificaciones previas antes de iniciar el procedimiento.</small></div></div>
    <div className="circulante-verificaciones">{verificaciones.map(([id, titulo, detalle]) => <button type="button" key={id} className={completadas.includes(id) ? 'completada' : ''} onClick={() => alternar(id)}><span>{completadas.includes(id) ? <Icon name="check" size={17} /> : <Icon name="patient" size={17} />}</span><div><strong>{titulo}</strong><small>{detalle}</small></div><b>{completadas.includes(id) ? 'Verificado' : 'Pendiente'}</b></button>)}</div>
    <div className="circulante-registro-accion"><div><strong>Registro intraoperatorio</strong><small>Activa el control de insumos, tiempos y novedades una vez verificadas las condiciones de sala.</small></div><button type="button" disabled={completadas.length !== verificaciones.length} onClick={() => setRegistroActivo(true)}>{registroActivo ? 'Registro en curso' : 'Iniciar registro'}</button></div>
    {registroActivo && <RegistroIntraoperatorio cirugiaId={cirugia.id} rol="circulante" />}
  </section>;
}
