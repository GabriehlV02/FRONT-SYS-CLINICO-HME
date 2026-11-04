import { apiFetch } from '../../api';
import type { PacienteDemo } from '../../datos/almacenDemo';
import type { PacienteRegistrado } from './ModalRegistroPaciente';

export function pacienteParaVista(paciente: PacienteRegistrado): PacienteDemo {
  const responsable = paciente.responsables?.[0];
  const admision = paciente.registros_admision?.[0];
  return {
    id: paciente.id,
    nombres: paciente.nombres,
    primerApellido: paciente.apellido_paterno,
    segundoApellido: paciente.apellido_materno,
    tipoDocumento: 'CI',
    numeroDocumento: paciente.ci,
    fechaNacimiento: paciente.fecha_nacimiento.slice(0, 10),
    sexo: paciente.genero.toLocaleLowerCase('es').replaceAll(' ', '_'),
    telefono: paciente.telefono || '',
    direccion: [paciente.ciudad, paciente.zona_barrio, paciente.direccion_domicilio].filter(Boolean).join(', '),
    creadoEn: paciente.created_at || '',
    complementoCi: paciente.complemento_ci || '', expedidoEn: paciente.expedido_en || '', nit: paciente.nit || '', razonSocial: paciente.razon_social || '', ciConQr: Boolean(paciente.ci_con_qr),
    pais: paciente.pais || '', departamento: paciente.departamento || '', ciudad: paciente.ciudad || '', zonaBarrio: paciente.zona_barrio || '',
    responsableNombre: responsable?.nombre_completo || '', responsableCi: responsable?.ci || '', responsableTelefono: responsable?.telefono || '', responsableParentesco: responsable?.parentesco || '',
    comoSeEntero: admision?.como_se_entero || '', observaciones: admision?.observaciones || '', habilitado: admision?.habilitado,
  };
}

export async function listarFichasPacientes(signal?: AbortSignal): Promise<PacienteRegistrado[]> {
  const pacientes: PacienteRegistrado[] = [];
  let pagina = 1;
  let ultimaPagina = 1;
  do {
    const respuesta = await apiFetch(`/api/v1/pacientes?por_pagina=100&page=${pagina}`, { signal, headers: { Accept: 'application/json' } });
    if (!respuesta.ok) throw new Error('No se pudo cargar el listado de pacientes. Intenta nuevamente.');
    const cuerpo = await respuesta.json() as { data: PacienteRegistrado[]; last_page: number };
    if (!Array.isArray(cuerpo.data) || !Number.isInteger(cuerpo.last_page)) throw new Error('El servidor devolvió un listado de pacientes inválido.');
    pacientes.push(...cuerpo.data);
    ultimaPagina = cuerpo.last_page;
    pagina++;
  } while (pagina <= ultimaPagina);
  return pacientes;
}

export async function listarPacientes(signal?: AbortSignal): Promise<PacienteDemo[]> {
  return (await listarFichasPacientes(signal)).map(pacienteParaVista);
}

export const nombrePacienteClinico = (p: PacienteRegistrado) => [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ');
export function edadPaciente(fecha: string): number {
  const nacimiento = new Date(fecha.slice(0, 10) + 'T12:00:00');
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  if (hoy.getMonth() < nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())) edad--;
  return Math.max(0, edad);
}
