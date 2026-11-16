import { useState } from "react";
import type { CuentaEmergencia } from "./emergenciasApi";
import { formatearFechaTratamiento, reunirTratamiento, type CategoriaTratamiento, type FilaTratamiento } from "./tratamientoPaciente";
import Icon from "../../radius/componentes/Icono";
import { notificar } from "../../radius/componentes/Notificaciones";
import "./TratamientoPacienteTabla.css";

export function TratamientoPacienteTabla({ cuenta }: { cuenta: CuentaEmergencia }) {
  const [buscar, setBuscar] = useState("");
  const [categoria, setCategoria] = useState<CategoriaTratamiento | "todos">("todos");
  const [filaEnVista, setFilaEnVista] = useState<FilaTratamiento | null>(null);
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
    <header className="em-panel-titulo em-tratamiento-encabezado">
      <div className="em-tratamiento-titulo-grupo">
        <span className="em-tratamiento-titulo-icono"><Icon name="clipboardMedical" size={19} /></span>
        <div><small>HISTORIAL CLÍNICO</small><h3 id="em-tratamiento-titulo">Suministración y tratamiento del paciente</h3></div>
      </div>
      <b className="em-tratamiento-conteo"><strong>{visibles.length}</strong><span>registros</span></b>
    </header>
    <div className="em-tratamiento-herramientas">
      <label>Buscar en el tratamiento<input type="search" value={buscar} onChange={(evento) => setBuscar(evento.target.value)} placeholder="Insumo, medicamento, estudio o profesional" /></label>
      <label>Tipo de registro<select value={categoria} onChange={(evento) => setCategoria(evento.target.value as typeof categoria)}>
        <option value="todos">Todos</option><option value="insumos">Insumos utilizados</option><option value="suministraciones">Suministraciones</option><option value="recetas">Medicamentos y recetas</option><option value="medicos">Evaluaciones médicas</option><option value="laboratorio">Laboratorios</option><option value="imagenes">Imágenes médicas</option><option value="servicios">Servicios y procedimientos</option><option value="indicaciones">Otras indicaciones y cuidados</option>
      </select></label>
      <button type="button" className="em-hoja-tratamiento" onClick={imprimirHoja}><Icon name="print" size={16} /> Hoja de tratamiento</button>
    </div>
    <div className="em-tratamiento-scroll" tabIndex={0} role="region" aria-label="Registros de suministración y tratamiento">
      <table><thead><tr><th scope="col">Fecha y hora</th><th scope="col">Insumo utilizado</th><th scope="col">Cantidad</th><th scope="col">Médico prescriptor</th><th scope="col">Opciones</th></tr></thead>
        <tbody>{visibles.map((fila) => <tr key={fila.id}><td><time dateTime={fila.fecha}>{formatearFechaTratamiento(fila.fecha)}</time></td><td><strong>{fila.detalle}</strong></td><td>{fila.cantidad}</td><td>{fila.responsable}</td><td><button type="button" className="em-tratamiento-ver" onClick={() => setFilaEnVista(fila)}><Icon name="eye" size={15} /> Ver</button></td></tr>)}{!visibles.length && <tr><td colSpan={5} className="em-tratamiento-vacio">{filas.length ? "No hay registros que coincidan con la búsqueda y el filtro." : "Aún no hay suministraciones, tratamientos o indicaciones registrados en esta atención."}</td></tr>}</tbody>
      </table>
    </div>
    {filaEnVista && <div className="em-tratamiento-detalle-fondo" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setFilaEnVista(null); }}><section className="em-tratamiento-detalle" role="dialog" aria-modal="true" aria-labelledby="em-tratamiento-detalle-titulo"><header><div><small>DETALLE DEL REGISTRO</small><h3 id="em-tratamiento-detalle-titulo">{filaEnVista.detalle}</h3></div><button type="button" aria-label="Cerrar detalle" onClick={() => setFilaEnVista(null)}><Icon name="close" size={17} /></button></header><dl><div><dt>Fecha y hora</dt><dd>{formatearFechaTratamiento(filaEnVista.fecha)}</dd></div><div><dt>Insumo utilizado</dt><dd>{filaEnVista.detalle}</dd></div><div><dt>Cantidad</dt><dd>{filaEnVista.cantidad}</dd></div><div><dt>Médico prescriptor</dt><dd>{filaEnVista.responsable}</dd></div><div><dt>Tipo de registro</dt><dd>{filaEnVista.tipo}</dd></div><div><dt>Estado</dt><dd>{filaEnVista.estado}</dd></div>{filaEnVista.prescripcion && <div><dt>Prescripción</dt><dd>{filaEnVista.prescripcion}</dd></div>}{filaEnVista.observacion && <div><dt>Observaciones</dt><dd>{filaEnVista.observacion}</dd></div>}</dl><footer><button type="button" onClick={() => setFilaEnVista(null)}>Cerrar</button></footer></section></div>}
  </section>;
}
