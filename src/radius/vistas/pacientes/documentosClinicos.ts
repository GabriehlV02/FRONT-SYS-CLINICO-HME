import { apiFetch } from "../../api";

export type SeccionHojaClinica = {
  titulo: string;
  contenido: string | string[];
};

export type HojaClinicaPdf = {
  titulo: string;
  servicio: string;
  paciente: string;
  ci: string;
  historiaClinica?: string;
  fecha: string;
  secciones: SeccionHojaClinica[];
};

export async function crearHojaClinicaPdf(datos: HojaClinicaPdf): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ancho = pdf.internal.pageSize.getWidth();
  const alto = pdf.internal.pageSize.getHeight();
  const margen = 16;
  const anchoTexto = ancho - margen * 2;
  let y = 17;

  const encabezado = () => {
    pdf.setFillColor(18, 56, 98);
    pdf.rect(0, 0, ancho, 3, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(18, 56, 98);
    pdf.text("HOSPITAL MARÍA ESPERANZA", margen, 12);
    pdf.setFontSize(7.5);
    pdf.setTextColor(83, 109, 136);
    pdf.text(datos.servicio.toLocaleUpperCase("es"), ancho - margen, 12, { align: "right" });
    pdf.setDrawColor(185, 207, 229);
    pdf.setLineWidth(0.35);
    pdf.line(margen, 16, ancho - margen, 16);
    y = 24;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(18, 56, 98);
    const lineasTitulo = pdf.splitTextToSize(datos.titulo.toLocaleUpperCase("es"), anchoTexto);
    pdf.text(lineasTitulo, margen, y);
    y += lineasTitulo.length * 6 + 3;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(35, 65, 91);
    const paciente = `PACIENTE: ${datos.paciente}    CI: ${datos.ci || "Sin documento"}`;
    pdf.text(pdf.splitTextToSize(paciente, anchoTexto), margen, y);
    y += 5;
    if (datos.historiaClinica) {
      pdf.text(`HISTORIA CLÍNICA: ${datos.historiaClinica}`, margen, y);
      y += 5;
    }
    pdf.text(`FECHA: ${datos.fecha}`, margen, y);
    y += 7;
    pdf.setDrawColor(185, 207, 229);
    pdf.line(margen, y, ancho - margen, y);
    y += 6;
  };

  const nuevaPagina = () => {
    pdf.addPage("a4", "portrait");
    encabezado();
  };

  encabezado();
  for (const seccion of datos.secciones) {
    const contenido = (Array.isArray(seccion.contenido) ? seccion.contenido : [seccion.contenido])
      .map((linea) => linea.trim())
      .filter(Boolean);
    if (!contenido.length) continue;
    const lineas = contenido.flatMap((linea) => pdf.splitTextToSize(linea, anchoTexto));
    const altura = 5 + lineas.length * 4.3 + 5;
    if (y + altura > alto - 17) nuevaPagina();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(18, 56, 98);
    pdf.text(seccion.titulo.toLocaleUpperCase("es"), margen, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(35, 65, 91);
    for (const linea of lineas) {
      if (y > alto - 15) nuevaPagina();
      pdf.text(linea, margen, y);
      y += 4.3;
    }
    y += 5;
  }

  for (let pagina = 1; pagina <= pdf.getNumberOfPages(); pagina++) {
    pdf.setPage(pagina);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(103, 128, 147);
    pdf.text(`Hoja clínica · ${pagina} de ${pdf.getNumberOfPages()}`, ancho - margen, alto - 8, { align: "right" });
  }

  return pdf.output("blob");
}

export async function archivarHojaClinica(datos: {
  pacienteId: string;
  referenciaId: string;
  categoriaReferencia?: "emergencia" | "cita";
  tipo: "hoja_atencion_emergencia" | "hoja_consulta_ambulatoria";
  titulo: string;
  archivo: Blob;
}): Promise<void> {
  const formulario = new FormData();
  const nombreArchivo = `${datos.tipo}-${datos.referenciaId}.pdf`;
  formulario.append("archivo", datos.archivo, nombreArchivo);
  formulario.append("tipo", datos.tipo);
  formulario.append("titulo", datos.titulo);
  formulario.append("referencia_id", datos.referenciaId);
  formulario.append("categoria_referencia", datos.categoriaReferencia || "emergencia");

  const ruta = datos.categoriaReferencia === "cita"
    ? `/api/v1/citas/${encodeURIComponent(datos.referenciaId)}/documento-clinico`
    : `/api/v1/pacientes/${encodeURIComponent(datos.pacienteId)}/documentos-clinicos`;
  const respuesta = await apiFetch(ruta, {
    method: "POST",
    body: formulario,
  });
  const resultado = await respuesta.json().catch(() => null) as { message?: string; errors?: Record<string, string[]> } | null;
  if (!respuesta.ok) {
    const detalle = resultado?.errors && Object.values(resultado.errors).flat().find(Boolean);
    throw new Error(detalle || resultado?.message || "No se pudo guardar la hoja en la historia clínica.");
  }
}
