export function Brand({
  sidebar = false,
  subtitle,
  name,
}: {
  sidebar?: boolean;
  subtitle: string;
  name: string;
}) {
  const logoCompleto = '/logo-hospital-original.png';
  const logoCompacto = '/brand.svg?v=clinico-azul-vital';

  return (
    <div className={sidebar ? 'sistema-marca' : 'login-brand'}>
      <span className="marca-icono marca-logo-completo" aria-hidden="true">
        <img
          src={sidebar ? logoCompleto : logoCompacto}
          alt=""
          onError={(event) => {
            event.currentTarget.parentElement?.classList.add('logo-no-disponible');
          }}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </span>
      {sidebar && (
        <span className="marca-icono marca-logo-compacto" aria-hidden="true">
          <img
            src={logoCompacto}
            alt=""
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </span>
      )}
      <span className="marca-texto">
        <strong>{name}</strong>
        <small>{subtitle}</small>
      </span>
    </div>
  );
}
