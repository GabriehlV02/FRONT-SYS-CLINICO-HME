export type SolicitudImagenologiaDemo = {
  id: string;
  paciente: string;
  ci: string;
  estudio: string;
  pieza: string;
  precio: number;
  estado: "pendiente" | "tomada";
  cobradaEn: string;
  tomadaEn?: string;
  archivoNombre?: string;
  archivoMime?: string;
  informeNombre?: string;
  informeMime?: string;
  informeSubidoEn?: string;
};

const CLAVE_SOLICITUDES = "pulso_local_solicitudes_imagenologia_v1";
const leerSolicitudes = (): SolicitudImagenologiaDemo[] => {
  try {
    const valor = localStorage.getItem(CLAVE_SOLICITUDES);
    return valor ? (JSON.parse(valor) as SolicitudImagenologiaDemo[]) : [];
  } catch {
    return [];
  }
};

export const obtenerSolicitudesImagenologia = leerSolicitudes;

export function guardarSolicitudesImagenologia(solicitudes: SolicitudImagenologiaDemo[]) {
  localStorage.setItem(CLAVE_SOLICITUDES, JSON.stringify(solicitudes));
  window.dispatchEvent(new Event("radiuus:datos-demo"));
}

export function registrarSolicitudesImagenologia(
  paciente: string,
  ci: string,
  lineas: { estudio: string; pieza: string; precio: number; cantidad: number }[],
) {
  const cobradaEn = new Date().toISOString();
  const nuevas = lineas.flatMap((linea) =>
    Array.from({ length: linea.cantidad }, () => ({
      id: crypto.randomUUID(),
      paciente,
      ci,
      estudio: linea.estudio,
      pieza: linea.pieza,
      precio: linea.precio,
      estado: "pendiente" as const,
      cobradaEn,
    })),
  );
  guardarSolicitudesImagenologia([...nuevas, ...leerSolicitudes()]);
  return nuevas;
}

const abrirAlmacen = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const solicitud = indexedDB.open("pulso-local", 1);
    solicitud.onupgradeneeded = () => {
      if (!solicitud.result.objectStoreNames.contains("archivos")) {
        solicitud.result.createObjectStore("archivos");
      }
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });

async function guardarArchivo(clave: string, archivo: File) {
  const db = await abrirAlmacen();
  await new Promise<void>((resolve, reject) => {
    const transaccion = db.transaction("archivos", "readwrite");
    transaccion.objectStore("archivos").put(archivo, clave);
    transaccion.oncomplete = () => resolve();
    transaccion.onerror = () => reject(transaccion.error);
  });
  db.close();
}

async function obtenerArchivo(clave: string) {
  const db = await abrirAlmacen();
  const archivo = await new Promise<File | undefined>((resolve, reject) => {
    const transaccion = db.transaction("archivos", "readonly");
    const solicitud = transaccion.objectStore("archivos").get(clave);
    solicitud.onsuccess = () => resolve(solicitud.result as File | undefined);
    solicitud.onerror = () => reject(solicitud.error);
  });
  db.close();
  return archivo;
}

async function eliminarArchivo(clave: string) {
  const db = await abrirAlmacen();
  await new Promise<void>((resolve, reject) => {
    const transaccion = db.transaction("archivos", "readwrite");
    transaccion.objectStore("archivos").delete(clave);
    transaccion.oncomplete = () => resolve();
    transaccion.onerror = () => reject(transaccion.error);
  });
  db.close();
}

export const guardarArchivoSolicitudImagen = (id: string, archivo: File) =>
  guardarArchivo(`solicitud-imagen:${id}`, archivo);
export const obtenerArchivoSolicitudImagen = (id: string) =>
  obtenerArchivo(`solicitud-imagen:${id}`);
export const eliminarArchivoSolicitudImagen = (id: string) =>
  eliminarArchivo(`solicitud-imagen:${id}`);
export const eliminarArchivoEstudioDemo = (id: string) => eliminarArchivo(id);
export const guardarInformeSolicitudImagen = (id: string, archivo: File) =>
  guardarArchivo(`solicitud-informe:${id}`, archivo);
export const obtenerInformeSolicitudImagen = (id: string) =>
  obtenerArchivo(`solicitud-informe:${id}`);
export const eliminarInformeSolicitudImagen = (id: string) =>
  eliminarArchivo(`solicitud-informe:${id}`);
