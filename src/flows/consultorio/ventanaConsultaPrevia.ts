import type { CitaConfirmada } from "./AgendaAmbulatoriaView";
import type { DocumentoEpisodio } from "./registroHistoria";

export type ConsultaPrevia = {
  citaId: string; fecha: string; hora: string; medico: string; especialidad: string; tipo?: string;
  signosVitales?: { nombre: string; valor: string; unidad?: string }[];
  contenido: {
    motivo: string; enfermedadActual: string; examenFisico: string; antecedentes: string; notas: string;
    diagnosticos: { diagnostico: string; planes: string[] }[]; revision: Record<string, string>; ordenes: string[];
    documentos?: { recetas?: DocumentoEpisodio[]; ordenes?: DocumentoEpisodio[]; resultados?: DocumentoEpisodio[]; reconsultas?: DocumentoEpisodio[] };
  };
};

const nombresSistemas: Record<string, string> = { general: "Estado general", cabeza: "Cabeza y cuello", respiratorio: "Sistema respiratorio", cardiovascular: "Sistema cardiovascular", digestivo: "Sistema digestivo", genitourinario: "Sistema genitourinario", neurologico: "Sistema neurológico", musculoesqueletico: "Sistema musculoesquelético", piel: "Piel y tejidos blandos" };

export function mostrarConsultaEnContenedor(consulta: ConsultaPrevia, paciente: CitaConfirmada, raiz: ShadowRoot): void {
  const doc = raiz.ownerDocument;
  raiz.replaceChildren();
  const style = doc.createElement("style");
  style.textContent = `*{box-sizing:border-box} :host{display:block;background:#edf6fc;color:#173d5b;font:14px/1.55 system-ui,sans-serif} main{max-width:1050px;margin:auto;padding:16px} header,.tarjeta{background:white;border:1px solid #d3e5ef;border-radius:12px;padding:18px;margin-bottom:12px} header h1{font-size:20px;margin:3px 0;color:#075d94} h2{font-size:15px;color:#0878b6;margin:0 0 12px} p{margin:6px 0;white-space:pre-wrap;overflow-wrap:anywhere} .datos{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 22px} .linea{padding:8px 0;border-bottom:1px solid #edf3f7} .linea:last-child{border-bottom:0} small{color:#668199} @media(max-width:520px){main{padding:10px}header,.tarjeta{padding:14px}}`;
  raiz.append(style);
  const main = doc.createElement("main"); raiz.append(main);
  const crear = (padre: Element, etiqueta: string, texto?: string, clase?: string) => {
    const elemento = doc.createElement(etiqueta);
    if (texto !== undefined) elemento.textContent = texto;
    if (clase) elemento.className = clase;
    padre.append(elemento); return elemento;
  };
  const fila = (padre: Element, etiqueta: string, valor: string | number | undefined | null) => {
    const p = crear(padre, "p"); crear(p, "strong", `${etiqueta}: `); p.append(doc.createTextNode(String(valor || "Sin registro")));
  };
  const seccion = (titulo: string) => { const tarjeta = crear(main, "section", undefined, "tarjeta"); crear(tarjeta, "h2", titulo); return tarjeta; };
  const cabecera = crear(main, "header"); const titulo = crear(cabecera, "div");
  crear(titulo, "small", "HISTORIA CLÍNICA · SOLO LECTURA"); crear(titulo, "h1", "Consulta médica");
  const datos = crear(cabecera, "div", undefined, "datos");
  fila(datos, "Paciente", paciente.paciente); fila(datos, "CI", paciente.ci); fila(datos, "Fecha de nacimiento", paciente.fechaNacimiento);
  fila(datos, "Fecha de consulta", consulta.fecha.split("-").reverse().join("/")); fila(datos, "Hora", consulta.hora);
  fila(datos, "Tipo", consulta.tipo === "reconsulta" ? "Reconsulta" : "Consulta"); fila(datos, "Médico", consulta.medico); fila(datos, "Especialidad", consulta.especialidad);
  const contenido = consulta.contenido;
  const clinica = seccion("Datos de la atención"); fila(clinica, "Motivo de consulta", contenido.motivo); fila(clinica, "Enfermedad actual", contenido.enfermedadActual); fila(clinica, "Antecedentes", contenido.antecedentes); fila(clinica, "Examen físico", contenido.examenFisico); fila(clinica, "Notas", contenido.notas);
  const signos = seccion("Signos vitales");
  if (consulta.signosVitales?.length) consulta.signosVitales.forEach((item) => fila(signos, item.nombre, `${item.valor}${item.unidad ? ` ${item.unidad}` : ""}`)); else crear(signos, "p", "Sin signos vitales registrados.");
  const revision = seccion("Revisión por sistemas");
  const revisiones = Object.entries(contenido.revision || {});
  if (revisiones.length) revisiones.forEach(([id, valor]) => {
    let texto = valor;
    try {
      const registro: unknown = JSON.parse(valor);
      if (registro && typeof registro === "object" && !Array.isArray(registro)) {
        const datos = registro as Record<string, unknown>;
        texto = [Array.isArray(datos.estados) ? datos.estados.join(", ") : "", typeof datos.detalle === "string" ? datos.detalle : ""].filter(Boolean).join(" · ") || "Negativo";
      }
    } catch { /* Las observaciones antiguas se guardaron como texto. */ }
    fila(revision, nombresSistemas[id] || id, texto);
  }); else crear(revision, "p", "Sin observaciones registradas.");
  const diagnosticos = seccion("Diagnósticos y planes médicos");
  if (contenido.diagnosticos?.length) contenido.diagnosticos.forEach((item) => { const bloque = crear(diagnosticos, "div", undefined, "linea"); crear(bloque, "strong", item.diagnostico); if (item.planes?.length) item.planes.forEach((plan) => crear(bloque, "p", `• ${plan}`)); else crear(bloque, "p", "Sin indicaciones registradas."); }); else crear(diagnosticos, "p", "Sin diagnósticos registrados.");
  const ordenes = seccion("Órdenes médicas"); if (contenido.ordenes?.length) contenido.ordenes.forEach((orden) => crear(ordenes, "p", `• ${orden}`)); else crear(ordenes, "p", "Sin órdenes registradas.");
  const documentos = contenido.documentos;
  const mostrarValor = (padre: Element, valor: unknown, etiqueta?: string) => {
    if (valor === null || valor === undefined || valor === "") return;
    if (Array.isArray(valor)) { valor.forEach((item) => mostrarValor(padre, item)); return; }
    if (typeof valor === "object") { Object.entries(valor).forEach(([clave, item]) => mostrarValor(padre, item, clave.replace(/([A-Z])/g, " $1"))); return; }
    fila(padre, etiqueta || "Detalle", String(valor));
  };
  ([ ["Recetas", documentos?.recetas], ["Documentos de órdenes", documentos?.ordenes], ["Resultados", documentos?.resultados], ["Reconsultas", documentos?.reconsultas] ] as const).forEach(([tituloSeccion, items]) => {
    const tarjeta = seccion(tituloSeccion); if (items?.length) items.forEach((item) => { const bloque = crear(tarjeta, "div", undefined, "linea"); mostrarValor(bloque, item); }); else crear(tarjeta, "p", "Sin registros disponibles.");
  });
}
