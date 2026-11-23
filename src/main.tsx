import "./styles.css";
import { StrictMode, lazy, Suspense } from "react";
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
import "./styles/EncabezadosTablasClinico.css";

const App = lazy(() => import("./App.tsx").then(m => ({ default: m.App })));
createRoot(document.getElementById("root")!).render(
  <StrictMode><ErrorAplicacion><Suspense fallback={<div className="error-clinico" role="status">Cargando sistema...</div>}><App /></Suspense></ErrorAplicacion></StrictMode>,
);
