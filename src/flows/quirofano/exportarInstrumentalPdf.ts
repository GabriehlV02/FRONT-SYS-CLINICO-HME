import { fechaISOEnBolivia } from "../../utils/fechaBolivia";
import { apiFetch } from '../../radius/api';
import type { MaterialEsteril } from './almacenEsterilizacion';
import { ETIQUETAS_ESTADO } from './almacenEsterilizacion';

async function miniaturaMaterial(material: MaterialEsteril): Promise<string | null> {
  if (!material.imagen && !material.tieneImagen) return null;
  const respuesta = material.tieneImagen
    ? await apiFetch(`/api/v1/instrumental/${encodeURIComponent(material.id)}/imagen`)
    : await fetch(material.imagen!);
  if (!respuesta.ok) throw new Error(`No se pudo cargar la imagen de ${material.nombre}.`);
  const url = URL.createObjectURL(await respuesta.blob());
  try {
    const imagen = new Image();
    await new Promise<void>((resolve, reject) => {
      imagen.onload = () => resolve();
      imagen.onerror = () => reject(new Error(`No se pudo preparar la imagen de ${material.nombre}.`));
      imagen.src = url;
    });
    const lienzo = document.createElement('canvas');
    lienzo.width = 96;
    lienzo.height = 96;
    const contexto = lienzo.getContext('2d');
    if (!contexto) throw new Error('No se pudo preparar la imagen para el reporte.');
    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, 96, 96);
    const escala = Math.min(96 / imagen.naturalWidth, 96 / imagen.naturalHeight);
    const ancho = imagen.naturalWidth * escala;
    const alto = imagen.naturalHeight * escala;
    contexto.drawImage(imagen, (96 - ancho) / 2, (96 - alto) / 2, ancho, alto);
    return lienzo.toDataURL('image/jpeg', 0.75);
  } finally { URL.revokeObjectURL(url); }
}

export async function exportarInstrumentalPdf(
  materiales: MaterialEsteril[],
  obtenerUbicacion: (material: MaterialEsteril) => string,
): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const logo = new Image();
  await new Promise<void>((resolve, reject) => {
    logo.onload = () => resolve();
    logo.onerror = () => reject(new Error('No se pudo cargar el logo del hospital.'));
    logo.src = '/logo-hospital-reportes.png';
  });
  const canvas = document.createElement('canvas');
  canvas.width = logo.naturalWidth;
  canvas.height = logo.naturalHeight;
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('No se pudo preparar el logo del hospital.');
  contexto.drawImage(logo, 0, 0);
  const imagenLogo = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fecha = new Date().toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
  // Consultar nuevamente evita usar referencias antiguas conservadas por el navegador.
  const respuesta = await apiFetch('/api/v1/instrumental');
  if (!respuesta.ok) throw new Error('No se pudo consultar el inventario actualizado para el reporte.');
  const resultado = await respuesta.json() as { data: Array<{ id: string; codigo: string; nombre: string; lote: string | null; medida: string | null; cantidad: number; cuenta_con_logo: boolean; descripcion: string | null; ubicacion: string; estado: MaterialEsteril['estado']; imagen_ruta: string | null; updated_at: string }> };
  if (!Array.isArray(resultado.data)) throw new Error('El inventario recibido no es v?lido.');
  const locales = new Map(materiales.map(material => [material.id, material]));
  const registros = resultado.data.map(item => {
    const local = locales.get(item.id);
    return {
      id: item.id, codigo: item.codigo, nombre: item.nombre, lote: item.lote || '', medida: item.medida || '',
      cantidad: item.cantidad, cuentaConLogo: Boolean(item.cuenta_con_logo), descripcion: item.descripcion || '',
      sector: item.ubicacion, estado: item.estado, tieneImagen: Boolean(item.imagen_ruta),
      imagen: local?.imagen || '', tipo: local?.tipo || 'Instrumento', marca: local?.marca || '',
      serie: local?.serie || '', cirugiaId: local?.cirugiaId || '', actualizadoEn: item.updated_at,
    } satisfies MaterialEsteril;
  }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const totalUnidades = registros.reduce((total, material) => total + Number(material.cantidad ?? 0), 0);
  const imagenes: (string | null)[] = new Array(registros.length).fill(null);
  let siguiente = 0;
  await Promise.all(Array.from({ length: Math.min(4, registros.length) }, async () => {
    while (siguiente < registros.length) {
      const indice = siguiente++;
      imagenes[indice] = await miniaturaMaterial(registros[indice]);
    }
  }));
  autoTable(pdf, {
    startY: 36,
    margin: { top: 36, left: 10, right: 10, bottom: 14 },
    head: [['Foto', 'Código', 'Material', 'Medida', 'Lote', 'Cant.', 'Ubicación', 'Logo', 'Estado', 'Descripción / observaciones']],
    body: registros.map(item => [
      '', item.codigo, item.nombre, item.medida || '-', item.lote || '-', String(item.cantidad ?? 1),
      obtenerUbicacion(item), item.cuentaConLogo ? 'Sí' : 'No', ETIQUETAS_ESTADO[item.estado] || item.estado,
      item.descripcion || '-',
    ]),
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle', textColor: [28, 58, 78] },
    headStyles: { fillColor: [18, 56, 98], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 249, 253] },
    columnStyles: { 0: { cellWidth: 19, minCellHeight: 18 }, 1: { cellWidth: 22 }, 2: { cellWidth: 37 }, 3: { cellWidth: 18 }, 4: { cellWidth: 20 }, 5: { cellWidth: 16, halign: 'center' }, 6: { cellWidth: 31 }, 7: { cellWidth: 14 }, 8: { cellWidth: 28 } },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 0) return;
      const foto = imagenes[data.row.index];
      if (foto) pdf.addImage(foto, 'JPEG', data.cell.x + 2, data.cell.y + 2, 14, 14, undefined, 'FAST');
    },
    didDrawPage: () => {
      const ancho = pdf.internal.pageSize.getWidth();
      const alto = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(18, 56, 98);
      pdf.rect(0, 0, ancho, 2.5, 'F');
      pdf.addImage(imagenLogo, 'PNG', 10, 6, 43, 19, undefined, 'FAST');
      pdf.setTextColor(18, 56, 98);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text('HOJA DE INVENTARIO DE MATERIAL', 61, 13);
      pdf.setFontSize(8);
      pdf.setTextColor(83, 109, 136);
      pdf.text('INSTRUMENTAL QUIRÚRGICO', 61, 20);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.text('FECHA DE EMISIÓN', ancho - 72, 10);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(22, 53, 88);
      pdf.text(fecha, ancho - 72, 15);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(83, 109, 136);
      pdf.text('MATERIALES / UNIDADES', ancho - 72, 21);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(22, 53, 88);
      pdf.text(`${registros.length} / ${totalUnidades.toLocaleString('es-BO')}`, ancho - 72, 26);
      pdf.setDrawColor(185, 207, 229);
      pdf.setLineWidth(0.4);
      pdf.line(10, 31, ancho - 10, 31);
      pdf.setTextColor(83, 109, 136);
      pdf.setFontSize(8);
      pdf.text(`Página ${pdf.getNumberOfPages()}`, ancho - 10, alto - 7, { align: 'right' });
    },
  });
  pdf.save(`inventario-instrumental-${fechaISOEnBolivia()}.pdf`);
}
