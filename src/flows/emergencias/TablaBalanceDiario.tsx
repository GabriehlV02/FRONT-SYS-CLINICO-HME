import type { ReactNode } from "react";
import "./TablaBalanceDiario.css";

type RegistroBalanceTabla = { tipo: "ingreso" | "egreso"; volumen: number; detalle: string; fecha: string; hora: string; anotacion?: string | null };
const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

const categoriasBalanceIngreso = [
  { id: "suero", etiqueta: "Suero" },
  { id: "sangre", etiqueta: "Sangre" },
  { id: "plasma", etiqueta: "Plasma" },
  { id: "viaOral", etiqueta: "Vía oral" },
  { id: "otros", etiqueta: "Otros" },
] as const;
const categoriasBalanceEgreso = [
  { id: "orina", etiqueta: "Orina" },
  { id: "vomito", etiqueta: "Vómito" },
  { id: "deposicion", etiqueta: "Deposición líquida" },
  { id: "drenajes", etiqueta: "Otros drenajes" },
] as const;
function categoriaBalance(registro: RegistroBalanceTabla) {
  const detalle = normalizar(registro.detalle.split(":")[0]).replace(/[^a-z0-9]/g, "");
  if (registro.tipo === "ingreso") {
    if (detalle.includes("sangre")) return "sangre";
    if (detalle.includes("plasma")) return "plasma";
    if (detalle.includes("oral")) return "viaOral";
    if (detalle.includes("suero") || detalle.includes("solucion") || detalle.includes("venoclisis")) return "suero";
    return "otros";
  }
  if (detalle.includes("orina") || detalle.includes("diuresis")) return "orina";
  if (detalle.includes("vomito")) return "vomito";
  if (detalle.includes("deposicion") || detalle.includes("liquida") || detalle.includes("fecal")) return "deposicion";
  return "drenajes";
}
function CeldaVolumenBalance({ registros }: { registros: RegistroBalanceTabla[] }) {
  if (!registros.length) return <span className="em-balance-celda-vacia">—</span>;
  const total = registros.reduce((suma, registro) => suma + registro.volumen, 0);
  const detalle = registros.map((registro) => registro.detalle + ": " + registro.volumen.toLocaleString("es-BO") + " ml").join("; ");
  return <span title={detalle}>{total.toLocaleString("es-BO")} ml</span>;
}
export function TablaBalanceDiario({ fecha, registros }: { fecha: string; registros: RegistroBalanceTabla[] }) {
  const fechaLegible = new Date(fecha + "T12:00:00").toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const registrosHora = (hora: number, tipo?: "ingreso" | "egreso", categoria?: string) => registros.filter((registro) =>
    Number(registro.hora.slice(0, 2)) === hora && (!tipo || registro.tipo === tipo) && (!categoria || categoriaBalance(registro) === categoria),
  );
  const registrosBloque = (inicio: number, fin: number, tipo?: "ingreso" | "egreso", categoria?: string) => registros.filter((registro) => {
    const hora = Number(registro.hora.slice(0, 2));
    return hora >= inicio && hora <= fin && (!tipo || registro.tipo === tipo) && (!categoria || categoriaBalance(registro) === categoria);
  });
  const totalVolumen = (items: RegistroBalanceTabla[]) => items.reduce((suma, registro) => suma + registro.volumen, 0);
  return (
    <section className="em-balance-dia">
      <header><h5>{fechaLegible}</h5><span>{registros.length} {registros.length === 1 ? "movimiento" : "movimientos"}</span></header>
      <div className="em-balance-dia-tabla-scroll">
        <table className="em-balance-tabla em-balance-tabla-horaria">
          <thead>
            <tr><th rowSpan={2} scope="col">Hora</th><th colSpan={6} scope="colgroup">Ingresos</th><th colSpan={5} scope="colgroup">Egresos</th></tr>
            <tr>{categoriasBalanceIngreso.map((categoria) => <th scope="col" key={categoria.id}>{categoria.etiqueta}</th>)}<th scope="col">Total</th>{categoriasBalanceEgreso.map((categoria) => <th scope="col" key={categoria.id}>{categoria.etiqueta}</th>)}<th scope="col">Total</th></tr>
          </thead>
          <tbody>{Array.from({ length: 24 }, (_, hora) => {
            const ingresosHora = registrosHora(hora, "ingreso");
            const egresosHora = registrosHora(hora, "egreso");
            const celdas = [
              ...categoriasBalanceIngreso.map((categoria) => <td key={"in-" + categoria.id}><CeldaVolumenBalance registros={registrosHora(hora, "ingreso", categoria.id)} /></td>),
              <td className="em-balance-total-hora ingreso" key="in-total"><CeldaVolumenBalance registros={ingresosHora} /></td>,
              ...categoriasBalanceEgreso.map((categoria) => <td key={"out-" + categoria.id}><CeldaVolumenBalance registros={registrosHora(hora, "egreso", categoria.id)} /></td>),
              <td className="em-balance-total-hora egreso" key="out-total"><CeldaVolumenBalance registros={egresosHora} /></td>,
            ];
            const filas: ReactNode[] = [<tr key={"hora-" + hora}><th scope="row" className="em-balance-hora">{String(hora).padStart(2, "0")}:00</th>{celdas}</tr>];
            if (hora % 6 === 5) {
              const inicio = hora - 5;
              const sumas = [
                ...categoriasBalanceIngreso.map((categoria) => totalVolumen(registrosBloque(inicio, hora, "ingreso", categoria.id))),
                totalVolumen(registrosBloque(inicio, hora, "ingreso")),
                ...categoriasBalanceEgreso.map((categoria) => totalVolumen(registrosBloque(inicio, hora, "egreso", categoria.id))),
                totalVolumen(registrosBloque(inicio, hora, "egreso")),
              ];
              filas.push(<tr className="em-balance-subtotal-6h" key={"subtotal-" + hora}><th scope="row">Subtotal 6 h</th>{sumas.map((suma, indice) => <td key={indice}>{suma ? suma.toLocaleString("es-BO") + " ml" : "—"}</td>)}</tr>);
            }
            return filas;
          })}</tbody>
        </table>
      </div>
    </section>
  );
}