type DatosPdf = {
  imagen: string;
  logo: string;
  paciente: string;
  pacienteId: string;
  estudio: string;
  modalidad: string;
  fechaEstudio: string;
  acceso: string;
  uid: string;
  corte: string;
};

const escapar = (valor:string) => valor.replace(/[&<>"']/g, caracter => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[caracter] || caracter));
const dato = (valor:string) => escapar(valor.trim() || 'No registrado');

export function crearPlantillaRadiografiaPdf(datos:DatosPdf) {
  const generado = new Intl.DateTimeFormat('es-BO',{dateStyle:'long',timeStyle:'short'}).format(new Date());
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${dato(datos.estudio)}</title>
<style>
@page{size:A4 portrait;margin:6mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#17202b;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.hoja{width:100%;height:285mm;display:flex;flex-direction:column;overflow:hidden;border-top:3px solid #0b3f82;break-inside:avoid;page-break-inside:avoid}.cabecera{height:22mm;flex:0 0 22mm;display:flex;align-items:center;padding:1.5mm 2mm;border-bottom:1px solid #8ab0da}.logo{width:20mm;height:18mm;object-fit:contain}.institucion{padding-left:3.5mm;border-left:1px solid #b9cee5}.institucion h1{margin:0;color:#0b3f82;font-size:14pt;line-height:1;text-transform:uppercase;letter-spacing:.2px}.institucion h2{margin:1.3mm 0 0;color:#315f94;font-size:7.5pt;font-weight:600;letter-spacing:1.3px;text-transform:uppercase}.documento{margin-left:auto;text-align:right}.documento strong{display:block;color:#0b3f82;font-size:8pt;text-transform:uppercase}.documento span{display:block;margin-top:1mm;color:#5f6d7c;font-size:6.5pt}.bloque-titulo{margin-top:2mm;padding:1.5mm 2.5mm;color:#fff;background:#0b4b91;font-size:7.5pt;font-weight:700;letter-spacing:.6px;text-transform:uppercase}.grid{display:grid;grid-template-columns:1fr 1fr;border-left:1px solid #7da7d3}.celda{min-height:9.5mm;padding:1.4mm 2.5mm;border-right:1px solid #7da7d3;border-bottom:1px solid #7da7d3}.celda.ancha{grid-column:1/-1}.celda b{display:block;margin-bottom:.7mm;color:#245b96;font-size:5.8pt;letter-spacing:.35px;text-transform:uppercase}.celda span{display:block;color:#111;font-size:7.6pt;font-weight:600;line-height:1.15;overflow-wrap:anywhere}.imagen-marco{margin-top:2mm;min-height:0;flex:1;padding:2mm;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #7da7d3;background:#050607}.imagen-marco img{display:block;max-width:100%;max-height:164mm;object-fit:contain}.pie-datos{height:13mm;flex:0 0 13mm;margin-top:2mm;display:flex;align-items:flex-start;gap:6mm}.nota{flex:1;color:#566575;font-size:5.8pt;line-height:1.3}.firma{width:48mm;padding-top:5mm;border-bottom:1px solid #183c65;text-align:center}.firma span{position:relative;top:3.5mm;color:#334e6c;font-size:6pt}.pie{margin-top:1.5mm;padding-top:1.5mm;display:flex;justify-content:space-between;border-top:1px solid #8ab0da;color:#54708e;font-size:5.7pt}.barra{height:1.3mm;margin-top:1.3mm;background:linear-gradient(90deg,#0b3f82 0 38%,#4b87c4 38% 70%,#c9dcef 70%)}
.imagen-marco{padding:1mm;border:0;background:#fff}.imagen-marco img{border:1px solid #7da7d3;background:#000}
</style></head><body onload="setTimeout(()=>window.print(),350)"><main class="hoja">
<header class="cabecera"><img class="logo" src="${escapar(datos.logo)}" alt="HOSPITAL · Sistema clínico"><div class="institucion"><h1>HOSPITAL · Sistema clínico</h1><h2>Servicio de Imagenología</h2></div><div class="documento"><strong>Estudio radiográfico</strong><span>Documento de imagen médica</span></div></header>
<div class="bloque-titulo">Datos del paciente</div><section class="grid"><div class="celda"><b>Paciente</b><span>${dato(datos.paciente)}</span></div><div class="celda"><b>Identificación / Patient ID</b><span>${dato(datos.pacienteId)}</span></div></section>
<div class="bloque-titulo">Datos del estudio</div><section class="grid"><div class="celda"><b>Estudio</b><span>${dato(datos.estudio)}</span></div><div class="celda"><b>Modalidad</b><span>${dato(datos.modalidad)}</span></div><div class="celda"><b>Fecha del estudio</b><span>${dato(datos.fechaEstudio)}</span></div><div class="celda"><b>Número de acceso</b><span>${dato(datos.acceso)}</span></div><div class="celda ancha"><b>Study Instance UID</b><span>${dato(datos.uid)}</span></div></section>
<div class="bloque-titulo">Imagen seleccionada · ${dato(datos.corte)}</div><section class="imagen-marco"><img src="${datos.imagen}" alt="Imagen radiográfica"></section>
<section class="pie-datos"><div class="nota">Imagen exportada desde el sistema HOSPITAL. La interpretación diagnóstica corresponde al informe médico validado y firmado por el profesional responsable.</div><div class="firma"><span>Firma y sello del profesional</span></div></section>
<footer class="pie"><span>HOSPITAL · Sistema clínico · Imagenología</span><span>Generado: ${escapar(generado)}</span></footer><div class="barra"></div>
</main></body></html>`;
}
