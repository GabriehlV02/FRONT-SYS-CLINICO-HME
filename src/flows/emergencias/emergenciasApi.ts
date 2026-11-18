import { apiFetch } from "../../radius/api";

export type ItemEmergencia = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "servicio" | "producto";
  unidad: string;
  precio: number;
  categoria?: string;
  grupo?: string;
};
export type OrdenEmergencia = {
  id: string;
  revision: number;
  fecha: string;
  usuario: string;
  autorTipo?: "medico" | "otro";
  tipo: string;
  titulo: string;
  indicaciones: string;
  dosis: string;
  via: string;
  frecuencia: string;
  duracion: string;
  itemId: string;
  porHora: boolean;
  estado: "pendiente" | "en_curso" | "aplicada" | "cancelada";
  aplicaciones: {
    id: string;
    fecha: string;
    usuario: string;
    observacion: string;
    consumoId?: string;
  }[];
  historial: { fecha: string; usuario: string; detalle: string }[];
};
export type CuentaEmergencia = {
  id: string;
  pacienteId?: string | null;
  cubiculo: string;
  inicio: string;
  fin: string | null;
  revision: number;
  identidad: Record<string, string> | null;
  signos: {
    id: string;
    fecha: string;
    valores: Record<string, string | number>;
    mediciones?: {
      id: string;
      nombre: string;
      unidad: string;
      valor: string | number;
    }[];
    observacion: string;
  }[];
  consumos: (ItemEmergencia & {
    itemId?: string;
    registroId: string;
    cantidad: number;
    porHora: boolean;
    inicio: string;
    fin: string | null;
    tiempoAcumuladoMs?: number;
    ordenId?: string;
  })[];
  evaluaciones?: {
    id?: string;
    autorId?: string | null;
    autorTipo?: "medico" | "otro";
    revision: number;
    fecha: string;
    usuario: string;
    campos: Record<string, string>;
    historialEdiciones?: { fecha: string; usuario: string; campos: Record<string, string> }[];
    editadoEn?: string;
    editadoPor?: string;
  }[];
  ordenes?: OrdenEmergencia[];
  registrosEnfermeria?: RegistroEnfermeria[];
  balanceHidrico?: { id: string; cuentaId: string; tipo: "ingreso" | "egreso"; volumen: number; detalle: string; anotacion?: string | null; fecha: string; hora: string }[];
  trasladoAmbulancia?: { fecha: string; hora: string; motivo: string; destino: string } | null;
  cierre?: {
    condicionEgreso: "vivo" | "muerto";
    causaEgreso:
      | "hospitalaria"
      | "solicitada"
      | "fuga"
      | "transferencia"
      | "deceso"
      | "internacion";
    observacionEgreso?: string;
    fecha: string;
    usuario: string;
  } | null;
};
export type RegistroEnfermeria = {
  id: string;
  fecha: string;
  hora?: string;
  usuario: string;
  tipo: "cuidado" | "procedimiento" | "insumo";
  ordenId?: string;
  detalle: string;
  cantidad?: number | null;
  unidad?: string;
  observacion?: string;
};
const lecturasEnCurso = new Map<string, Promise<unknown>>();
const cacheLecturas = new Map<string, { expira: number; valor: unknown }>();
const ttlLecturaMs = 2_000;

function claveLectura(ruta: string) {
  return `emergencias:${ruta || "cuentas"}`;
}

export function invalidarCacheEmergencias() {
  cacheLecturas.clear();
}

async function solicitarEmergencias<T>(ruta = "", body?: object): Promise<T> {

  const respuesta = await apiFetch(
    `/api/emergencias${ruta}`,
    body ? { method: "POST", body: JSON.stringify(body) } : {},
  );
  const contenido = await respuesta.text();
  let datos: unknown = null;
  try {
    datos = contenido ? JSON.parse(contenido) : null;
  } catch {
    if (respuesta.ok)
      throw new Error(
        "El servicio de emergencias devolvió una respuesta no válida.",
      );
  }
  if (!respuesta.ok) {
    const error = datos as { message?: string; errors?: Record<string, string[]> } | null;
    const detalle = error?.errors && Object.values(error.errors).flat().find((mensaje) => typeof mensaje === "string");
    throw new Error(detalle || error?.message || "El servicio de emergencias no está disponible.");
  }
  if (datos === null)
    throw new Error("El servicio de emergencias respondió sin información.");
  return datos as T;
}

/** Comparte solicitudes iguales y conserva lecturas brevemente para evitar recargas duplicadas al navegar. */
export async function apiEmergencias<T>(ruta = "", body?: object): Promise<T> {
  if (body) {
    const resultado = await solicitarEmergencias<T>(ruta, body);
    invalidarCacheEmergencias();
    return resultado;
  }

  const clave = claveLectura(ruta);
  const cacheada = cacheLecturas.get(clave);
  if (cacheada && cacheada.expira > Date.now()) return cacheada.valor as T;
  const pendiente = lecturasEnCurso.get(clave);
  if (pendiente) return pendiente as Promise<T>;

  const solicitud = solicitarEmergencias<T>(ruta)
    .then((valor) => {
      cacheLecturas.set(clave, { valor, expira: Date.now() + ttlLecturaMs });
      return valor;
    })
    .finally(() => lecturasEnCurso.delete(clave));
  lecturasEnCurso.set(clave, solicitud);
  return solicitud;
}
export const nombrePaciente = (c: CuentaEmergencia) =>
  [c.identidad?.nombres, c.identidad?.apellidos].filter(Boolean).join(" ") ||
  "Paciente sin identificar";
export const fechaEmergencia = (v: string) =>
  new Date(v).toLocaleString("es-BO");
export const camposEvaluacion = [
  ["motivoConsulta", "Motivo de consulta"],
  ["enfermedadActual", "Enfermedad actual"],
  ["antecedentesNoPatologicos", "Antecedentes personales no patológicos"],
  ["antecedentesPatologicos", "Antecedentes personales patológicos"],
  ["antecedentesFamiliares", "Antecedentes familiares"],
  ["antecedentesGineco", "Antecedentes ginecoobstétricos"],
  ["examenGeneral", "Examen físico general"],
  ["cabeza", "Examen regional · Cabeza"],
  ["ojos", "Examen regional · Ojos"],
  ["oidos", "Examen regional · Oídos"],
  ["nariz", "Examen regional · Nariz"],
  ["boca", "Examen regional · Boca"],
  ["cuello", "Examen regional · Cuello"],
  ["torax", "Examen regional · Tórax"],
  ["respiratorio", "Examen regional · Respiratorio"],
  ["cardiovascular", "Examen regional · Cardiovascular"],
  ["pulsos", "Examen regional · Pulsos arteriales"],
  ["abdomen", "Examen regional · Abdomen"],
  ["extremidades", "Examen regional · Extremidades"],
  ["genitalesPerine", "Examen regional · Genitales y periné"],
  ["neurologico", "Examen neurológico"],
  [
    "examenesComplementarios",
    "Exámenes complementarios solicitados / revisados",
  ],
  ["impresionDiagnostica", "Impresión diagnóstica"],
  ["tratamiento", "Tratamiento indicado / realizado"],
];
export const camposIdentidad = [
  ["nombres", "Nombres"],
  ["apellidos", "Apellidos"],
  ["documento", "Documento"],
  ["nacimiento", "Fecha de nacimiento"],
  ["sexo", "Sexo"],
  ["procedencia", "Procedencia"],
  ["telefono", "Teléfono"],
  ["direccion", "Dirección"],
  ["profesion", "Profesión / ocupación"],
  ["familiar", "Familiar / acompañante"],
  ["parentesco", "Parentesco"],
  ["referenciaFamiliar", "Número de referencia"],
  ["telefonoFamiliar", "Teléfono del acompañante"],
  ["documentoFamiliar", "Documento del acompañante"],
];
export const tiposOrden = [
  ["medicamento", "Medicamento / receta"],
  ["servicio", "Servicio / procedimiento"],
  ["laboratorio", "Laboratorio"],
  ["imagenologia", "Imagenología"],
  ["internacion", "Internación"],
  ["cuidado", "Cuidado / indicación general"],
];
