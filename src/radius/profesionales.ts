import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api";

export type Profesional = {
  id: string;
  nombres: string;
  apellidos: string;
  nombre: string;
  tipo: "Médico/a" | "Enfermero/a" | "Otro profesional";
  especialidades: string[];
  rol: string;
  matricula: string | null;
  telefono: string | null;
  usuario_id: string | null;
  activo: boolean;
  horario?: string;
};

export const etiquetaProfesional = (profesional: Profesional) =>
  `${profesional.nombre} · ${profesional.horario || profesional.matricula || profesional.id.slice(0, 8)}`;

export function useProfesionales() {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [errorProfesionales, setErrorProfesionales] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/v1/profesionales", { signal: controller.signal })
      .then(async respuesta => {
        if (!respuesta.ok) throw new Error("No se pudieron cargar los profesionales registrados.");
        const resultado = await respuesta.json() as { data: Profesional[] };
        if (!Array.isArray(resultado.data)) throw new Error("El catálogo de profesionales no está disponible.");
        return resultado.data;
      })
      .then(datos => { if (!controller.signal.aborted) { setProfesionales(datos.filter(p => p.activo)); setErrorProfesionales(""); } })
      .catch((error: unknown) => { if (!controller.signal.aborted) { setProfesionales([]); setErrorProfesionales(error instanceof Error ? error.message : "No se pudieron cargar los profesionales."); } });
    return () => controller.abort();
  }, []);
  const medicos = useMemo(() => profesionales.filter(p => p.tipo === "Médico/a"), [profesionales]);
  const enfermeria = useMemo(() => profesionales.filter(p => p.tipo === "Enfermero/a"), [profesionales]);
  const resolver = (valor: string) => profesionales.find(p => p.id === valor || etiquetaProfesional(p) === valor);
  return { profesionales, medicos, enfermeria, errorProfesionales, resolver };
}
