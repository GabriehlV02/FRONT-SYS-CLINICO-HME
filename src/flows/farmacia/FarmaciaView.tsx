import { CajaRecepcionView } from "../recepcion/subvistas/CajaRecepcionView";
import "../recepcion/RecepcionView.css";
import { useState } from "react";
import { SolicitudesEnfermeriaView } from "./SolicitudesEnfermeriaView";
import { HorizontalSubvistaNav } from "../../ui/components/HorizontalSubvistaNav";

export function FarmaciaView({ solicitudesIniciales = false }: { solicitudesIniciales?: boolean }) {
  const [vista, setVista] = useState(solicitudesIniciales ? "solicitudes" : "ventas");
  return <section>
    <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de Farmacia">
      <button type="button" className={vista === "ventas" ? "activo" : ""} onClick={() => setVista("ventas")}>Ventas de Farmacia</button>
      <button type="button" className={vista === "solicitudes" ? "activo" : ""} onClick={() => setVista("solicitudes")}>Solicitudes de enfermería</button>
    </HorizontalSubvistaNav>
    {vista === "ventas" ? <CajaRecepcionView farmacia /> : <SolicitudesEnfermeriaView />}
  </section>;
}
