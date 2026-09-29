import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../radius/componentes/Icono';
import './InternacionModal.css';

export function InternacionModal({ onCerrar }: { onCerrar: () => void }) {
  const ventana = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ventana.current;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogo?.showModal();
    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return createPortal(
    <dialog ref={ventana} className="recepcion-internacion-modal" aria-label="Internación" onClose={onCerrar}>
      <button className="recepcion-internacion-cerrar" type="button" aria-label="Cerrar internación" autoFocus onClick={() => ventana.current?.close()}>
        <Icon name="close" size={22} />
      </button>
    </dialog>,
    document.body,
  );
}
