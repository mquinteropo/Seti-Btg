-- Agenda de maquillaje. Aditiva: corre contra datos en vivo.
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  usuario TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'maquilladora',
  creado TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  token TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  expira TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS citas (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  cliente TEXT NOT NULL,
  tel TEXT,
  personas INTEGER NOT NULL DEFAULT 1,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  duracion INTEGER NOT NULL DEFAULT 60,
  servicio TEXT,
  ocasion TEXT,
  estado TEXT NOT NULL DEFAULT 'agendada',
  modalidad TEXT,
  zona TEXT,
  direccion TEXT,
  valor REAL NOT NULL DEFAULT 0,
  abono REAL NOT NULL DEFAULT 0,
  medio TEXT,
  fecha_abono TEXT,
  notas TEXT,
  fotos TEXT NOT NULL DEFAULT '[]',
  creado TEXT NOT NULL,
  actualizado TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_citas_usuario ON citas (usuario_id, fecha);
