export type PacienteDemo = {
  id: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  sexo: string;
  telefono: string;
  direccion: string;
  sucursal?: string;
  creadoEn: string;
  complementoCi?: string;
  expedidoEn?: string;
  nit?: string;
  razonSocial?: string;
  pais?: string;
  departamento?: string;
  ciudad?: string;
  zonaBarrio?: string;
  ciConQr?: boolean;
  responsableNombre?: string;
  responsableCi?: string;
  responsableTelefono?: string;
  responsableParentesco?: string;
  comoSeEntero?: string;
  observaciones?: string;
  habilitado?: boolean;
};
export type EstudioDemo = {
  id: string;
  pacienteId: string;
  paciente: string;
  titulo: string;
  categoria: string;
  descripcion: string;
  nombreArchivo: string;
  mime: string;
  archivoUrl?: string;
  creadaEn: string;
};
export type InformeDemo = {
  pacienteId: string;
  nombreArchivo: string;
  mime: string;
  creadoEn: string;
};
export type MovimientoPacienteDemo = {
  id: string;
  pacienteId: string;
  tipo: "consumo" | "pago";
  concepto: string;
  categoria: string;
  fecha: string;
  importe: number;
  metodoPago?: string;
  desglosePagos?: { metodo: string; importe: number }[];
  referencia?: string;
};
export type FamiliarPacienteDemo = {
  pacienteId: string;
  familiarId: string;
  parentesco: string;
  vinculadoEn: string;
};

const PACIENTES = "pulso_local_pacientes_v1",
  ESTUDIOS = "pulso_local_estudios_v1",
  SELECCION = "radiuus_estudio_seleccionado",
  INFORMES = "pulso_local_informes_v1",
  MUESTRA_PACIENTES = "pulso_local_pacientes_muestra_v1";
const HISTORIAL_PACIENTES = "pulso_local_historial_pacientes_v1";
const FAMILIARES_PACIENTES = "pulso_local_familiares_pacientes_v1";
export function obtenerHistorialPacienteDemo(
  pacienteId: string,
): MovimientoPacienteDemo[] {
  const historial = leer<MovimientoPacienteDemo[]>(HISTORIAL_PACIENTES, []);
  const iniciales =
    [] as MovimientoPacienteDemo[];
  const combinadosBase = [
    ...iniciales.filter(
      (movimiento) => !historial.some((guardado) => guardado.id === movimiento.id),
    ),
    ...historial,
  ];
  const combinados = combinadosBase.map((movimiento) => {
    const inicial = iniciales.find((item) => item.id === movimiento.id);
    return !movimiento.desglosePagos && inicial?.desglosePagos
      ? { ...movimiento, desglosePagos: inicial.desglosePagos }
      : movimiento;
  });
  if (
    combinados.length !== historial.length ||
    combinados.some((movimiento) => {
      const anterior = historial.find((item) => item.id === movimiento.id);
      return anterior && JSON.stringify(anterior) !== JSON.stringify(movimiento);
    })
  ) {
    localStorage.setItem(HISTORIAL_PACIENTES, JSON.stringify(combinados));
  }
  return combinados
    .filter((movimiento) => movimiento.pacienteId === pacienteId)
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
}

export function obtenerFamiliaresPacienteDemo(
  pacienteId: string,
): FamiliarPacienteDemo[] {
  try {
    const vinculos = JSON.parse(
      localStorage.getItem(FAMILIARES_PACIENTES) || "[]",
    ) as FamiliarPacienteDemo[];
    return vinculos.filter((vinculo) => vinculo.pacienteId === pacienteId);
  } catch {
    return [];
  }
}

export function vincularFamiliarPacienteDemo(
  pacienteId: string,
  familiarId: string,
  parentesco: string,
): FamiliarPacienteDemo[] {
  if (pacienteId === familiarId)
    throw new Error("El paciente no puede vincularse consigo mismo.");
  const guardados = JSON.parse(
    localStorage.getItem(FAMILIARES_PACIENTES) || "[]",
  ) as FamiliarPacienteDemo[];
  if (
    guardados.some(
      (vinculo) =>
        vinculo.pacienteId === pacienteId && vinculo.familiarId === familiarId,
    )
  )
    throw new Error("Este familiar ya está vinculado a la ficha.");
  const siguientes = [
    ...guardados,
    { pacienteId, familiarId, parentesco, vinculadoEn: new Date().toISOString() },
  ];
  localStorage.setItem(FAMILIARES_PACIENTES, JSON.stringify(siguientes));
  window.dispatchEvent(new Event("radiuus:datos-demo"));
  return obtenerFamiliaresPacienteDemo(pacienteId);
}
function leer<T>(clave: string, inicial: T): T {
  try {
    const valor = localStorage.getItem(clave);
    if (valor) return JSON.parse(valor) as T;
    localStorage.setItem(clave, JSON.stringify(inicial));
  } catch {}
  return inicial;
}
export const obtenerPacientes = () => leer<PacienteDemo[]>(PACIENTES, []).filter((p) => !p.id.startsWith("demo-"));
export const guardarPacientes = (datos: PacienteDemo[]) => {
  localStorage.setItem(PACIENTES, JSON.stringify(datos));
  window.dispatchEvent(new Event("radiuus:datos-demo"));
};
export const obtenerEstudios = () => leer<EstudioDemo[]>(ESTUDIOS, []).filter((e) => !e.id.startsWith("demo-"));
export const guardarEstudios = (datos: EstudioDemo[]) => {
  localStorage.setItem(ESTUDIOS, JSON.stringify(datos));
  window.dispatchEvent(new Event("radiuus:datos-demo"));
};
export const seleccionarEstudio = (id: string) => {
  localStorage.setItem(SELECCION, id);
  const estudio = obtenerEstudios().find((item) => item.id === id);
  const destino =
    estudio?.categoria === "Tomografía"
      ? "visor-tomografias"
      : estudio?.categoria === "Ecografía"
        ? "visor-ecografias"
        : estudio?.categoria === "Ecocardiograma"
          ? "visor-ecocardiogramas"
          : "visor-radiografias";
  window.dispatchEvent(new CustomEvent("radiuus:navegar", { detail: destino }));
};
export const obtenerEstudioSeleccionado = () => {
  const id = localStorage.getItem(SELECCION);
  return obtenerEstudios().find((e) => e.id === id) || null;
};

const abrirDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const solicitud = indexedDB.open("pulso-local", 1);
    solicitud.onupgradeneeded = () =>
      solicitud.result.createObjectStore("archivos");
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
export async function guardarArchivoEstudio(id: string, archivo: File) {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("archivos", "readwrite");
    tx.objectStore("archivos").put(archivo, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export const obtenerInformes = () =>
  leer<Record<string, InformeDemo>>(INFORMES, {});
export async function guardarInformePaciente(
  pacienteId: string,
  archivo: File,
) {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("archivos", "readwrite");
    tx.objectStore("archivos").put(archivo, `informe:${pacienteId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  const informes = obtenerInformes(),
    informe: InformeDemo = {
      pacienteId,
      nombreArchivo: archivo.name,
      mime: archivo.type,
      creadoEn: new Date().toISOString(),
    };
  informes[pacienteId] = informe;
  localStorage.setItem(INFORMES, JSON.stringify(informes));
  return informe;
}
export async function obtenerArchivoInforme(pacienteId: string) {
  const db = await abrirDb();
  const archivo = await new Promise<File | undefined>((resolve, reject) => {
    const tx = db.transaction("archivos", "readonly"),
      solicitud = tx.objectStore("archivos").get(`informe:${pacienteId}`);
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
  db.close();
  if (!archivo)
    throw new Error("El archivo del informe ya no está disponible.");
  return archivo;
}
export async function obtenerArchivoEstudio(estudio: EstudioDemo) {
  if (estudio.archivoUrl) {
    const respuesta = await fetch(estudio.archivoUrl);
    if (!respuesta.ok)
      throw new Error("No se encontró el archivo de demostración.");
    return new File([await respuesta.blob()], estudio.nombreArchivo, {
      type: estudio.mime,
    });
  }
  const db = await abrirDb();
  const archivo = await new Promise<File | undefined>((resolve, reject) => {
    const tx = db.transaction("archivos", "readonly"),
      solicitud = tx.objectStore("archivos").get(estudio.id);
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
  db.close();
  if (!archivo)
    throw new Error(
      "El archivo local ya no está disponible. Vuelve a cargarlo.",
    );
  return archivo;
}
