import { useState } from "react";
import { nombrePaciente, type CuentaEmergencia } from "./emergenciasApi";
import "./HistorialDescargosEmergencias.css";

export function HistorialDescargosEmergencias({ cuentas, cargando }: { cuentas: CuentaEmergencia[]; cargando: boolean }) {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  const terminos = normalizar(busqueda).trim().split(/\s+/).filter(Boolean);
  const registros = cuentas.flatMap(cuenta => cuenta.consumos.map(consumo => ({ cuenta, consumo })))
    .filter(({ cuenta, consumo }) => (!tipo || consumo.tipo === tipo) && terminos.every(termino => normalizar(`${nombrePaciente(cuenta)} ${cuenta.identidad?.documento || ""} ${consumo.codigo} ${consumo.nombre}`).includes(termino)))
    .sort((a, b) => b.consumo.inicio.localeCompare(a.consumo.inicio));
  return <section className="em-historial-descargos" aria-label="Historial de descargos">
    <div className="em-historial-descargos-filtros">
      <label>Buscar descargo<input type="search" value={busqueda} onChange={evento => setBusqueda(evento.target.value)} placeholder="Paciente, documento, código o ítem" /></label>
      <label>Tipo<select value={tipo} onChange={evento => setTipo(evento.target.value)}><option value="">Todos los tipos</option><option value="producto">Productos / insumos</option><option value="servicio">Servicios</option></select></label>
      <span role="status">{registros.length} descargos</span>
    </div>
    <div className="em-historial-descargos-tabla"><table><caption className="em-descargos-caption">Descargos registrados en las cuentas de Emergencias</caption><thead><tr><th>Fecha</th><th>Paciente</th><th>Documento</th><th>Ítem</th><th>Tipo</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>{registros.map(({ cuenta, consumo }) => <tr key={`${cuenta.id}-${consumo.registroId}`}><td>{new Date(consumo.inicio).toLocaleString("es-BO")}</td><td>{nombrePaciente(cuenta)}</td><td>{cuenta.identidad?.documento || "—"}</td><td><strong>{consumo.nombre}</strong><small>{consumo.codigo}</small></td><td>{consumo.tipo === "producto" ? "Producto / insumo" : "Servicio"}</td><td>{consumo.cantidad}</td><td>{consumo.porHora ? "Por hora" : consumo.unidad || "—"}</td></tr>)}{!registros.length && <tr><td colSpan={7} className="em-descargos-vacio">{cargando ? "Cargando descargos…" : "No hay descargos que coincidan con la búsqueda."}</td></tr>}</tbody></table></div>
  </section>;
}
