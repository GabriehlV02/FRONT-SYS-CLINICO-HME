export type EstadoMaterial =
  "pendiente" | "sucio" | "esterilizacion" | "limpio" | "reservado" | "cirugia";
export type MaterialEsteril = {
  id: string;
  codigo: string;
  nombre: string;
  lote?: string;
  medida?: string;
  cuentaConLogo?: boolean;
  cantidad?: number;
  imagen?: string;
  tieneImagen?: boolean;
  tipo: string;
  marca: string;
  serie: string;
  sector: string;
  descripcion: string;
  estado: EstadoMaterial;
  cirugiaId: string;
  actualizadoEn: string;
};
export type KitEsteril = {
  id: string;
  nombre: string;
  descripcion: string;
  especialidades?: string[];
  materialIds: string[];
};
export type MovimientoEsteril = {
  id: string;
  materialId: string;
  desde: EstadoMaterial | "registro";
  hacia: EstadoMaterial;
  cirugiaId: string;
  fecha: string;
};
export type RecepcionMaterialSucio = {
  id: string;
  materialId: string;
  kitId: string;
  entregadoPor: string;
  uso: string;
  fecha: string;
};
export type EstadoEsterilizacion = {
  materiales: MaterialEsteril[];
  kits: KitEsteril[];
  movimientos: MovimientoEsteril[];
  recepciones: RecepcionMaterialSucio[];
};

export const ETIQUETAS_ESTADO: Record<EstadoMaterial, string> = {
  pendiente: "Pendiente de esterilización",
  sucio: "Sucio",
  esterilizacion: "En esterilización",
  limpio: "Limpio y disponible",
  reservado: "Reservado",
  cirugia: "En cirugía",
};

export const SIGUIENTES_ESTADOS: Record<EstadoMaterial, EstadoMaterial[]> = {
  pendiente: ["esterilizacion"],
  sucio: ["esterilizacion"],
  esterilizacion: ["limpio"],
  limpio: ["reservado", "esterilizacion"],
  reservado: ["cirugia", "limpio"],
  cirugia: ["sucio"],
};

const CLAVE = "hme-esterilizacion-v1";
const VACIO: EstadoEsterilizacion = {
  materiales: [],
  kits: [],
  movimientos: [],
  recepciones: [],
};
export function leerEsterilizacion(): EstadoEsterilizacion {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === null) return VACIO;
    const datos: unknown = JSON.parse(guardado);
    if (!datos || typeof datos !== "object") return VACIO;
    const estado = datos as Partial<EstadoEsterilizacion>;
    return {
      materiales: Array.isArray(estado.materiales) ? estado.materiales.filter(item => !item.id.startsWith("demo-material-")) : [],
      kits: Array.isArray(estado.kits) ? estado.kits.filter(item => !item.id.startsWith("demo-kit-")) : [],
      movimientos: Array.isArray(estado.movimientos) ? estado.movimientos.filter(item => !item.id.startsWith("demo-") && !item.materialId.startsWith("demo-material-")) : [],
      recepciones: Array.isArray(estado.recepciones) ? estado.recepciones.filter(item => !item.id.startsWith("demo-") && !item.materialId.startsWith("demo-material-")) : [],
    };
  } catch {
    return VACIO;
  }
}

export function guardarEsterilizacion(estado: EstadoEsterilizacion): void {
  localStorage.setItem(CLAVE, JSON.stringify(estado));
  window.dispatchEvent(new Event("hme:esterilizacion:actualizado"));
}
