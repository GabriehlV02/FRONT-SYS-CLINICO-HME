import { useEffect, useState } from "react";
import { RevisionConsulta } from "../consultorio/RevisionConsulta";
import { apiEmergencias } from "./emergenciasApi";

export function RevisionEmergencia({ cuentaId, cerrada }: { cuentaId: string; cerrada: boolean }) {
  const [inicial, setInicial] = useState<Record<string, string> | null>(null);
  const [registros, setRegistros] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    let activo = true;
    apiEmergencias<{ revision: Record<string, string> | null }>(`/${cuentaId}/documentacion`)
      .then((resultado) => { if (activo) {
        const hayBorrador = !cerrada && Boolean(sessionStorage.getItem(`revision-sistemas-demo-${cuentaId}`));
        setInicial(hayBorrador ? {} : resultado.revision || {});
        if (hayBorrador) setMensaje("Hay un borrador en esta pestaña. Guarda para registrarlo en la atención.");
      } })
      .catch(() => { if (activo) setMensaje("No se pudo cargar la revisión. Actualiza la página para reintentar."); });
    return () => { activo = false; };
  }, [cuentaId, cerrada]);
  async function guardar() {
    setGuardando(true);
    try {
      await apiEmergencias(`/${cuentaId}/documentacion`, { seccion: "revision", datos: registros });
      sessionStorage.removeItem(`revision-sistemas-demo-${cuentaId}`);
      setMensaje("Revisión guardada en la atención.");
    } catch (error) { setMensaje(error instanceof Error ? error.message : "No se pudo guardar la revisión."); }
    finally { setGuardando(false); }
  }
  return <>
    {inicial && <RevisionConsulta pacienteId={cuentaId} cerrada={cerrada || guardando} storageKey={`revision-sistemas-demo-${cuentaId}`} registros={inicial} onChange={setRegistros} />}
    {!cerrada && inicial && <button type="button" className="em-primario" disabled={guardando} onClick={() => void guardar()}>{guardando ? "Guardando…" : "Guardar revisión por sistemas"}</button>}
    {mensaje && <p role="status">{mensaje}</p>}
  </>;
}
