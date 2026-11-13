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
