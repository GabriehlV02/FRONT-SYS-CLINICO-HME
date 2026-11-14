import { useState } from "react";
import type { CuentaEmergencia } from "./emergenciasApi";
import { reunirTratamiento, type CategoriaTratamiento } from "./tratamientoPaciente";
import Icon from "../../radius/componentes/Icono";
import { notificar } from "../../radius/componentes/Notificaciones";
import "./TratamientoPacienteTabla.css";

export function TratamientoPacienteTabla({ cuenta }: { cuenta: CuentaEmergencia }) {
  const [buscar, setBuscar] = useState("");
  const [categoria, setCategoria] = useState<CategoriaTratamiento | "todos">("todos");
  const { filas } = reunirTratamiento(cuenta);
  const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
  const visibles = filas.filter((fila) => (categoria === "todos" || fila.categoria === categoria) && normalizar(`${fila.tipo} ${fila.detalle} ${fila.responsable} ${fila.prescripcion} ${fila.observacion} ${fila.estado}`).includes(normalizar(buscar)));
  const imprimirHoja = () => {
    const ventana = window.open("", "_blank");
    if (!ventana) {
      notificar("advertencia", "Ventana bloqueada", "Permite las ventanas emergentes para abrir la hoja de tratamiento.");
      return;
    }
    const escapar = (valor: string) => valor.replace(/[&<>\"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" })[caracter] || caracter);
    const paciente = [cuenta.identidad?.nombres, cuenta.identidad?.apellidos].filter(Boolean).join(" ") || "Paciente sin nombre registrado";
    const documento = cuenta.identidad?.documento || "Sin documento";
    const filasHtml = visibles.map((fila) => `<tr><td>${escapar(new Date(fila.fecha).toLocaleString("es-BO"))}</td><td>${escapar(fila.tipo)}</td><td><strong>${escapar(fila.detalle)}</strong>${fila.observacion ? `<small>${escapar(fila.observacion)}</small>` : ""}</td><td>${escapar(fila.cantidad)}</td><td>${escapar(fila.prescripcion || "—")}</td><td>${escapar(fila.responsable)}</td><td>${escapar(fila.estado)}</td></tr>`).join("");
    ventana.document.open();
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Hoja de tratamiento</title><style>@page{size:landscape;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#173f5d;margin:0}header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:14px;border-bottom:2px solid #1686bd}h1{margin:0;font-size:21px}p{margin:6px 0 0;color:#647d91;font-size:12px}table{width:100%;margin-top:18px;border-collapse:collapse;font-size:10px}th{padding:9px 7px;background:#eaf5fb;color:#24618a;text-align:left;text-transform:uppercase;font-size:8px}td{padding:8px 7px;border-bottom:1px solid #dce8ef;vertical-align:top}td small{display:block;margin-top:4px;color:#647d91;white-space:pre-wrap}.vacio{text-align:center;padding:24px;color:#647d91}</style></head><body><header><div><h1>Hoja de tratamiento</h1><p>${escapar(paciente)} · CI ${escapar(documento)}</p></div><p>Fecha de impresión: ${escapar(new Date().toLocaleString("es-BO"))}</p></header><table><thead><tr><th>Fecha y hora</th><th>Tipo</th><th>Detalle e indicaciones</th><th>Cantidad</th><th>Prescripción</th><th>Profesional responsable</th><th>Estado</th></tr></thead><tbody>${filasHtml || '<tr><td class="vacio" colspan="7">No hay registros de tratamiento para mostrar.</td></tr>'}</tbody></table></body></html>`);
    ventana.document.close();
    window.setTimeout(() => { ventana.focus(); ventana.print(); }, 250);
  };
  return <section className="em-panel em-tratamiento-paciente" aria-labelledby="em-tratamiento-titulo">
    <header className="em-panel-titulo"><h3 id="em-tratamiento-titulo">Suministración y tratamiento del paciente</h3><b>{visibles.length} registros</b></header>
    <div className="em-tratamiento-herramientas">
      <label>Buscar en el tratamiento<input type="search" value={buscar} onChange={(evento) => setBuscar(evento.target.value)} placeholder="Insumo, medicamento, estudio o profesional" /></label>
      <label>Tipo de registro<select value={categoria} onChange={(evento) => setCategoria(evento.target.value as typeof categoria)}>
        <option value="todos">Todos</option><option value="insumos">Insumos utilizados</option><option value="suministraciones">Suministraciones</option><option value="recetas">Medicamentos y recetas</option><option value="medicos">Evaluaciones médicas</option><option value="laboratorio">Laboratorios</option><option value="imagenes">Imágenes médicas</option><option value="servicios">Servicios y procedimientos</option><option value="indicaciones">Otras indicaciones y cuidados</option>
      </select></label>
      <button type="button" className="em-hoja-tratamiento" onClick={imprimirHoja}><Icon name="print" size={16} /> Hoja de tratamiento</button>
    </div>
    <div className="em-tratamiento-scroll" tabIndex={0} role="region" aria-label="Registros de suministración y tratamiento">
      <table><thead><tr><th scope="col">Fecha y hora</th><th scope="col">Tipo</th><th scope="col">Detalle e indicaciones</th><th scope="col">Cantidad registrada</th><th scope="col">Prescripción</th><th scope="col">Profesional responsable</th><th scope="col">Estado</th></tr></thead>
        <tbody>{visibles.map((fila) => <tr key={fila.id}>
          <td><time dateTime={fila.fecha}>{Number.isNaN(Date.parse(fila.fecha)) ? "Sin fecha registrada" : new Date(fila.fecha).toLocaleString("es-BO")}</time></td>
          <td>{fila.tipo}</td><td><strong>{fila.detalle}</strong>{fila.observacion && <p>{fila.observacion}</p>}</td><td>{fila.cantidad}</td><td>{fila.prescripcion || "—"}</td><td>{fila.responsable}</td><td><span className={`em-tratamiento-estado ${fila.estado === "En uso" || fila.estado === "En curso" ? "en-uso" : ""}`}>{fila.estado}</span></td>
        </tr>)}{!visibles.length && <tr><td colSpan={7} className="em-tratamiento-vacio">{filas.length ? "No hay registros que coincidan con la búsqueda y el filtro." : "Aún no hay suministraciones, tratamientos o indicaciones registrados en esta atención."}</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}
