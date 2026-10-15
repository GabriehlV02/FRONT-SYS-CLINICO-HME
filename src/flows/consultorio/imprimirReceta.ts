import type { DocumentoEpisodio } from './registroHistoria';

export function abrirImpresionReceta() {
  return window.open('', '_blank', 'width=950,height=680');
}

export function imprimirReceta(ventana: Window, documento: DocumentoEpisodio, paciente: { paciente: string; ci: string }, medico: string) {
  const escapar = (valor: string) => valor.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const fecha = documento.receta?.fecha || documento.fecha || '';
  const fechaVisible = fecha.includes('T') ? new Date(fecha).toLocaleDateString('es-BO') : fecha;
  const medicamentos = documento.receta?.medicamentos;
  const contenido = medicamentos ? medicamentos.map((m, i) => `<article><h3>${i + 1}. ${escapar(m.nombre)}</h3><p><b>Dosis:</b> ${escapar(m.dosis)} &nbsp; <b>Frecuencia:</b> ${escapar(m.frecuencia)}${m.via ? ` &nbsp; <b>Vía:</b> ${escapar(m.via)}` : ''}</p>${m.indicaciones ? `<p class="indicacion"><b>Indicaciones:</b> ${escapar(m.indicaciones)}</p>` : ''}</article>`).join('') : `<p class="indicacion">${escapar(documento.detalle)}</p>`;
  // Media carta horizontal: 215,9 × 139,7 mm. Shared by first prints and reprints.
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Receta médica · Media carta · ${escapar(paciente.paciente)}</title><style>
    @page{size:8.5in 5.5in;margin:9mm 11mm}*{box-sizing:border-box}body{margin:0;color:#173b4b;font-family:Arial,sans-serif;font-size:10px}header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:8px;border-bottom:2px solid #287565}header img{width:108px;height:48px;object-fit:contain}h1{font-size:18px;margin:0 0 5px}header small{font-size:9px;color:#506e67}.paciente{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #dce5e0}.paciente p{margin:0;line-height:1.6}article{padding:8px 0;border-bottom:1px solid #e0e8e3;break-inside:avoid}h3{margin:0 0 4px;font-size:11px}p{margin:3px 0;line-height:1.5;overflow-wrap:anywhere}.indicacion{white-space:pre-wrap}footer{margin-top:20px;padding-top:12px;break-inside:avoid;text-align:right}footer span{display:inline-block;border-top:1px solid #5d766d;min-width:170px;padding-top:5px;color:#536c63;font-size:9px}@media screen{body{max-width:194mm;margin:20px auto;padding:12px;background:#fff}}
    </style></head><body><header><img src="${window.location.origin}/logo-hospital-original.png" alt="Hospital María Esperanza"><div><h1>Receta médica</h1><small>Fecha: ${escapar(fechaVisible)}</small></div></header><section class="paciente"><p><b>Paciente:</b> ${escapar(paciente.paciente)}<br><b>CI:</b> ${escapar(paciente.ci)}</p><p><b>Médico:</b> ${escapar(medico)}</p></section>${contenido}${documento.receta?.indicaciones ? `<p class="indicacion"><b>Indicaciones generales:</b> ${escapar(documento.receta.indicaciones)}</p>` : ''}<footer><span>Firma y sello médico</span></footer></body></html>`);
  ventana.document.close();
  const imagenes = [...ventana.document.images];
  void Promise.all(imagenes.map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); }))).then(() => {
    if (!ventana.closed) { ventana.focus(); ventana.print(); }
  });
}
