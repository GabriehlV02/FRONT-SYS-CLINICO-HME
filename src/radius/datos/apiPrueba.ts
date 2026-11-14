import { obtenerPacientes, guardarPacientes } from "./almacenDemo";
import { obtenerCitasAgendaDemo } from "./agendaDemo";
import type { PacienteRegistrado } from "../vistas/pacientes/ModalRegistroPaciente";

const responder = (datos: unknown, status = 200) => Response.json(datos, { status });

/** Respuestas locales explícitas para desarrollar los flujos sin escribir fichas ficticias en el servidor. */
export async function respuestaPrueba(input: string, init: RequestInit): Promise<Response | null> {
  const url = new URL(input, window.location.origin);
  const metodo = (init.method || "GET").toUpperCase();
  init.signal?.throwIfAborted();
  if (metodo === "GET" && url.pathname === "/api/citas") return responder(obtenerCitasAgendaDemo());
  const rutaCita = url.pathname.match(/^\/api\/v1\/citas\/([^/]+)\/(atencion|historial|signos-vitales)$/);
  const citaDemo = rutaCita && obtenerCitasAgendaDemo().find((cita) => cita.id === decodeURIComponent(rutaCita[1]));
  if (rutaCita && citaDemo) {
    const clave = `hme:api-prueba:${citaDemo.id}`;
    const leer = <T,>(seccion: string, inicial: T): T => {
      try {
        return JSON.parse(localStorage.getItem(`${clave}:${seccion}`) || "null") ?? inicial;
      } catch {
        return inicial;
      }
    };
    if (rutaCita[2] === "historial" && metodo === "GET") return responder({ data: [] });
    if (rutaCita[2] === "atencion" && metodo === "GET") return responder({ data: leer("atencion", null) });
    if (rutaCita[2] === "signos-vitales" && metodo === "GET") return responder({ data: leer("signos-vitales", { id: null, valores: {} }) });
    if (typeof init.body === "string" && rutaCita[2] === "atencion" && metodo === "PUT") {
      const solicitud = JSON.parse(init.body) as { finalizar?: boolean; contenido?: Record<string, unknown> };
      const anterior = leer<{ version: number; finalizadaEn: string | null; contenido: Record<string, unknown> } | null>("atencion", null);
      const atencion = {
        version: (anterior?.version ?? 0) + 1,
        finalizadaEn: solicitud.finalizar ? new Date().toISOString() : anterior?.finalizadaEn ?? null,
        contenido: solicitud.contenido ?? anterior?.contenido ?? {},
      };
      localStorage.setItem(`${clave}:atencion`, JSON.stringify(atencion));
      return responder({ data: atencion });
    }
    if (typeof init.body === "string" && rutaCita[2] === "signos-vitales" && metodo === "POST") {
      const solicitud = JSON.parse(init.body) as { valores?: Record<string, string> };
      const resultado = {
        id: `${citaDemo.id}:signos-vitales`,
        valores: solicitud.valores ?? {},
      };
      localStorage.setItem(`${clave}:signos-vitales`, JSON.stringify(resultado));
      return responder({ data: resultado });
    }
  }
  if (metodo === "GET" && url.pathname === "/api/v1/profesionales") {
    return responder({ data: [{
      id: "prueba-profesional-1", nombres: "Médico", apellidos: "de prueba", nombre: "Administrador temporal",
      tipo: "Médico/a", especialidades: ["Medicina general"], rol: "Médico", matricula: "PRUEBA-001",
      telefono: null, usuario_id: null, activo: true,
    }] });
  }
  if (metodo === "POST" && url.pathname === "/api/v1/pacientes" && typeof init.body === "string") {
    const datos = JSON.parse(init.body) as PacienteRegistrado & {
      como_se_entero?: string; observaciones?: string; habilitado?: boolean;
    };
    const pacientes = obtenerPacientes();
    if (pacientes.some((p) => p.numeroDocumento === datos.ci)) {
      return responder({ message: "Ya existe un paciente de prueba con ese documento." }, 422);
    }
    const ficha: PacienteRegistrado = {
      ...datos, id: `prueba-clinico-nuevo-${crypto.randomUUID()}`, created_at: new Date().toISOString(),
      registros_admision: [{ como_se_entero: datos.como_se_entero, observaciones: datos.observaciones, habilitado: datos.habilitado }],
    };
    const { pacienteParaVista } = await import("../vistas/pacientes/pacientesApi");
    guardarPacientes([...pacientes, pacienteParaVista(ficha)]);
    return responder({ data: ficha }, 201);
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(metodo)) {
    return responder({ message: "Esta operación requiere el backend. Los pacientes de prueba se guardan únicamente en este navegador." }, 501);
  }
  return null;
}
