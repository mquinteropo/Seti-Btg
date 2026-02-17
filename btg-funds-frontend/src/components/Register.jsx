import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    const result = await register(userId, email, phone, password);
    setLoading(false);

    if (result.success) {
      alert('Registro exitoso. Ahora puedes iniciar sesión.');
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>BTG Pactual - Fondos</h1>
        <h2 style={styles.subtitle}>Crear Cuenta</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Usuario ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              style={styles.input}
              placeholder="Elige un ID único"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="tu@email.com"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              style={styles.input}
              placeholder="3001234567"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Repite tu contraseña"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </button>

          <div style={styles.footer}>
            ¿Ya tienes cuenta? <a href="/" style={styles.link}>Inicia sesión aquí</a>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '10px',
    padding: '40px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    maxWidth: '400px',
    width: '100%'
  },
  title: {
    color: '#333',
    marginBottom: '10px',
    fontSize: '28px',
    textAlign: 'center'
  },
  subtitle: {
    color: '#666',
    marginBottom: '30px',
    fontSize: '20px',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#333',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  button: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '12px',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px'
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '10px',
    fontSize: '14px'
  },
  footer: {
    marginTop: '20px',
    textAlign: 'center',
    color: '#666'
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: 'bold'
  }
};
