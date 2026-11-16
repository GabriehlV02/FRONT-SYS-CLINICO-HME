import { useEffect, useRef } from "react";
import type { CitaConfirmada } from "./AgendaAmbulatoriaView";
import { mostrarConsultaEnContenedor, type ConsultaPrevia } from "./ventanaConsultaPrevia";

export function PanelConsultaPrevia({ consulta, paciente }: { consulta: ConsultaPrevia; paciente: CitaConfirmada }) {
  const contenedor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) return;
    const raiz = elemento.shadowRoot || elemento.attachShadow({ mode: "open" });
    mostrarConsultaEnContenedor(consulta, paciente, raiz);
  }, [consulta, paciente]);
  return <section className="consulta-historial-vista" aria-label="Vista previa de consulta anterior"><div ref={contenedor} /></section>;
}
