const fechaBolivia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/La_Paz",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function fechaISOEnBolivia(fecha: Date = new Date()): string {
  if (Number.isNaN(fecha.getTime())) return "";
  const partes = fechaBolivia.formatToParts(fecha);
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((item) => item.type === tipo)?.value || "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}
