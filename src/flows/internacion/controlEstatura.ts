import type { TomaSignosInternacion } from "./registroInternaciones";

function fechaCalendario(valor: string) {
  const dia = valor.slice(0, 10);
  const fecha = new Date(dia + "T00:00:00Z");
  return /^\d{4}-\d{2}-\d{2}$/.test(dia) &&
    Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === dia ? dia : null;
}

function aniversario(fecha: string, anios: number) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(anio + anios, mes, 0)).getUTCDate();
  return new Date(Date.UTC(anio + anios, mes - 1, Math.min(dia, ultimoDia))).toISOString().slice(0, 10);
}

export function controlEstatura(nacimiento: string, fechaMedicion: string, signos: readonly TomaSignosInternacion[]) {
  const fecha = fechaCalendario(fechaMedicion);
  const fechaNacimiento = fechaCalendario(nacimiento);
  const adulto = Boolean(fecha && fechaNacimiento && fecha >= aniversario(fechaNacimiento, 18));
  const ultima = signos.reduce<{ fecha: string; estatura: string } | null>((resultado, toma) => {
    const fecha = fechaCalendario(toma.fecha);
    const estatura = toma.valores?.estatura;
    if (!fecha || !estatura || !Number.isFinite(Number(estatura)) || Number(estatura) <= 0) return resultado;
    return !resultado || fecha >= resultado.fecha ? { fecha, estatura } : resultado;
  }, null);
  const siguiente = adulto && ultima ? aniversario(ultima.fecha, 1) : null;
  return { adulto, ultima, siguiente, medir: !siguiente || Boolean(fecha && fecha >= siguiente) };
}
