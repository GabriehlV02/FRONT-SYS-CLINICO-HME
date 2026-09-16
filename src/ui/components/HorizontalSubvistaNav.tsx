import { useEffect, useRef, useState, type ReactNode } from 'react';
import Icon from './Icon';
import './HorizontalSubvistaNav.css';

export function HorizontalSubvistaNav({ ariaLabel, className, children }: { ariaLabel: string; className: string; children: ReactNode }) {
  const navRef = useRef<HTMLElement>(null);
  const [mostrarAnterior, setMostrarAnterior] = useState(false);
  const [mostrarSiguiente, setMostrarSiguiente] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const actualizar = () => {
      setMostrarAnterior(nav.scrollLeft > 2);
      setMostrarSiguiente(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2);
    };
    actualizar();
    const observador = new ResizeObserver(actualizar);
    observador.observe(nav);
    Array.from(nav.children).forEach(child => observador.observe(child));
    nav.addEventListener('scroll', actualizar, { passive: true });
    return () => { observador.disconnect(); nav.removeEventListener('scroll', actualizar); };
  }, [children]);

  const desplazar = (direccion: -1 | 1) => {
    const nav = navRef.current;
    if (!nav) return;
    const width = nav.firstElementChild?.getBoundingClientRect().width ?? nav.clientWidth;
    const gap = Number.parseFloat(getComputedStyle(nav).columnGap) || 0;
    nav.scrollBy({ left: direccion * (width + gap), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return <div className="subvistas-carrusel">
    {mostrarAnterior && <button type="button" className="subvistas-flecha anterior" onClick={() => desplazar(-1)} aria-label="Ver subvistas anteriores"><Icon name="chevronLeft" size={16}/></button>}
    <nav ref={navRef} className={className} aria-label={ariaLabel}>{children}</nav>
    {mostrarSiguiente && <button type="button" className="subvistas-flecha siguiente" onClick={() => desplazar(1)} aria-label="Ver mas subvistas"><Icon name="chevronRight" size={16}/></button>}
  </div>;
}
