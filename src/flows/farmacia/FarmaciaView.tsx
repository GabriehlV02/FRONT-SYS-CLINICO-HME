import { CajaRecepcionView } from "../recepcion/subvistas/CajaRecepcionView";
import "../recepcion/RecepcionView.css";
import { useState } from "react";
import { ReportesFarmaciaView } from "./ReportesFarmaciaView";
import { SolicitudesEnfermeriaView } from "./SolicitudesEnfermeriaView";
import { HorizontalSubvistaNav } from "../../ui/components/HorizontalSubvistaNav";

export function FarmaciaView({ solicitudesIniciales = false }: { solicitudesIniciales?: boolean }) {
  const [vista, setVista] = useState(solicitudesIniciales ? "solicitudes" : "ventas");
  return <section>
    <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel={solicitudesIniciales ? "Subvistas de Dispensar" : "Subvistas de Farmacia"}>
      {solicitudesIniciales ? <>
        <button type="button" className={vista === "solicitudes" ? "activo" : ""} onClick={() => setVista("solicitudes")}>Solicitudes de descargo</button>
        <button type="button" className={vista === "historial" ? "activo" : ""} onClick={() => setVista("historial")}>Historial de descargos</button>
      </> : <>
        <button type="button" className={vista === "ventas" ? "activo" : ""} onClick={() => setVista("ventas")}>Ventas de Farmacia</button>
        <button type="button" className={vista === "historialVentas" ? "activo" : ""} onClick={() => setVista("historialVentas")}>Historial de ventas</button>
      </>}
    </HorizontalSubvistaNav>
    {solicitudesIniciales
      ? <SolicitudesEnfermeriaView descargos historial={vista === "historial"} />
      : vista === "ventas" ? <CajaRecepcionView farmacia /> : <ReportesFarmaciaView soloVentas />}
  </section>;
}
