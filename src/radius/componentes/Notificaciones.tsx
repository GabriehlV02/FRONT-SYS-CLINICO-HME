import { useEffect, useState } from "react";
import Icon, { type IconName } from "./Icono";
import "./Notificaciones.css";

type Tipo = "exito" | "error" | "advertencia" | "informacion";
type Aviso = { id: string; tipo: Tipo; titulo: string; mensaje: string };
type Confirmacion = {
  titulo: string;
  mensaje: string;
  detalle?: string;
  textoConfirmar?: string;
  peligrosa?: boolean;
  resolver: (valor: boolean) => void;
};
const EVENTO_AVISO = "radiuus:notificacion",
  EVENTO_CONFIRMAR = "radiuus:confirmar";
export const notificar = (tipo: Tipo, titulo: string, mensaje: string) =>
  window.dispatchEvent(
    new CustomEvent(EVENTO_AVISO, { detail: { tipo, titulo, mensaje } }),
  );
export const confirmar = (datos: Omit<Confirmacion, "resolver">) =>
  new Promise<boolean>((resolver) =>
    window.dispatchEvent(
      new CustomEvent(EVENTO_CONFIRMAR, { detail: { ...datos, resolver } }),
    ),
  );
const iconos: Record<Tipo, IconName> = {
  exito: "check",
  error: "close",
  advertencia: "audit",
  informacion: "bell",
};

export default function CentroNotificaciones() {
  const [avisos, setAvisos] = useState<Aviso[]>([]),
    [dialogo, setDialogo] = useState<Confirmacion | null>(null);
  useEffect(() => {
    const aviso = (evento: Event) => {
        const dato = (evento as CustomEvent<Omit<Aviso, "id">>).detail,
          id = crypto.randomUUID();
        setAvisos((lista) => [...lista.slice(-3), { ...dato, id }]);
        window.setTimeout(
          () => setAvisos((lista) => lista.filter((item) => item.id !== id)),
          4800,
        );
      },
      confirmacion = (evento: Event) =>
        setDialogo((evento as CustomEvent<Confirmacion>).detail);
    window.addEventListener(EVENTO_AVISO, aviso);
    window.addEventListener(EVENTO_CONFIRMAR, confirmacion);
    return () => {
      window.removeEventListener(EVENTO_AVISO, aviso);
      window.removeEventListener(EVENTO_CONFIRMAR, confirmacion);
    };
  }, []);
  const responder = (valor: boolean) => {
    dialogo?.resolver(valor);
    setDialogo(null);
  };
  return (
    <>
      <div className="avisos-contenedor" aria-live="polite">
        {avisos.map((a) => (
          <article key={a.id} className={`aviso aviso-${a.tipo}`}>
            <span>
              <Icon name={iconos[a.tipo]} size={17} />
            </span>
            <div>
              <strong>{a.titulo}</strong>
              <p>{a.mensaje}</p>
            </div>
            <button
              onClick={() =>
                setAvisos((lista) => lista.filter((item) => item.id !== a.id))
              }
              aria-label="Cerrar"
            >
              <Icon name="close" size={14} />
            </button>
          </article>
        ))}
      </div>
      {dialogo && (
        <div
          className="confirmacion-fondo"
          role="presentation"
          onMouseDown={() => responder(false)}
        >
          <section
            className={`confirmacion-modal ${dialogo.peligrosa ? "peligrosa" : ""}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmacion-titulo"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header>
              <span>
                <Icon name={dialogo.peligrosa ? "trash" : "audit"} size={22} />
              </span>
              <div>
                <small>
                  {dialogo.peligrosa ? "ACCIÓN IRREVERSIBLE" : "CONFIRMACIÓN"}
                </small>
                <h3 id="confirmacion-titulo">{dialogo.titulo}</h3>
              </div>
              <button onClick={() => responder(false)} aria-label="Cerrar">
                <Icon name="close" size={17} />
              </button>
            </header>
            <div className="confirmacion-contenido">
              <p>{dialogo.mensaje}</p>
              {dialogo.detalle && (
                <div>
                  <Icon name="audit" size={16} />
                  <span>{dialogo.detalle}</span>
                </div>
              )}
            </div>
            <footer>
              <button onClick={() => responder(false)}>Cancelar</button>
              <button className="confirmar" onClick={() => responder(true)}>
                {dialogo.peligrosa && <Icon name="trash" size={15} />}{" "}
                {dialogo.textoConfirmar || "Confirmar"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
