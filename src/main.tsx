import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorAplicacion><App /></ErrorAplicacion>
  </StrictMode>,
);
