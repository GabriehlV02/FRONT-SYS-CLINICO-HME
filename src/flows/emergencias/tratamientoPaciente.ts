import type { CuentaEmergencia } from "./emergenciasApi";

export type CategoriaTratamiento = "insumos" | "suministraciones" | "recetas" | "medicos" | "laboratorio" | "imagenes" | "servicios" | "indicaciones";
export type FilaTratamiento = {
  id: string; fecha: string; categoria: CategoriaTratamiento; tipo: string; detalle: string;
  cantidad: string; prescripcion: string; responsable: string; estado: string; observacion: string;
};
const etiquetas: Record<string, [CategoriaTratamiento, string]> = {
  medicamento: ["recetas", "Medicamento / receta"], laboratorio: ["laboratorio", "Laboratorio"],
  imagenologia: ["imagenes", "Imagen médica"], servicio: ["servicios", "Servicio / procedimiento"],
  internacion: ["indicaciones", "Orden de internación"], cuidado: ["indicaciones", "Indicación médica"],
};
const estadosOrden = { pendiente: "Indicado · pendiente", en_curso: "En curso", aplicada: "Aplicación registrada", cancelada: "Suspendido" };
const instante = (fecha: string, hora?: string) => /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T${hora || "12:00"}:00` : fecha;

export function reunirTratamiento(cuenta: CuentaEmergencia): { filas: FilaTratamiento[]; medicos: string[] } {
  const filas: FilaTratamiento[] = [];
  const medicos = new Map<string, string>();
  const registrarMedico = (nombre: string, tipo?: string) => {
    if (tipo === "medico" && nombre.trim()) medicos.set(nombre.trim().toLocaleLowerCase(), nombre.trim());
  };
  const agregar = (fila: Partial<FilaTratamiento> & Pick<FilaTratamiento, "id" | "fecha" | "categoria" | "tipo" | "detalle" | "estado">) => filas.push({ cantidad: "—", prescripcion: "", responsable: "No registrado", observacion: "", ...fila });
  const consumosAplicados = new Set((cuenta.ordenes || []).flatMap((orden) => (orden.aplicaciones || []).map((aplicacion) => aplicacion.consumoId).filter(Boolean)));
  for (const consumo of cuenta.consumos) {
    if (!consumo.porHora && consumosAplicados.has(consumo.registroId)) continue;
    const orden = cuenta.ordenes?.find((item) => item.id === consumo.ordenId);
    agregar({ id: `consumo-${consumo.registroId}`, fecha: consumo.inicio, categoria: consumo.tipo === "servicio" ? "servicios" : "insumos", tipo: consumo.tipo === "servicio" ? "Servicio utilizado" : "Consumo de insumo",
      detalle: consumo.nombre, cantidad: consumo.porHora ? "Por tiempo de uso" : `${consumo.cantidad} ${consumo.unidad}`,
      responsable: "No registrado", estado: consumo.porHora ? (consumo.fin || cuenta.fin ? "Finalizado" : "En uso") : "Consumo registrado",
      observacion: [orden ? `Relacionado con: ${orden.titulo}` : "", consumo.fin ? `Fin: ${consumo.fin}` : ""].filter(Boolean).join(" · ") });
  }
  for (const orden of cuenta.ordenes || []) {
    registrarMedico(orden.usuario, orden.autorTipo);
    const [categoria, tipo] = etiquetas[orden.tipo] || ["indicaciones", "Indicación"];
    const prescripcion = [orden.dosis && `Dosis prescrita: ${orden.dosis}`, orden.via && `Vía: ${orden.via}`, orden.frecuencia && `Frecuencia: ${orden.frecuencia}`, orden.duracion && `Duración: ${orden.duracion}`].filter(Boolean).join(" · ");
    agregar({ id: `orden-${orden.id}`, fecha: orden.fecha, categoria, tipo, detalle: orden.titulo, prescripcion,
      responsable: orden.usuario || "No registrado", estado: estadosOrden[orden.estado], observacion: orden.indicaciones || "" });
    for (const aplicacion of orden.aplicaciones || []) {
      const consumo = aplicacion.consumoId ? cuenta.consumos.find((item) => item.registroId === aplicacion.consumoId) : undefined;
      agregar({ id: `aplicacion-${orden.id}-${aplicacion.id}`, fecha: aplicacion.fecha, categoria: "suministraciones", tipo: "Aplicación registrada", detalle: orden.titulo,
        cantidad: consumo ? (consumo.porHora ? "Por tiempo de uso" : `${consumo.cantidad} ${consumo.unidad}`) : "No registrada",
        prescripcion, responsable: aplicacion.usuario || "No registrado", estado: "Registrada", observacion: aplicacion.observacion || "" });
    }
  }
  for (const registro of cuenta.registrosEnfermeria || []) {
    agregar({ id: `enfermeria-${registro.id}`, fecha: instante(registro.fecha, registro.hora), categoria: registro.tipo === "insumo" ? "suministraciones" : "indicaciones",
      tipo: registro.tipo === "insumo" ? "Uso de enfermería" : registro.tipo === "procedimiento" ? "Procedimiento de enfermería" : "Cuidado de enfermería",
      detalle: registro.detalle, cantidad: registro.cantidad != null ? `${registro.cantidad} ${registro.unidad || ""}`.trim() : "No registrada",
      responsable: registro.usuario || "No registrado", estado: "Registrado", observacion: registro.observacion || "" });
  }
  for (const [indice, evaluacion] of (cuenta.evaluaciones || []).entries()) {
    registrarMedico(evaluacion.usuario, evaluacion.autorTipo);
    if (evaluacion.autorTipo !== "medico" && !evaluacion.campos.tratamiento?.trim()) continue;
    agregar({ id: `evaluacion-${evaluacion.id || indice}`, fecha: evaluacion.fecha, categoria: evaluacion.autorTipo === "medico" ? "medicos" : "indicaciones",
      tipo: evaluacion.autorTipo === "medico" ? "Evaluación médica" : "Tratamiento registrado", detalle: evaluacion.campos.tratamiento || "Evaluación médica registrada",
      responsable: evaluacion.usuario || "No registrado", estado: "Registrada", observacion: evaluacion.campos.examenesComplementarios || "" });
  }
  filas.sort((a, b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0) || a.id.localeCompare(b.id));
  return { filas, medicos: [...medicos.values()] };
}
