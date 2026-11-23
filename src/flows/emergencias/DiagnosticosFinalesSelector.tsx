import { useEffect, useState } from "react";
import { BuscadorDiagnostico } from "../consultorio/BuscadorDiagnostico";
import { apiEmergencias } from "./emergenciasApi";
import "./DiagnosticosFinalesSelector.css";

type Diagnostico = { codigo: string; nombre: string };

export function DiagnosticosFinalesSelector({ cuentaId, cerrada, inicial }: {
  cuentaId: string; cerrada: boolean; inicial?: string;
}) {
  const ruta = `/${cuentaId}/diagnosticos`;
  const [items, setItems] = useState<Diagnostico[]>([]);
  const [listo, setListo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [buscador, setBuscador] = useState(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let activo = true;
    apiEmergencias<Diagnostico[]>(ruta).then(datos => {
      if (activo) { setItems(datos); setListo(true); setError(""); }
    }).catch(() => { if (activo) setError("No se pudieron cargar los diagnósticos."); });
    return () => { activo = false; };
  }, [ruta, revision]);

  async function cambiar(codigo: string, seleccionado: boolean) {
    setGuardando(true);
    try {
      setItems(await apiEmergencias<Diagnostico[]>(ruta, { codigo, seleccionado }));
      setError("");
    } catch {
      setError("No se pudo confirmar el cambio. Vuelve a intentarlo.");
    } finally {
      setGuardando(false);
      setBuscador(r => r + 1);
    }
  }

  return <section className="em-diagnosticos-selector">
    {listo && !cerrada && <fieldset disabled={guardando}>
      <BuscadorDiagnostico key={buscador} valor="" onSeleccionar={valor => void cambiar(valor.split(" · ")[0], true)} />
    </fieldset>}
    <aside className="em-diagnosticos-lista">
      <header><span>Diagnósticos seleccionados</span><b>{items.length}</b></header>
      {inicial && <p>Diagnóstico de evaluación previa · {inicial}</p>}
      {items.map(item => <article key={item.codigo}><span><b>{item.codigo}</b> {item.nombre}</span>
        {!cerrada && <button type="button" disabled={guardando} aria-label={`Quitar ${item.nombre}`} onClick={() => void cambiar(item.codigo, false)}>×</button>}
      </article>)}
      {listo && !items.length && <p>Sin diagnósticos seleccionados.</p>}
      {error && <p role="alert">{error} {!listo && <button type="button" onClick={() => setRevision(r => r + 1)}>Reintentar</button>}</p>}
    </aside>
  </section>;
}
