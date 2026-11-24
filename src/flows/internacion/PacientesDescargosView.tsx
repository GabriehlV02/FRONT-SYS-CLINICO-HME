import { useEffect, useState } from "react";
import { apiEmergencias, nombrePaciente, type CuentaEmergencia } from "../emergencias/emergenciasApi";
import { esPacienteUci } from "./registroInternaciones";
import { useInternacionesVinculadas } from "./useInternacionesVinculadas";

export function PacientesDescargosView({ abrir }: { abrir: (ci: string) => void }) {
  const internaciones = useInternacionesVinculadas();
  const [cuentas, setCuentas] = useState<CuentaEmergencia[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [area, setArea] = useState("Todas");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError("");
    apiEmergencias<{ cuentas: CuentaEmergencia[] }>().then((datos) => {
      if (activo) setCuentas(datos.cuentas);
    }).catch(() => { if (activo) setError("No se pudieron cargar los pacientes de Emergencias. Intenta actualizar."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [revision]);
  const ingresados = internaciones.filter((item) => item.estado === "confirmada");
  const pacientes = [
    ...ingresados.map((item) => ({ id: item.id, nombre: item.paciente, ci: item.ci, area: esPacienteUci(item) ? "Terapia intensiva" : "Internación", ubicacion: [item.sala, item.cama].filter(Boolean).join(" / ") || "Sin asignar", fecha: item.fechaIngreso || item.fecha })),
    ...cuentas.filter((item) => !item.fin && !ingresados.some((ingreso) => (ingreso.pacienteId && ingreso.pacienteId === item.pacienteId) || (ingreso.ci && ingreso.ci === item.identidad?.documento)))
      .map((item) => ({ id: item.id, nombre: nombrePaciente(item), ci: item.identidad?.documento || "", area: "Emergencias", ubicacion: item.cubiculo || "Sin asignar", fecha: item.inicio })),
  ];
  const visibles = pacientes.filter((item) => (area === "Todas" || item.area === area) && `${item.nombre} ${item.ci} ${item.ubicacion}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()));
  return <section className="fi-panel">
    <div className="fi-controles"><label className="fi-buscador"><input aria-label="Buscar pacientes" placeholder="Buscar paciente, CI o ubicación" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></label><div className="fi-filtros">{["Todas", "Emergencias", "Internación", "Terapia intensiva"].map((valor) => <button key={valor} className={area === valor ? "activo" : ""} aria-pressed={area === valor} onClick={() => setArea(valor)}>{valor}</button>)}<button onClick={() => setRevision((valor) => valor + 1)} disabled={cargando}>Actualizar</button></div></div>
    {error && <p role="alert" className="fd-aviso">{error}</p>}
    {cargando && <p role="status" className="fd-aviso">Cargando pacientes de Emergencias…</p>}
    <div className="fi-tabla-wrap"><table className="fi-tabla"><thead><tr><th>Paciente</th><th>CI</th><th>Área</th><th>Ubicación</th><th>Ingreso</th><th>Acciones</th></tr></thead><tbody>{visibles.map((item) => <tr key={`${item.area}-${item.id}`}><td><strong>{item.nombre}</strong></td><td>{item.ci || "Sin documento"}</td><td>{item.area}</td><td>{item.ubicacion}</td><td>{item.fecha.slice(0, 10)}</td><td><button className="fi-secundario" disabled={!item.ci} onClick={() => abrir(item.ci)}>Ver descargos</button></td></tr>)}</tbody></table></div>
    {!visibles.length && !cargando && <div className="fi-vacio"><strong>No hay pacientes que coincidan.</strong></div>}
  </section>;
}
