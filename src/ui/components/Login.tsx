import '../styles/LoginFields.css';
import { useState, type FormEvent } from 'react';
import Icon from './Icon';
import { Brand } from './Brand';
import { LoginBalancePanel } from './LoginBalancePanel';
import type { AuthSession, SystemConfig } from '../types';

export function Login({
  onLogin,
  config,
}: {
  onLogin: (session: AuthSession) => void;
  config: SystemConfig;
}) {
  const esContable = config.id === 'contable';
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(`clinica_${config.id}_usuario`) || '';
    } catch {
      return '';
    }
  });
  const [remember, setRemember] = useState(Boolean(username));
  const minimumPasswordLength =
    config.id === 'clinico' || config.id === 'contable' ? 5 : 6;
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    let nextSession: AuthSession = {
      user: username.trim(),
      role: config.role,
      permissions: [],
    };

    if (config.id === 'contable') {
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario: username.trim(), password }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
          usuario?: { nombre?: string; rol?: string; permisos?: string[] };
        };
        if (!response.ok) {
          setError(data.message || 'No se pudo iniciar sesion.');
          return;
        }
        nextSession = {
          user: data.usuario?.nombre || 'Administrador',
          role: data.usuario?.rol || config.role,
          permissions: Array.isArray(data.usuario?.permisos)
            ? data.usuario.permisos
            : [],
        };
      } catch {
        setError('No se pudo conectar con el servidor contable.');
        return;
      } finally {
        setLoading(false);
      }
    }

    try {
      if (remember)
        localStorage.setItem(`clinica_${config.id}_usuario`, username.trim());
      else localStorage.removeItem(`clinica_${config.id}_usuario`);
    } catch {
      /* El acceso tambien funciona sin almacenamiento. */
    }
    onLogin(nextSession);
    setLoading(false);
  }

  const loginForm = (
    <form className="login-card" onSubmit={enter}>
      <Brand name={config.name} subtitle={config.subtitle} />
      <p className="login-kicker">{config.loginTitle}</p>
      <h1>Bienvenido de nuevo</h1>
      <p className="login-subtitulo">
        Ingresa tus credenciales para acceder a tu espacio de trabajo.
      </p>
      <label className="login-label" htmlFor="username">
        Correo, usuario o CI
      </label>
      <div className="login-input">
        <Icon name="users" size={19} />
        <input
          id="username"
          required
          pattern=".*\S.*"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Ingresa tu usuario"
        />
      </div>
      <label className="login-label" htmlFor="password">
        Contrasena
      </label>
      <div className="login-input">
        <Icon name="asset" size={18} />
        <input
          id="password"
          required
          minLength={minimumPasswordLength}
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ingresa tu contrasena"
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            const input = event.currentTarget
              .previousElementSibling as HTMLInputElement;
            const start = input.selectionStart,
              end = input.selectionEnd;
            setVisible(!visible);
            requestAnimationFrame(() => {
              input.focus({ preventScroll: true });
              input.setSelectionRange(start, end);
            });
          }}
          aria-label={visible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          aria-pressed={visible}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
      <div className="login-opciones">
        <label>
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => {
              setRemember(event.target.checked);
              if (!event.target.checked) {
                try {
                  localStorage.removeItem(`clinica_${config.id}_usuario`);
                } catch {
                  /* Almacenamiento opcional. */
                }
              }
            }}
          />{' '}
          Recordar mi usuario
        </label>
        {!esContable && <span>{config.role}</span>}
      </div>
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      <button className="login-submit" type="submit" disabled={loading}>
        {loading ? 'Conectando...' : 'Iniciar sesion'}{' '}
        {!loading && <Icon name="arrowRight" size={18} />}
      </button>
      <div className="login-seguro">
        <Icon name="check" size={16} /> Sesion protegida · Expira tras 6 horas
      </div>
      {config.id !== 'contable' && (
        <div className="demo-access">
          <button
            type="button"
            onClick={() =>
              onLogin({ user: 'demo', role: config.role, permissions: [] })
            }
          >
            Entrar en modo demostracion <Icon name="arrowRight" size={14} />
          </button>
          <p>
            Puedes usar cualquier usuario y una contrasena de{' '}
            {minimumPasswordLength} caracteres o mas.
          </p>
        </div>
      )}
    </form>
  );

  return (
    <main className={`login-page login-page-${config.id}`}>
      {['superior', 'inferior'].map((position) => (
        <svg
          key={position}
          className={`triangulo-fondo triangulo-${position}`}
          viewBox="0 0 500 430"
          aria-hidden="true"
        >
          <path d="M245 20Q265-13 285 20L485 365Q505 400 465 400H65Q25 400 45 365Z" />
        </svg>
      ))}
      <svg
        className="triangulo-fondo triangulo-orbita"
        viewBox="0 0 220 195"
        aria-hidden="true"
      >
        <path d="M101 15Q110 0 119 15L207 166Q216 182 198 182H22Q4 182 13 166Z" />
        <circle cx="193" cy="142" r="6" />
      </svg>
      {['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'].map((name) => (
        <svg
          key={name}
          className={`mini-triangulo mini-${name}`}
          viewBox="0 0 100 90"
          aria-hidden="true"
        >
          <path d="M45 8Q50 0 55 8L94 76Q99 85 89 85H11Q1 85 6 76Z" />
        </svg>
      ))}
      {['uno', 'dos', 'tres'].map((name) => (
        <span key={name} aria-hidden="true">
          <i className={`punto punto-${name}`} />
          <i className={`trazo trazo-${name}`} />
        </span>
      ))}
      {esContable ? (
        <div className="login-balance-layout">
          <section className="login-balance-left">
            <LoginBalancePanel subtitle={config.subtitle} />
          </section>
          <section className="login-balance-right">
            <div className="login-circulos" aria-hidden="true">
              {['uno', 'dos', 'tres', 'cuatro'].map((name) => (
                <span
                  key={`fijo-${name}`}
                  className={`login-circulo login-circulo-${name}`}
                />
              ))}
              {['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'].map((name) => (
                <span
                  key={`movil-${name}`}
                  className={`login-circulo-movil login-circulo-movil-${name}`}
                />
              ))}
            </div>
            {loginForm}
          </section>
        </div>
      ) : (
        loginForm
      )}
    </main>
  );
}
