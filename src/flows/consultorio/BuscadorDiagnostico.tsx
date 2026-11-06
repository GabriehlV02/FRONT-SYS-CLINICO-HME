import { useEffect, useState } from 'react';
import { apiFetch } from '../../radius/api';

type Diagnostico = { codigo: string; nombre: string; idioma_nombre: string };

export function BuscadorDiagnostico({ valor, onSeleccionar }: { valor: string; onSeleccionar: (valor: string) => void }) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Diagnostico[]>([]);
  const [estado, setEstado] = useState<'inicial' | 'cargando' | 'listo' | 'error'>('inicial');
  const [editando, setEditando] = useState(!valor);

  useEffect(() => {
    const texto = busqueda.trim();
    if (!editando || texto.length < 2) { setResultados([]); setEstado('inicial'); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setEstado('cargando');
      try {
        const respuesta = await apiFetch(`/api/v1/diagnosticos?buscar=${encodeURIComponent(texto)}`, { signal: controller.signal });
        if (!respuesta.ok) throw new Error();
        const json = await respuesta.json();
        if (!controller.signal.aborted) { setResultados(json.data); setEstado('listo'); }
      } catch { if (!controller.signal.aborted) setEstado('error'); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [busqueda, editando]);

  return <div className="consulta-buscador-diagnostico">
    <span className="consulta-diagnostico-etiqueta">Diagnóstico</span>
    {valor && !editando ? <div className="consulta-diagnostico-elegido"><strong>{valor}</strong><button type="button" onClick={() => { setBusqueda(''); setEditando(true); }}>Cambiar</button></div> : <>
      <input aria-label="Buscar diagnóstico por nombre o código" value={busqueda} onChange={evento => setBusqueda(evento.target.value)} placeholder="Buscar diagnóstico por nombre o código" autoComplete="off" />
      {valor && <button type="button" className="consulta-diagnostico-cancelar" onClick={() => setEditando(false)}>Cancelar cambio</button>}
      {estado === 'cargando' && <small>Buscando diagnósticos…</small>}
      {estado === 'error' && <small role="alert">No se pudo consultar el catálogo. Intenta nuevamente.</small>}
      {estado === 'listo' && (resultados.length ? <ul className="consulta-diagnostico-resultados">{resultados.map(item => <li key={item.codigo}><button type="button" onClick={() => { onSeleccionar(`${item.codigo} · ${item.nombre}`); setEditando(false); setBusqueda(''); }}><b>{item.codigo}</b><span>{item.nombre}{item.idioma_nombre === 'en' ? ' (inglés)' : ''}</span></button></li>)}</ul> : <small>No se encontraron diagnósticos.</small>)}
    </>}
  </div>;
}
