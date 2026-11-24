import { useEffect, useState } from "react";

const milisegundosPorDia = 86_400_000;
const calendarioHospital = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/La_Paz",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

function fechaHospital(fecha: Date) {
  const partes = Object.fromEntries(calendarioHospital.formatToParts(fecha).map(({ type, value }) => [type, Number(value)]));
  return { dia: Date.UTC(partes.year, partes.month - 1, partes.day), hora: partes.hour };
}

function diaIngreso(fecha: string) {
  const iso = fecha.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/);
  const local = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!iso && !local) return null;

  if (iso && /[T ].*(?:Z|[+-]\d{2}:?\d{2})$/i.test(fecha)) {
    const instante = new Date(fecha);
    return Number.isNaN(instante.getTime()) ? null : fechaHospital(instante).dia;
  }

  const [anio, mes, dia] = (iso ? iso.slice(1) : local!.slice(1).reverse()).map(Number);
  const marca = Date.UTC(anio, mes - 1, dia);
  const comprobacion = new Date(marca);
  return comprobacion.getUTCFullYear() === anio && comprobacion.getUTCMonth() + 1 === mes &&
    comprobacion.getUTCDate() === dia ? marca : null;
}

export function calcularDiasInternacion(ingreso: string, ahora: Date): number | null {
  const inicio = diaIngreso(ingreso.trim());
  if (inicio === null) return null;
  const { dia, hora } = fechaHospital(ahora);
  return Math.max(0, (dia - inicio) / milisegundosPorDia - (hora < 12 ? 1 : 0));
}

export function useDiasInternacion(ingreso: string) {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    let temporizador: number;
    function actualizar() {
      window.clearTimeout(temporizador);
      setAhora(new Date());
      temporizador = window.setTimeout(actualizar, 60_000 - Date.now() % 60_000);
    }
    actualizar();
    window.addEventListener("focus", actualizar);
    return () => {
      window.clearTimeout(temporizador);
      window.removeEventListener("focus", actualizar);
    };
  }, []);

  const dias = calcularDiasInternacion(ingreso, ahora);
  return dias === null ? "Sin registro" : dias === 1 ? "1 día" : `${dias} días`;
}
