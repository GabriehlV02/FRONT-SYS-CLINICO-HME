import { useEffect, useMemo, useState } from 'react';
import { apiEmergencias, type ItemEmergencia } from '../emergencias/emergenciasApi';
import './HojaLaboratorios.css';

export function HojaLaboratorios({ paciente, onCerrar, onAceptar }: { paciente: string; onCerrar: () => void; onAceptar: (items: ItemEmergencia[]) => void | Promise<void> }) {
  const [catalogo, setCatalogo] = useState<ItemEmergencia[]>([]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    let activo = true;
    apiEmergencias<ItemEmergencia[]>('/catalogo').then(items => { if (activo) setCatalogo(items.filter(i => i.tipo === 'servicio' && /laboratorio/i.test(i.categoria || ''))); })
      .catch(e => { if (activo) setError((e as Error).message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);
  const elegidos = useMemo(() => catalogo.filter(i => seleccion.includes(i.id)), [catalogo, seleccion]);
  const grupos = useMemo(() => catalogo.reduce<Record<string, ItemEmergencia[]>>((acc, item) => { (acc[item.grupo || 'Otros laboratorios'] ||= []).push(item); return acc; }, {}), [catalogo]);
  const total = elegidos.reduce((s, i) => s + i.precio, 0);
  return <div className="hoja-lab-fondo" role="presentation" onMouseDown={onCerrar}>
    <section className="hoja-lab" role="dialog" aria-modal="true" aria-label={`Orden de laboratorio de ${paciente}`} onMouseDown={e => e.stopPropagation()}>
      <header><div><strong>Orden de laboratorio</strong><small>{paciente} · Estudios registrados en Contabilidad</small></div><button type="button" aria-label="Cerrar orden" onClick={onCerrar}>×</button></header>
      <div className="hoja-lab-contenido">
        {cargando && <p>Cargando laboratorios…</p>}{error && <p role="alert">{error}</p>}
        {!cargando && !error && !catalogo.length && <p>No hay servicios de laboratorio activos en el catálogo contable.</p>}
        <div className="hoja-lab-grupos">{Object.entries(grupos).map(([grupo, items]) => <section key={grupo}><h3>{grupo}</h3>{items?.map(item => <label key={item.id}><input type="checkbox" checked={seleccion.includes(item.id)} onChange={() => setSeleccion(actual => actual.includes(item.id) ? actual.filter(id => id !== item.id) : [...actual, item.id])} /><span className="hoja-lab-precio">{item.precio.toFixed(2)}</span><span>{item.nombre}</span></label>)}</section>)}</div>
      </div>
      <aside className="hoja-lab-acciones"><button type="button" onClick={() => setSeleccion([])}>Deseleccionar</button><button type="button" onClick={() => window.print()} disabled={!elegidos.length}>Imprimir</button><button type="button" onClick={onCerrar}>Cancelar</button><button type="button" className="hoja-lab-aceptar" disabled={!elegidos.length || guardando} onClick={async () => { setGuardando(true); try { await onAceptar(elegidos); } catch (e) { setError((e as Error).message); } finally { setGuardando(false); } }}>Aceptar</button><div className="hoja-lab-total"><small>Monto total</small><strong>Bs. {total.toFixed(2)}</strong></div></aside>
    </section>
  </div>;
}
