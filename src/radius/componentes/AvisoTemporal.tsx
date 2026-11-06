import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./AvisoTemporal.css";

export function AvisoTemporal({ mensaje }: { mensaje: string }) {
  const [visible, setVisible] = useState(Boolean(mensaje));
  useEffect(() => {
    setVisible(Boolean(mensaje));
    if (!mensaje) return;
    const timer = window.setTimeout(() => setVisible(false), 4800);
    return () => window.clearTimeout(timer);
  }, [mensaje]);
  if (!visible || !mensaje) return null;
  return createPortal(
    <div className="aviso-temporal-global" role="status">
      <span aria-hidden="true">✓</span>
      <p>{mensaje}</p>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={() => setVisible(false)}
      >
        ×
      </button>
    </div>,
    document.querySelector("dialog[open]") || document.body,
  );
}
