import { useState } from "react";
import type { CuentaEmergencia } from "./emergenciasApi";
import { reunirTratamiento, type CategoriaTratamiento } from "./tratamientoPaciente";
import "./TratamientoPacienteTabla.css";

export function TratamientoPacienteTabla({ cuenta }: { cuenta: CuentaEmergencia }) {
  const [buscar, setBuscar] = useState("");
  const [categoria, setCategoria] = useState<CategoriaTratamiento | "todos">("todos");
  const { filas } = reunirTratamiento(cuenta);
  const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
  const visibles = filas.filter((fila) => (categoria === "todos" || fila.categoria === categoria) && normalizar(`${fila.tipo} ${fila.detalle} ${fila.responsable} ${fila.prescripcion} ${fila.observacion} ${fila.estado}`).includes(normalizar(buscar)));
  return <section className="em-panel em-tratamiento-paciente" aria-labelledby="em-tratamiento-titulo">
    <header className="em-panel-titulo"><h3 id="em-tratamiento-titulo">Suministración y tratamiento del paciente</h3><b>{visibles.length} registros</b></header>
    <div className="em-tratamiento-herramientas">
      <label>Buscar en el tratamiento<input type="search" value={buscar} onChange={(evento) => setBuscar(evento.target.value)} placeholder="Insumo, medicamento, estudio o profesional" /></label>
      <label>Tipo de registro<select value={categoria} onChange={(evento) => setCategoria(evento.target.value as typeof categoria)}>
        <option value="todos">Todos</option><option value="insumos">Insumos utilizados</option><option value="suministraciones">Suministraciones</option><option value="recetas">Medicamentos y recetas</option><option value="medicos">Evaluaciones médicas</option><option value="laboratorio">Laboratorios</option><option value="imagenes">Imágenes médicas</option><option value="servicios">Servicios y procedimientos</option><option value="indicaciones">Otras indicaciones y cuidados</option>
      </select></label>
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
