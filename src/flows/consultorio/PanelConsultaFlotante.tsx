import { useEffect, useRef, useState } from "react";
import type { CitaConfirmada } from "./AgendaAmbulatoriaView";
import { mostrarConsultaEnContenedor, type ConsultaPrevia } from "./ventanaConsultaPrevia";

export function VentanaConsultaPrevia({ consulta, paciente, onCerrar }: { consulta: ConsultaPrevia; paciente: CitaConfirmada; onCerrar: () => void }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [minimizada, setMinimizada] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) return;
    const raiz = elemento.shadowRoot || elemento.attachShadow({ mode: "open" });
    mostrarConsultaEnContenedor(consulta, paciente, raiz);
  }, [consulta, paciente]);
  return <section className={`consulta-ventana-previa${minimizada ? " minimizada" : ""}${ampliada && !minimizada ? " ampliada" : ""}`} role="region" aria-label="Vista previa de consulta anterior">
    <header className="consulta-ventana-barra">
      <div><strong>Consulta anterior</strong><small>{consulta.fecha.split("-").reverse().join("/")} · {paciente.paciente}</small></div>
      <div className="consulta-ventana-controles">
        <button type="button" aria-label={minimizada ? "Restaurar ventana" : "Minimizar ventana"} title={minimizada ? "Restaurar" : "Minimizar"} onClick={() => setMinimizada((actual) => !actual)}>{minimizada ? "+" : "−"}</button>
        {!minimizada && <button type="button" aria-label={ampliada ? "Reducir ventana" : "Ampliar ventana"} title={ampliada ? "Reducir" : "Ampliar"} onClick={() => setAmpliada((actual) => !actual)}>{ampliada ? "❐" : "□"}</button>}
        <button type="button" aria-label="Cerrar vista previa" title="Cerrar" onClick={onCerrar}>×</button>
      </div>
    </header>
    <div className="consulta-ventana-cuerpo" hidden={minimizada}><div ref={contenedor} /></div>
  </section>;
}
