import { useEffect, useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import './RegistroIntraoperatorio.css';

type RolRegistro = 'instrumentista' | 'circulante';
type Consumo = { id: string; nombre: string; unidad: string; usado: boolean; cantidad: number };
type Datos = { anestesia: string; ingreso: string; inicio: string; fin: string; sv: string; rn: string; fls: string; rl: string; alum: string; pp: string; apego: string; primeraL: string; segundaL: string; conclusion: string };

const consumosIniciales: Consumo[] = [
  { id: 'compresas', nombre: 'Compresas', unidad: 'unid.', usado: false, cantidad: 0 },
  { id: 'gasas', nombre: 'Gasas estériles', unidad: 'unid.', usado: false, cantidad: 0 },
  { id: 'apositos', nombre: 'Apósitos', unidad: 'unid.', usado: false, cantidad: 0 },
  { id: 'guantes', nombre: 'Guantes quirúrgicos', unidad: 'pares', usado: false, cantidad: 0 },
  { id: 'jeringas', nombre: 'Jeringas', unidad: 'unid.', usado: false, cantidad: 0 },
  { id: 'suturas', nombre: 'Suturas', unidad: 'unid.', usado: false, cantidad: 0 },
];

const datosIniciales: Datos = { anestesia: '', ingreso: '', inicio: '', fin: '', sv: '', rn: '', fls: '', rl: '', alum: '', pp: '', apego: '', primeraL: '', segundaL: '', conclusion: '' };
const clave = (cirugiaId: string) => `hme:quirofano:registro-intraoperatorio:${cirugiaId}`;

export function RegistroIntraoperatorio({ cirugiaId, rol }: { cirugiaId: string; rol: RolRegistro }) {
  const [consumos, setConsumos] = useState<Consumo[]>(consumosIniciales);
  const [datos, setDatos] = useState<Datos>(datosIniciales);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    const recuperar = () => {
      try {
        const registro = JSON.parse(localStorage.getItem(clave(cirugiaId)) || 'null');
        setConsumos(registro?.consumos || consumosIniciales);
        setDatos(registro?.datos || datosIniciales);
      } catch { setConsumos(consumosIniciales); setDatos(datosIniciales); }
    };
    recuperar();
    window.addEventListener('storage', recuperar);
    window.addEventListener('hme:quirofano:registro-actualizado', recuperar);
    return () => { window.removeEventListener('storage', recuperar); window.removeEventListener('hme:quirofano:registro-actualizado', recuperar); };
  }, [cirugiaId]);

  const usados = useMemo(() => consumos.filter(item => item.usado), [consumos]);
  const editarConsumo = (id: string, cambio: Partial<Consumo>) => setConsumos(actual => actual.map(item => item.id === id ? { ...item, ...cambio } : item));
  const editarDato = (campo: keyof Datos, valor: string) => setDatos(actual => ({ ...actual, [campo]: valor }));
  const guardar = () => {
    localStorage.setItem(clave(cirugiaId), JSON.stringify({ consumos, datos, actualizadoEn: new Date().toISOString() }));
    window.dispatchEvent(new Event('hme:quirofano:registro-actualizado'));
    setGuardado(true);
    window.setTimeout(() => setGuardado(false), 2500);
  };
  const agregarInsumo = () => setConsumos(actual => [...actual, { id: crypto.randomUUID(), nombre: 'Insumo adicional', unidad: 'unid.', usado: true, cantidad: 1 }]);
  const esInstrumentista = rol === 'instrumentista';

  return <section className="registro-intraoperatorio" aria-labelledby={`registro-intra-${rol}`}>
    <header>
      <div><p>REGISTRO INTRAOPERATORIO · {esInstrumentista ? 'INSTRUMENTISTA' : 'CIRCULANTE'}</p><h4 id={`registro-intra-${rol}`}>{esInstrumentista ? 'Conteo y uso de material' : 'Control de sala y consumos'}</h4><small>Marca solamente lo utilizado y registra la cantidad real durante la cirugía.</small></div>
      <button type="button" className="registro-intra-guardar" onClick={guardar}><Icon name="check" size={16}/>{guardado ? 'Guardado' : 'Guardar registro'}</button>
    </header>

    <div className="registro-intra-datos">
      <label>Anestesia<input value={datos.anestesia} onChange={event => editarDato('anestesia', event.target.value)} placeholder="Tipo o técnica" /></label>
      <label>Ingreso a sala<input type="time" value={datos.ingreso} onChange={event => editarDato('ingreso', event.target.value)} /></label>
      <label>Inicio de cirugía<input type="time" value={datos.inicio} onChange={event => editarDato('inicio', event.target.value)} /></label>
      <label>Fin de anestesia<input type="time" value={datos.fin} onChange={event => editarDato('fin', event.target.value)} /></label>
      <label className="registro-intra-amplio">Signos vitales / observación inicial<input value={datos.sv} onChange={event => editarDato('sv', event.target.value)} placeholder="Ej. PA, FC, SpO₂ o hallazgo relevante" /></label>
    </div>

    <div className="registro-intra-cuerpo">
      <section className="registro-intra-insumos">
        <div className="registro-intra-subtitulo"><div><strong>Insumos y conteo</strong><small>{usados.length} insumo{usados.length === 1 ? '' : 's'} registrado{usados.length === 1 ? '' : 's'}</small></div><button type="button" onClick={agregarInsumo}><Icon name="plus" size={14}/> Añadir</button></div>
        <div className="registro-intra-tabla" role="table" aria-label="Insumos utilizados">
          <div className="registro-intra-fila registro-intra-cabecera" role="row"><span>Usado</span><span>Insumo</span><span>Cantidad</span></div>
          {consumos.map(item => <div className="registro-intra-fila" role="row" key={item.id}>
            <label className="registro-intra-check"><input type="checkbox" checked={item.usado} onChange={event => editarConsumo(item.id, { usado: event.target.checked, cantidad: event.target.checked && !item.cantidad ? 1 : item.cantidad })}/><span><Icon name="check" size={13}/></span></label>
            <label><input className="registro-intra-nombre" value={item.nombre} onChange={event => editarConsumo(item.id, { nombre: event.target.value })}/><small>{item.unidad}</small></label>
            <label className="registro-intra-cantidad"><button type="button" disabled={!item.usado || item.cantidad === 0} onClick={() => editarConsumo(item.id, { cantidad: Math.max(0, item.cantidad - 1) })}>−</button><input type="number" min="0" disabled={!item.usado} value={item.cantidad} onChange={event => editarConsumo(item.id, { cantidad: Math.max(0, Number(event.target.value)) })}/><button type="button" disabled={!item.usado} onClick={() => editarConsumo(item.id, { cantidad: item.cantidad + 1 })}>+</button></label>
          </div>)}
        </div>
      </section>
      <section className="registro-intra-clinico">
        <strong>{esInstrumentista ? 'Control de instrumental' : 'Registro de apoyo circulante'}</strong>
        <div className="registro-intra-campos-cortos">
          <label>RN<input value={datos.rn} onChange={event => editarDato('rn', event.target.value)} placeholder="Cantidad / dato" /></label>
          <label>FLS<input value={datos.fls} onChange={event => editarDato('fls', event.target.value)} placeholder="ml" /></label>
          <label>RL<input value={datos.rl} onChange={event => editarDato('rl', event.target.value)} placeholder="ml" /></label>
          <label>ALUM.<input value={datos.alum} onChange={event => editarDato('alum', event.target.value)} placeholder="ml" /></label>
          <label>PP<input value={datos.pp} onChange={event => editarDato('pp', event.target.value)} placeholder="ml" /></label>
          <label>Apego<input value={datos.apego} onChange={event => editarDato('apego', event.target.value)} placeholder="Dato" /></label>
          <label>1.º L.<input value={datos.primeraL} onChange={event => editarDato('primeraL', event.target.value)} placeholder="Hora / dato" /></label>
          <label>2.º L.<input value={datos.segundaL} onChange={event => editarDato('segundaL', event.target.value)} placeholder="Hora / dato" /></label>
        </div>
        <label className="registro-intra-conclusion">Conclusión / novedades<textarea value={datos.conclusion} onChange={event => editarDato('conclusion', event.target.value)} placeholder="Incidencias, conteo final, solicitud adicional o cualquier novedad de la cirugía." /></label>
      </section>
    </div>
  </section>;
}
