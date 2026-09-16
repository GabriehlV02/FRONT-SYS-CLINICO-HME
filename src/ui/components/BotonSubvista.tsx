import Icon, { type IconName } from './Icon';

type Props = {
  nombre: string;
  icono: IconName;
  activa: boolean;
  onSeleccionar: () => void;
  claseIcono?: string;
};

export function BotonSubvista({ nombre, icono, activa, onSeleccionar, claseIcono }: Props) {
  return (
    <button type="button" className={activa ? 'activo' : ''} aria-current={activa ? 'page' : undefined} onClick={onSeleccionar}>
      {claseIcono
        ? <span className={claseIcono} aria-hidden="true"><Icon name={icono} size={16} /></span>
        : <i aria-hidden="true"><Icon name={icono} size={16} /></i>}
      <span>{nombre}</span>
    </button>
  );
}
