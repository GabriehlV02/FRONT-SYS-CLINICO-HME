import JSZip from 'jszip';
import { createExtractorFromData } from 'node-unrar-js';
import unrarWasmUrl from 'node-unrar-js/esm/js/unrar.wasm?url';
import { Archive } from 'libarchive.js';

Archive.init({ workerUrl: `${import.meta.env.BASE_URL}libarchive/worker-bundle.js` });

export type ResultadoImportacion = {
  dicom: File[];
  imagenes: File[];
  omitidos: number;
  origen: 'archivo' | 'carpeta' | 'zip' | 'rar' | 'comprimido';
};

const extensionesImagen = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif']);
const extensionesAuxiliares = new Set([
  'exe', 'dll', 'jar', 'class', 'html', 'htm', 'inf', 'ini', 'properties', 'txt',
  'xml', 'json', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'bat', 'cmd', 'sh', 'iso',
]);

const extension = (nombre: string) => {
  const base = nombre.split(/[\\/]/).pop() || nombre;
  const indice = base.lastIndexOf('.');
  return indice > 0 ? base.slice(indice + 1).toLowerCase() : '';
};

async function tieneFirmaDicom(file: Blob) {
  if (file.size < 132) return false;
  const firma = new Uint8Array(await file.slice(128, 132).arrayBuffer());
  return String.fromCharCode(...firma) === 'DICM';
}

async function clasificar(files: File[], origen: ResultadoImportacion['origen']) {
  const resultado: ResultadoImportacion = { dicom: [], imagenes: [], omitidos: 0, origen };
  for (const file of files) {
    const ext = extension(file.name);
    const nombre = file.name.split(/[\\/]/).pop()?.toUpperCase();
    if (!file.size || nombre === 'DICOMDIR' || extensionesAuxiliares.has(ext)) {
      resultado.omitidos++;
      continue;
    }
    if (file.type.startsWith('image/') || extensionesImagen.has(ext)) {
      resultado.imagenes.push(file);
      continue;
    }
    if (ext === 'dcm' || ext === 'dicom' || await tieneFirmaDicom(file) || !ext) {
      resultado.dicom.push(file);
      continue;
    }
    resultado.omitidos++;
  }
  return resultado;
}

async function extraerZip(file: File) {
  const zip = await JSZip.loadAsync(file, { createFolders: false });
  const files: File[] = [];
  for (const entrada of Object.values(zip.files)) {
    if (entrada.dir) continue;
    const blob = await entrada.async('blob');
    files.push(new File([blob], entrada.name, { type: 'application/octet-stream' }));
  }
  return clasificar(files, 'zip');
}

async function extraerRar(file: File) {
  const wasmBinary = await fetch(unrarWasmUrl).then(respuesta => {
    if (!respuesta.ok) throw new Error('No se pudo inicializar el lector RAR.');
    return respuesta.arrayBuffer();
  });
  const extractor = await createExtractorFromData({ data: await file.arrayBuffer(), wasmBinary });
  const extraidos = extractor.extract();
  const files: File[] = [];
  // El generador debe recorrerse completo para liberar la memoria nativa de UnRAR.
  for (const entrada of extraidos.files) {
    if (!entrada.extraction || entrada.fileHeader.flags.directory) continue;
    files.push(new File([entrada.extraction as BlobPart], entrada.fileHeader.name, { type: 'application/octet-stream' }));
  }
  return clasificar(files, 'rar');
}

const extensionesComprimidas = new Set(['7z', 'tar', 'gz', 'tgz', 'bz2', 'tbz', 'tbz2', 'xz', 'txz', 'cab', 'iso']);

async function extraerComprimido(file: File) {
  const archive = await Archive.open(file);
  try {
    if (await archive.hasEncryptedData()) {
      throw new Error('El archivo comprimido está protegido con contraseña. Descomprímelo o retira la contraseña antes de abrirlo.');
    }
    const extraidos: File[] = [];
    await archive.extractFiles((entrada: { file?: File }) => {
      if (entrada.file instanceof File && entrada.file.size) extraidos.push(entrada.file);
    });
    if (!extraidos.length) throw new Error('El archivo comprimido está vacío o no pudo descomprimirse.');
    return clasificar(extraidos, 'comprimido');
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'formato desconocido';
    throw new Error(`No se pudo descomprimir “${file.name}”: ${mensaje}`);
  } finally {
    await archive.close().catch(() => undefined);
  }
}

export async function importarEstudio(seleccion: File[]) {
  if (!seleccion.length) throw new Error('No se seleccionaron archivos.');
  if (seleccion.length === 1) {
    const ext = extension(seleccion[0].name);
    if (ext === 'zip') return extraerZip(seleccion[0]);
    if (ext === 'rar') return extraerRar(seleccion[0]);
    if (extensionesComprimidas.has(ext)) return extraerComprimido(seleccion[0]);
  }
  const esCarpeta = seleccion.some(file => Boolean((file as File & { webkitRelativePath?: string }).webkitRelativePath));
  return clasificar(seleccion, esCarpeta ? 'carpeta' : 'archivo');
}
