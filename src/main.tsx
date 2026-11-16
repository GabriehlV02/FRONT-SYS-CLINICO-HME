import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorAplicacion } from "./radius/componentes/ErrorAplicacion";
import "./radius/tema/TemaSistema.css";
import "./radius/tema/TemaOscuroIntegral.css";
import "./styles/ClinicoAzul.css";
import "./styles/ClinicoRefinamiento.css";
import "./styles/SidebarProductos.css";
import "./styles/SubvistasCompactas.css";
import "./styles/ClinicoResponsive.css";
import "./styles/TablasSimetricas.css";
import "./styles/ClinicoResponsivePlus.css";
import "./styles/AdaptacionPantallas.css";
import "./styles/CabeceraSidebar.css";

async function iniciar() {
  if (import.meta.env.DEV) {
    const { cargarPacientesPrueba } = await import("./radius/datos/pacientesPrueba");
    try {
      cargarPacientesPrueba(localStorage, sessionStorage);
    } catch (error) {
      console.error("No se pudieron preparar los pacientes de prueba sin alterar los datos existentes.", error);
    }
  }
  const { App } = await import("./App.tsx");
  createRoot(document.getElementById("root")!).render(
    <StrictMode><ErrorAplicacion><App /></ErrorAplicacion></StrictMode>,
  );
}
void iniciar();
