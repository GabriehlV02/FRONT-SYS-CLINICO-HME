export type EstadoInternacion = "preinternacion" | "confirmada" | "alta";

export type RegistroInternacion = {
  id: string;
  pacienteId?: string;
  profesionalId?: string;
  paciente: string;
  ci: string;
  medico: string;
  motivo: string;
  fecha: string;
  estado: EstadoInternacion;
  sala?: string;
  cama?: string;
  tipoSala?: string;
  datosPaciente?: Record<string, string>;
  fechaIngreso?: string;
  horaIngreso?: string;
  origen?: string;
  servicio?: string;
  observaciones?: string;
  fechaAlta?: string;
};

const clave = "hme:internaciones";
const evento = "internacion:actualizada";
let cache: RegistroInternacion[] | null = null;
const ejemplosConfirmados: RegistroInternacion[] = [
  {
    id: "INT-DEMO-108B", paciente: "Luis Esteban Escobar Rocha", ci: "9392922", medico: "Dra. Valeria Quiroga", motivo: "Neumonía adquirida en comunidad", fecha: "04/11/2026", fechaIngreso: "04/11/2026", horaIngreso: "09:20", estado: "confirmada", sala: "108", cama: "B", tipoSala: "Sala compartida", servicio: "Medicina interna",
    datosPaciente: { responsableNombre: "María Elena Rocha Vargas · Madre", responsableTelefono: "72014568", responsableCi: "4578921", responsableDireccion: "Zona Miraflores, La Paz" },
  },
  {
    id: "INT-DEMO-204A", paciente: "Mariana Flores Cárdenas", ci: "7845126", medico: "Dr. Daniel Siles", motivo: "Control postoperatorio de colecistectomía", fecha: "05/11/2026", fechaIngreso: "05/11/2026", horaIngreso: "11:40", estado: "confirmada", sala: "204", cama: "A", tipoSala: "Sala quirúrgica", servicio: "Cirugía general",
    datosPaciente: { responsableNombre: "Jorge Flores Cárdenas · Hermano", responsableTelefono: "76543210", responsableCi: "6123456", responsableDireccion: "Sopocachi, La Paz" },
  },
  {
    id: "INT-DEMO-110A", paciente: "Carlos Andrés Mamani Quispe", ci: "6978314", medico: "Dra. Paula Ríos", motivo: "Descompensación diabética", fecha: "06/11/2026", fechaIngreso: "06/11/2026", horaIngreso: "07:55", estado: "confirmada", sala: "110", cama: "A", tipoSala: "Sala compartida", servicio: "Medicina interna",
    datosPaciente: { responsableNombre: "Elena Quispe Choque · Esposa", responsableTelefono: "70128394", responsableCi: "5567812", responsableDireccion: "Villa Fátima, La Paz" },
  },
  {
    id: "INT-DEMO-302C", paciente: "Sofía Belén Vargas Arce", ci: "8246153", medico: "Dr. Mauricio Fernández", motivo: "Observación por crisis asmática", fecha: "06/11/2026", fechaIngreso: "06/11/2026", horaIngreso: "14:10", estado: "confirmada", sala: "302", cama: "C", tipoSala: "Sala de observación", servicio: "Neumología",
    datosPaciente: { responsableNombre: "Rosa Arce Vargas · Madre", responsableTelefono: "68923451", responsableCi: "4987612", responsableDireccion: "Obrajes, La Paz" },
  },
];

export function obtenerEjemplosInternacion(): RegistroInternacion[] {
  return ejemplosConfirmados.map((registro) => ({
    ...registro,
    datosPaciente: { ...registro.datosPaciente },
  }));
}

function disponible() {
  return typeof window !== "undefined";
}

export function leerInternaciones(): RegistroInternacion[] {
  if (cache) return cache;
  if (!disponible()) return (cache = []);
  try {
    const guardadas = JSON.parse(window.localStorage.getItem(clave) ?? "[]");
    return (cache = Array.isArray(guardadas) ? guardadas : []);
  } catch {
    return (cache = []);
  }
}

function guardar(registros: RegistroInternacion[]) {
  cache = registros;
  window.localStorage.setItem(clave, JSON.stringify(cache));
  window.dispatchEvent(new Event(evento));
}

const normalizarCi = (ci: string) =>
  ci
    .trim()
    .replace(/[\s-]+/g, "")
    .toLocaleUpperCase("es");

export function pacienteDisponible(ci: string, exceptoId = "") {
  const documento = normalizarCi(ci);
  return (
    documento !== "" &&
    !leerInternaciones().some(
      (item) =>
        item.id !== exceptoId &&
        item.estado !== "alta" &&
        normalizarCi(item.ci) === documento,
    )
  );
}

export function crearPreinternacion(
  datos: Omit<RegistroInternacion, "id" | "fecha" | "estado">,
) {
  if (!pacienteDisponible(datos.ci))
    throw new Error(
      "Este CI ya tiene una internación activa o pendiente. No se puede registrar al mismo paciente dos veces.",
    );
  const registro: RegistroInternacion = {
    ...datos,
    id: `PRE-${Date.now()}`,
    fecha: new Date().toLocaleDateString("es-BO"),
    estado: "preinternacion",
  };
  guardar([
    ...leerInternaciones(),
    registro,
  ]);
  return registro;
}

export function camaDisponible(sala: string, cama: string, exceptoId = "") {
  const ubicacion = `${sala.trim().toLocaleLowerCase("es")}|${cama.trim().toLocaleLowerCase("es")}`;
  return !leerInternaciones().some(
    (item) =>
      item.id !== exceptoId &&
      item.estado === "confirmada" &&
      `${item.sala?.trim().toLocaleLowerCase("es")}|${item.cama?.trim().toLocaleLowerCase("es")}` ===
        ubicacion,
  );
}

export function confirmarInternacion(
  id: string,
  asignacion: Pick<RegistroInternacion, "sala" | "cama" | "tipoSala">,
) {
  const paciente = leerInternaciones().find((item) => item.id === id);
  if (!paciente || !pacienteDisponible(paciente.ci, id))
    throw new Error(
      "Este CI ya tiene una internación activa. No se puede confirmar una segunda internación para el mismo paciente.",
    );
  if (!camaDisponible(asignacion.sala ?? "", asignacion.cama ?? "", id))
    throw new Error(
      "La sala y cama seleccionadas ya están ocupadas. Elige una ubicación libre.",
    );
  const fechaIngreso = new Date().toLocaleDateString("es-BO");
  guardar(
    leerInternaciones().map((item) =>
      item.id === id
        ? {
            ...item,
            ...asignacion,
            fechaIngreso: item.fechaIngreso ?? fechaIngreso,
            estado: "confirmada" as const,
          }
        : item,
    ),
  );
}

export function actualizarInternacion(
  id: string,
  cambios: Pick<RegistroInternacion, "sala" | "cama" | "fechaIngreso">,
) {
  if (!camaDisponible(cambios.sala ?? "", cambios.cama ?? "", id))
    throw new Error(
      "La sala y cama seleccionadas ya están ocupadas. Elige una ubicación libre.",
    );
  guardar(
    leerInternaciones().map((item) =>
      item.id === id && item.estado === "confirmada"
        ? { ...item, ...cambios }
        : item,
    ),
  );
}

export function registrarAltaInternacion(id: string) {
  const fechaAlta = new Date().toLocaleDateString("es-BO");
  guardar(
    leerInternaciones().map((item) =>
      item.id === id && item.estado === "confirmada"
        ? { ...item, estado: "alta" as const, fechaAlta }
        : item,
    ),
  );
}

export function suscribirInternaciones(actualizar: () => void) {
  if (!disponible()) return () => undefined;
  const manejar = () => {
    cache = null;
    actualizar();
  };
  window.addEventListener(evento, manejar);
  window.addEventListener("storage", manejar);
  return () => {
    window.removeEventListener(evento, manejar);
    window.removeEventListener("storage", manejar);
  };
}
