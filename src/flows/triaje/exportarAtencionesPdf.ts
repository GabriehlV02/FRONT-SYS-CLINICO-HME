import type { EpisodioClinico } from '../consultorio/registroHistoria';

const ancho = 842;
const alto = 595;
const margen = 30;
const columnas = [110, 58, 105, 93, 80, 60, 45, 70, 161];
const titulos = ['PACIENTE', 'CI', 'MÉDICO', 'ESPECIALIDAD', 'CONSULTORIO', 'FECHA', 'HORA', 'ESTADO', 'MOTIVO'];
const fechaDe = (episodio: EpisodioClinico) => episodio.paciente.fecha?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0] || episodio.atendidaEn?.slice(0, 10) || episodio.finalizadaEn?.slice(0, 10) || '';
const visible = (fecha: string) => fecha ? new Date(`${fecha}T12:00:00`).toLocaleDateString('es-BO') : 'Sin fecha';

// Las fuentes estándar PDF usan WinAnsi. El contenido del flujo queda ASCII mediante escapes octales.
const textoPdf = (valor: string) => [...valor.replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')].map(caracter => {
  const codigo = caracter.charCodeAt(0);
  if (caracter === '(' || caracter === ')' || caracter === '\\') return `\\${caracter}`;
  if (codigo === 10 || codigo === 13) return ' ';
  if (codigo > 126 && codigo <= 255) return `\\${codigo.toString(8).padStart(3, '0')}`;
  return codigo < 32 || codigo > 255 ? '?' : caracter;
}).join('');
const texto = (x: number, y: number, valor: string, tamano = 9, negrita = false) => `BT /${negrita ? 'F2' : 'F1'} ${tamano} Tf 1 0 0 1 ${x} ${y} Tm (${textoPdf(valor)}) Tj ET\n`;
const lineas = (valor: string, anchoCelda: number, maximo = 3) => {
  const maxCaracteres = Math.max(8, Math.floor((anchoCelda - 12) / 4.6));
  const palabras = valor.trim().split(/\s+/);
  const salida: string[] = [];
  let actual = '';
  for (const palabra of palabras) {
    if ((actual ? `${actual} ${palabra}` : palabra).length > maxCaracteres) {
      if (actual) salida.push(actual);
      actual = palabra;
    } else actual = actual ? `${actual} ${palabra}` : palabra;
  }
  if (actual) salida.push(actual);
  if (salida.length > maximo) return [...salida.slice(0, maximo - 1), `${salida[maximo - 1].slice(0, maxCaracteres - 3)}...`];
  return salida.length ? salida : ['—'];
};

export function crearPdfAtenciones(episodios: EpisodioClinico[], desde: string, hasta: string): Blob {
  const paginas: string[] = [];
  let contenido = '';
  let y = 0;
  const encabezado = () => {
    contenido = '0.07 0.22 0.34 rg\n';
    contenido += texto(margen, alto - 38, 'HOSPITAL MARÍA ESPERANZA', 11, true);
    contenido += texto(margen, alto - 58, 'Registro de atención · Consulta externa', 17, true);
    contenido += texto(margen, alto - 76, `Período: ${visible(desde)} al ${visible(hasta)}    ·    ${episodios.length} atenciones`, 9);
    contenido += '0.91 0.96 0.98 rg\n';
    contenido += `${margen} ${alto - 112} ${ancho - margen * 2} 23 re f\n`;
    contenido += '0.07 0.27 0.41 rg\n';
    let x = margen;
    titulos.forEach((titulo, indice) => { contenido += texto(x + 5, alto - 104, titulo, 7, true); x += columnas[indice]; });
    y = alto - 118;
  };
  encabezado();
  if (!episodios.length) contenido += texto(margen + 10, y - 25, 'No hay atenciones en el período seleccionado.', 10);
  episodios.forEach((episodio, indice) => {
    const valores = [episodio.paciente.paciente, episodio.paciente.ci || 'Sin documento', episodio.medico || 'No registrado', episodio.paciente.especialidad || 'Consulta externa', episodio.paciente.consultorio || 'Sin asignar', visible(fechaDe(episodio)), episodio.paciente.hora || '—', episodio.finalizadaEn ? 'Finalizada' : 'En atención', episodio.motivo || 'Pendiente'];
    const celdas = valores.map((valor, i) => lineas(valor, columnas[i], i === 8 ? 3 : 2));
    const alturaFila = Math.max(25, Math.max(...celdas.map(celda => celda.length)) * 11 + 10);
    if (y - alturaFila < 38) { paginas.push(contenido); encabezado(); }
    if (indice % 2 === 1) { contenido += '0.97 0.985 0.99 rg\n'; contenido += `${margen} ${y - alturaFila} ${ancho - margen * 2} ${alturaFila} re f\n`; }
    contenido += '0.13 0.27 0.38 rg\n';
    let x = margen;
    celdas.forEach((celda, i) => { celda.forEach((linea, numero) => { contenido += texto(x + 5, y - 12 - numero * 11, linea, 8, i === 0); }); x += columnas[i]; });
    contenido += '0.84 0.9 0.94 RG 0.4 w\n';
    contenido += `${margen} ${y - alturaFila} m ${ancho - margen} ${y - alturaFila} l S\n`;
    y -= alturaFila;
  });
  paginas.push(contenido);

  const objetos: string[] = [''];
  const agregar = (valor: string) => { objetos.push(valor); return objetos.length - 1; };
  const catalogoId = agregar('');
  const paginasId = agregar('');
  const fuenteId = agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fuenteNegritaId = agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const paginasObjetos: number[] = [];
  paginas.forEach((pagina, indice) => {
    const flujo = `${pagina}0.45 0.55 0.63 rg\n${texto(ancho - 85, 20, `Página ${indice + 1} de ${paginas.length}`, 8)}`;
    const flujoId = agregar(`<< /Length ${flujo.length} >>\nstream\n${flujo}endstream`);
    paginasObjetos.push(agregar(`<< /Type /Page /Parent ${paginasId} 0 R /MediaBox [0 0 ${ancho} ${alto}] /Resources << /Font << /F1 ${fuenteId} 0 R /F2 ${fuenteNegritaId} 0 R >> >> /Contents ${flujoId} 0 R >>`));
  });
  objetos[catalogoId] = `<< /Type /Catalog /Pages ${paginasId} 0 R >>`;
  objetos[paginasId] = `<< /Type /Pages /Kids [${paginasObjetos.map(id => `${id} 0 R`).join(' ')}] /Count ${paginasObjetos.length} >>`;
  let pdf = '%PDF-1.4\n';
  const posiciones = [0];
  for (let id = 1; id < objetos.length; id++) { posiciones[id] = pdf.length; pdf += `${id} 0 obj\n${objetos[id]}\nendobj\n`; }
  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objetos.length; id++) pdf += `${String(posiciones[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length} /Root ${catalogoId} 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;
  return new Blob([new TextEncoder().encode(pdf)], { type: 'application/pdf' });
}
