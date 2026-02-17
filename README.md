# 🏦 BTG Pactual - Sistema de Gestión de Fondos

> Plataforma web fullstack que permite a los clientes gestionar sus fondos de inversión de manera autónoma, implementando patrones de diseño avanzados y arquitectura serverless en AWS.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![AWS](https://img.shields.io/badge/AWS-Serverless-orange.svg)](https://aws.amazon.com/)
[![Tests](https://img.shields.io/badge/Tests-38%2F38%20passing-success.svg)](https://jestjs.io/)
[![Coverage](https://img.shields.io/badge/Coverage-82.58%25-brightgreen.svg)](https://jestjs.io/)

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#%EF%B8%8F-arquitectura)
- [Tecnologías](#%EF%B8%8F-tecnologías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#%EF%B8%8F-configuración)
- [Despliegue](#-despliegue)
- [API Endpoints](#-api-endpoints)
- [Testing](#-testing)
- [Patrones de Diseño](#-patrones-de-diseño)
- [Seguridad](#-seguridad)
- [URLs de Producción](#-urls-de-producción)

---

## ✨ Características

### Funcionalidades Principales

1. **Gestión de Fondos**
   - ✅ Suscripción a fondos de inversión con validación de montos mínimos
   - ✅ Cancelación de suscripciones con devolución automática al balance
   - ✅ Visualización de fondos disponibles (5 fondos BTG Pactual)
   - ✅ Control de balance del usuario ($500,000 inicial)
   - ✅ Prevención de suscripciones duplicadas

2. **Sistema de Notificaciones Multi-Canal** 🚀
   - ✅ Notificaciones por **Email** (AWS SES)
   - ✅ Notificaciones por **SMS** (AWS SNS)
   - ✅ Selector de canal preferido por el usuario
   - ✅ Implementación con **Strategy Pattern** (extensible)
   - ✅ Soporte para futuros canales (WhatsApp, Push, Telegram)

3. **Historial de Transacciones**
   - ✅ Tabla interactiva con paginación profesional
   - ✅ Ordenamiento por cualquier columna
   - ✅ Selector de filas por página (5, 10, 15, 20)
   - ✅ Búsqueda y filtrado en tiempo real
   - ✅ Componente `react-data-table-component`

4. **Autenticación y Seguridad**
   - ✅ Registro de usuarios con email y teléfono
   - ✅ Login con JWT (1 hora de expiración)
   - ✅ Encriptación de contraseñas con bcrypt (10 rounds)
   - ✅ Middleware de autenticación en rutas protegidas
   - ✅ Validación de datos en frontend y backend

### Fondos Disponibles

| ID | Nombre | Monto Mínimo | Categoría |
|----|--------|--------------|-----------|
| `FPV_BTG_PACTUAL_RECAUDADORA` | FPV BTG Pactual Recaudadora | $75,000 | FPV |
| `FPV_BTG_PACTUAL_ECOPETROL` | FPV BTG Pactual Ecopetrol | $125,000 | FPV |
| `DEUDAPRIVADA` | Deuda Privada | $50,000 | FIC |
| `FDO-ACCIONES` | FDO-Acciones | $250,000 | FIC |
| `FPV_BTG_PACTUAL_DINAMICA` | FPV BTG Pactual Dinámica | $100,000 | FPV |

---

## 🏗️ Arquitectura

### Diagrama de Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE WEB                              │
│                    (React 19 + Vite)                             │
│                                                                  │
│  - Dashboard con gestión de fondos                              │
│  - Autenticación JWT                                            │
│  - Historial con paginación                                     │
│  - Selector de canal de notificación                            │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     │ HTTPS / REST API
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS API Gateway                               │
│                  (HTTP API - REST)                               │
│                                                                  │
│  - Routing de endpoints                                         │
│  - CORS configurado                                             │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Lambda                                    │
│                  (Node.js 18.x)                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Express.js Application                    │          │
│  │                                                   │          │
│  │  Controllers:                                     │          │
│  │  ├─ authController (register, login)             │          │
│  │  └─ fundController (subscribe, cancel, history)  │          │
│  │                                                   │          │
│  │  Services:                                        │          │
│  │  ├─ fundService (business logic)                 │          │
│  │  └─ NotificationContext (Strategy Pattern)       │          │
│  │                                                   │          │
│  │  Strategies:                                      │          │
│  │  ├─ EmailNotificationStrategy (SES)              │          │
│  │  └─ SMSNotificationStrategy (SNS)                │          │
│  └──────────────────────────────────────────────────┘          │
└────────┬────────────────────────┬─────────────────┬─────────────┘
         │                        │                 │
         ▼                        ▼                 ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │    DynamoDB      │  │   AWS SES/SNS   │
│   (AWS RDS)     │  │   (Fondos)       │  │ (Notifications) │
│                 │  │                  │  │                 │
│  - users        │  │  - funds_table   │  │  - Email        │
│  - transactions │  │                  │  │  - SMS          │
└─────────────────┘  └──────────────────┘  └─────────────────┘
```

### Arquitectura de Notificaciones (Strategy Pattern)

```
┌─────────────────────────────────────────────┐
│        NotificationContext                   │
│        (Singleton + Registry)                │
│                                              │
│  registerStrategy(name, strategy)           │
│  send(channel, recipient, message)          │
│  isChannelAvailable(channel)                │
└────────┬────────────────────────────────────┘
         │
         │ Selecciona estrategia dinámicamente
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐  ┌──────────────┐
│  Email  │ │   SMS   │  │  (Extensible)│
│Strategy │ │Strategy │  │  - WhatsApp  │
│         │ │         │  │  - Push      │
│AWS SES  │ │AWS SNS  │  │  - Telegram  │
└─────────┘ └─────────┘  └──────────────┘

✅ Open/Closed Principle aplicado
✅ Agregar canales sin modificar código existente
```

---

## 🛠️ Tecnologías

### Backend
- **Runtime:** Node.js 18.x
- **Framework:** Express.js
- **Despliegue:** AWS Lambda + Serverless Framework 3.40.0
- **Base de Datos:**
  - **PostgreSQL** (AWS RDS) - Usuarios y transacciones
  - **DynamoDB** - Catálogo de fondos
- **Autenticación:** JWT + bcrypt
- **Notificaciones:**
  - AWS SES (Simple Email Service)
  - AWS SNS (Simple Notification Service)
- **Testing:** Jest (82.58% coverage, 38/38 tests)

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite 7.3
- **Routing:** React Router DOM 7.13
- **HTTP Client:** Axios 1.13
- **UI Components:**
  - react-data-table-component 7.7 (paginación)
  - Inline CSS (estilos personalizados BTG)
- **Hosting:** AWS S3 Static Website

### AWS Services
- **Lambda** - Ejecución serverless del backend
- **API Gateway** - REST API HTTP
- **RDS PostgreSQL** - Base de datos relacional
- **DynamoDB** - Base de datos NoSQL
- **SES** - Email transaccional
- **SNS** - SMS transaccional
- **S3** - Hosting del frontend
- **CloudFormation** - Infrastructure as Code (via Serverless)

---

## 📁 Estructura del Proyecto

```
btg-pactual-funds/
│
├── btg-funds-backend/              # Backend Node.js + Serverless
│   ├── src/
│   │   ├── controllers/            # Controladores REST
│   │   │   ├── authController.js   # Registro y login
│   │   │   └── fundController.js   # Gestión de fondos
│   │   │
│   │   ├── services/               # Lógica de negocio
│   │   │   ├── fundService.js      # Business logic de fondos
│   │   │   └── NotificationContext.js  # Context del Strategy Pattern
│   │   │
│   │   ├── strategies/             # Strategy Pattern
│   │   │   ├── NotificationStrategy.js          # Base abstracta
│   │   │   ├── EmailNotificationStrategy.js     # AWS SES
│   │   │   └── SMSNotificationStrategy.js       # AWS SNS
│   │   │
│   │   ├── middlewares/            # Middlewares
│   │   │   └── auth.js             # Verificación JWT
│   │   │
│   │   ├── models/                 # Configuración DB
│   │   │   ├── pgClient.js         # PostgreSQL client
│   │   │   └── dynamoClient.js     # DynamoDB client
│   │   │
│   │   ├── routes/                 # Rutas
│   │   │   ├── authRoutes.js       # /api/auth/*
│   │   │   └── fundRoutes.js       # /api/funds/*
│   │   │
│   │   └── app.js                  # Aplicación Express
│   │
│   ├── __tests__/                  # Tests unitarios (Jest)
│   │   ├── authController.test.js
│   │   ├── fundController.test.js
│   │   ├── fundService.test.js
│   │   └── auth.test.js
│   │
│   ├── migrations/                 # Migraciones de DB
│   │   ├── create-tables.js
│   │   └── add-phone-to-users.js
│   │
│   ├── serverless.yml              # Configuración Serverless
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
│
├── btg-funds-frontend/             # Frontend React
│   ├── src/
│   │   ├── components/             # Componentes React
│   │   │   ├── Login.jsx           # Página de login
│   │   │   ├── Register.jsx        # Registro de usuarios
│   │   │   └── Dashboard.jsx       # Dashboard principal
│   │   │
│   │   ├── context/                # Context API
│   │   │   └── AuthContext.jsx     # Contexto de autenticación
│   │   │
│   │   ├── api/                    # Configuración HTTP
│   │   │   └── axios.js            # Axios instance + interceptors
│   │   │
│   │   ├── App.jsx                 # Componente raíz
│   │   └── main.jsx                # Entry point
│   │
│   ├── public/                     # Assets estáticos
│   ├── dist/                       # Build de producción
│   ├── package.json
│   ├── vite.config.js
│   └── .gitignore
│
└── README.md                       # Este archivo
```

---

## 🚀 Instalación

### Prerrequisitos

- **Node.js** 18 o superior
- **npm** o yarn
- **Cuenta de AWS** con credenciales configuradas
- **PostgreSQL** (local o AWS RDS)
- **AWS CLI** configurado con perfil

### Backend

```bash
cd btg-funds-backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales AWS y DB

# Ejecutar migraciones de base de datos
node migrations/create-tables.js
node migrations/add-phone-to-users.js

# Ejecutar tests
npm test

# Desarrollo local
npm run dev
```

### Frontend

```bash
cd btg-funds-frontend

# Instalar dependencias
npm install

# Configurar endpoint del API en src/api/axios.js

# Desarrollo local (http://localhost:5173)
npm run dev

# Build para producción
npm run build
```

---

## ⚙️ Configuración

### Variables de Entorno (Backend)

Crear archivo `.env` en `btg-funds-backend/`:

```env
# PostgreSQL Configuration
PG_HOST=database-btgpactual.ckvag28m07ba.us-east-1.rds.amazonaws.com
PG_DATABASE=btgpactual
PG_USER=master
PG_PASSWORD=your-secure-password
PG_PORT=5432

# DynamoDB
FUNDS_TABLE=BtgPactualFundsDB

# AWS SES (Email verificado)
SES_FROM_EMAIL=your-verified-email@domain.com

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this

# AWS Region (automático en Lambda)
AWS_REGION=us-east-1
```

### Configuración del Frontend

Editar `btg-funds-frontend/src/api/axios.js`:

```javascript
const API_URL = 'https://kikkuzrtyg.execute-api.us-east-1.amazonaws.com';
```

---

## 🌐 Despliegue

### Deploy del Backend (AWS Lambda)

```bash
cd btg-funds-backend

# Asegurarse de tener .env configurado
# Deploy usando Serverless Framework
serverless deploy --aws-profile miguel

# Output esperado:
# ✔ Service deployed to stack btg-funds-backend-dev
# endpoint: https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
# functions:
#   app: btg-funds-backend-dev-app
```

### Deploy del Frontend (S3)

```bash
cd btg-funds-frontend

# Build de producción
npm run build

# Sincronizar con S3
aws s3 sync dist s3://btg-pactual-funds-frontend --profile miguel --delete

# Output esperado:
# upload: dist/index.html to s3://btg-pactual-funds-frontend/index.html
# upload: dist/assets/index-xxxxx.js to s3://...
```

### Infraestructura AWS Requerida

#### 1. PostgreSQL Database (RDS)
```
Engine: PostgreSQL 17.6
Instance: db.t3.micro
VPC: Configurar Security Group para Lambda
```

Ejecutar migraciones:
```bash
node migrations/create-tables.js
node migrations/add-phone-to-users.js
```

#### 2. DynamoDB Table
```
Nombre: BtgPactualFundsDB
Partition Key: id (String)
Billing: On-Demand
```

Cargar fondos:
```javascript
// Script de ejemplo para cargar fondos
const fondos = [
  { id: 'FPV_BTG_PACTUAL_RECAUDADORA', name: 'FPV BTG Pactual Recaudadora', minAmount: 75000, category: 'FPV' },
  // ... otros fondos
];
```

#### 3. AWS SES Configuration
- Verificar email emisor en SES
- **Sandbox mode:** Verificar emails de destinatarios
- **Producción:** Solicitar salida de Sandbox mode

#### 4. AWS SNS Configuration
- Permisos en IAM role de Lambda (ya configurado en serverless.yml)
- Validación de números de teléfono para producción

---

## 📡 API Endpoints

Base URL: `https://kikkuzrtyg.execute-api.us-east-1.amazonaws.com`

### Autenticación

#### `POST /api/auth/register`
Registrar nuevo usuario con email y teléfono

**Request:**
```json
{
  "userId": "user123",
  "email": "user@example.com",
  "password": "securepass123",
  "phone": "+573001234567"
}
```

**Response (201):**
```json
{
  "message": "Usuario registrado"
}
```

#### `POST /api/auth/login`
Iniciar sesión y obtener JWT

**Request:**
```json
{
  "userId": "user123",
  "password": "securepass123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMTIzIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MDg1MDAwMDAsImV4cCI6MTcwODUwMzYwMH0.xxxxx"
}
```

### Gestión de Fondos (Requieren autenticación)

#### `POST /api/funds/subscribe`
Suscribirse a un fondo con notificación

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "fundId": "DEUDAPRIVADA",
  "amount": 50000,
  "notifyBy": "email"  // "email" o "sms"
}
```

**Response (200):**
```json
{
  "message": "Suscripción exitosa",
  "transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fundId": "DEUDAPRIVADA",
    "amount": 50000,
    "type": "SUBSCRIPTION",
    "date": "2026-02-17T10:30:00.000Z"
  }
}
```

#### `POST /api/funds/cancel`
Cancelar suscripción a un fondo

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "fundId": "DEUDAPRIVADA",
  "notifyBy": "sms"
}
```

**Response (200):**
```json
{
  "message": "Cancelación exitosa",
  "transaction": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "fundId": "DEUDAPRIVADA",
    "amount": 50000,
    "type": "CANCELLATION"
  }
}
```

#### `GET /api/funds/history/:userId`
Obtener historial de transacciones del usuario

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user123",
    "fund_id": "DEUDAPRIVADA",
    "amount": "50000",
    "type": "SUBSCRIPTION",
    "date": "2026-02-17T10:30:00.000Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "user123",
    "fund_id": "FPV_BTG_PACTUAL_RECAUDADORA",
    "amount": "75000",
    "type": "SUBSCRIPTION",
    "date": "2026-02-17T11:00:00.000Z"
  }
]
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
cd btg-funds-backend
npm test
```

### Cobertura de Tests

```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
All files           |   82.58 |    75.51 |   60.00 |   83.03 |
 controllers        |   87.23 |    77.77 |   66.66 |   88.00 |
  authController.js |   82.35 |    66.66 |   50.00 |   82.35 | 11,31
  fundController.js |   91.30 |    83.33 |   80.00 |   92.30 | 47
 middlewares        |   90.00 |    75.00 |  100.00 |   90.00 |
  auth.js           |   90.00 |    75.00 |  100.00 |   90.00 | 15
 services           |   72.72 |    72.22 |   28.57 |   75.00 |
  fundService.js    |   72.72 |    72.22 |   28.57 |   75.00 | 20-24,63-73
--------------------|---------|----------|---------|---------|-------------------

Test Suites: 4 passed, 4 total
Tests:       38 passed, 38 total
Snapshots:   0 total
Time:        4.521 s
```

### Tests Implementados

- ✅ **authController** - Registro y login de usuarios
- ✅ **fundController** - Subscribe, cancel, history
- ✅ **fundService** - Lógica de negocio de fondos
- ✅ **auth middleware** - Validación de JWT
- ⚠️ **Notification strategies** - Mockeadas (no testean AWS real)

---

## 🎨 Patrones de Diseño

### 1. Strategy Pattern (Sistema de Notificaciones)

**Problema:**
El sistema necesita enviar notificaciones por múltiples canales (Email, SMS, y potencialmente WhatsApp, Push, Telegram en el futuro). Usar condicionales (`if/else`) para cada canal viola el principio Open/Closed.

**Solución:**
Implementar el patrón Strategy que encapsula cada canal de notificación en una estrategia independiente.

**Componentes:**

```javascript
// Base abstracta
class NotificationStrategy {
  async send(recipient, message, metadata) {}
  validate(recipient) {}
  getChannelName() {}
}

// Estrategias concretas
class EmailNotificationStrategy extends NotificationStrategy {
  constructor() {
    this.ses = new AWS.SES();
  }
  async send(recipient, message, metadata) {
    return this.ses.sendEmail({
      Source: this.fromEmail,
      Destination: { ToAddresses: [recipient] },
      Message: { Subject: { Data: metadata.subject }, Body: { Text: { Data: message } } }
    }).promise();
  }
}

class SMSNotificationStrategy extends NotificationStrategy {
  constructor() {
    this.sns = new AWS.SNS();
  }
  async send(recipient, message, metadata) {
    return this.sns.publish({
      Message: message,
      PhoneNumber: this.formatPhoneNumber(recipient)
    }).promise();
  }
}

// Context
class NotificationContext {
  constructor() {
    this.strategies = new Map();
    this.registerStrategy('email', new EmailNotificationStrategy());
    this.registerStrategy('sms', new SMSNotificationStrategy());
  }

  async send(channel, recipient, message, metadata) {
    const strategy = this.strategies.get(channel);
    return strategy.send(recipient, message, metadata);
  }
}
```

**Beneficios:**
- ✅ **Open/Closed Principle** - Agregar WhatsApp sin modificar código existente
- ✅ **Single Responsibility** - Cada estrategia maneja solo un canal
- ✅ **Testabilidad** - Mock fácil de cada estrategia
- ✅ **Mantenibilidad** - Cambios en Email no afectan SMS
- ✅ **Extensibilidad** - Futuros canales: `registerStrategy('whatsapp', new WhatsAppStrategy())`

### 2. Singleton Pattern

**NotificationContext** es una única instancia compartida por toda la aplicación.

```javascript
const notificationContext = new NotificationContext();
module.exports = notificationContext; // Singleton
```

### 3. Registry Pattern

`NotificationContext` usa un `Map` para registrar estrategias dinámicamente.

```javascript
registerStrategy(channelName, strategy) {
  this.strategies.set(channelName.toLowerCase(), strategy);
}
```

### 4. MVC Pattern

- **Models:** pgClient.js, dynamoClient.js
- **Controllers:** authController.js, fundController.js
- **Services (Business Logic):** fundService.js
- **Views:** JSON responses del API

### 5. Principios SOLID Aplicados

| Principio | Aplicación |
|-----------|------------|
| **S** - Single Responsibility | Cada estrategia solo maneja un canal de notificación |
| **O** - Open/Closed | Abierto para extensión (nuevas estrategias), cerrado para modificación |
| **L** - Liskov Substitution | Cualquier estrategia puede sustituir a otra sin romper el código |
| **I** - Interface Segregation | Interface mínima: `send()`, `validate()`, `getChannelName()` |
| **D** - Dependency Inversion | `fundService` depende de abstracciones (`NotificationStrategy`), no de implementaciones concretas |

---

## 🔒 Seguridad

### Medidas Implementadas

1. **Autenticación JWT**
   - Tokens firmados con secret key
   - Expiración de 1 hora
   - Almacenado en localStorage (frontend)
   - Validación en cada request protegido

2. **Encriptación de Contraseñas**
   - bcrypt con 10 salt rounds
   - Nunca se almacenan contraseñas en texto plano
   - Comparación segura con bcrypt.compare()

3. **Validación de Datos**
   - Email: formato válido con regex
   - Teléfono: formato internacional (+57XXXXXXXXXX)
   - Montos: validación de mínimos y balance
   - SQL Injection: uso de parameterized queries

4. **CORS**
   - Configurado para frontend específico
   - Headers permitidos: Authorization, Content-Type

5. **AWS Security**
   - IAM roles con permisos mínimos
   - Credenciales en variables de entorno (.env)
   - SES en Sandbox mode (producción requiere verificación)
   - VPC para RDS con Security Groups

6. **Middleware de Autenticación**
```javascript
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
```

---

## 📊 Base de Datos

### PostgreSQL (AWS RDS)

**Endpoint:** `database-btgpactual.ckvag28m07ba.us-east-1.rds.amazonaws.com`

#### Tabla: users
```sql
CREATE TABLE users (
  user_id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'user',
  balance DECIMAL(12,2) DEFAULT 500000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: transactions
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) REFERENCES users(user_id),
  fund_id VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('SUBSCRIPTION', 'CANCELLATION')),
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_fund_id ON transactions(fund_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
```

### DynamoDB

**Tabla:** `BtgPactualFundsDB`

- **Partition Key:** `id` (String)
- **Atributos:**
  - `name` (String)
  - `minAmount` (Number)
  - `category` (String)

**Ejemplo de item:**
```json
{
  "id": "DEUDAPRIVADA",
  "name": "Deuda Privada",
  "minAmount": 50000,
  "category": "FIC"
}
```

---

## 🌍 URLs de Producción

### Backend API
```
https://kikkuzrtyg.execute-api.us-east-1.amazonaws.com
```

### Frontend
```
http://btg-pactual-funds-frontend.s3-website-us-east-1.amazonaws.com
```

### Testing con cURL

```bash
# 1. Registro
curl -X POST https://kikkuzrtyg.execute-api.us-east-1.amazonaws.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"userId":"testuser","email":"test@test.com","password":"pass123","phone":"+573001234567"}'

# 2. Login
TOKEN=$(curl -X POST https://kikkuzrtyg.execute-api.us-east-1.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"testuser","password":"pass123"}' | jq -r '.token')

# 3. Suscribirse a fondo (Email)
curl -X POST https://kikkuzrtyg.execute-api.us-east-1.amazonaws.com/api/funds/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"fundId":"DEUDAPRIVADA","amount":100000,"notifyBy":"email"}'

# 4. Suscribirse a fondo (SMS)
curl -X POST https://kikkuzrtyg.execute-api.us-east-1.amazonaws.com/api/funds/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"fundId":"FPV_BTG_PACTUAL_RECAUDADORA","amount":75000,"notifyBy":"sms"}'

# 5. Ver historial
curl https://kikkuzrtyg.execute-api.us-east-1.amazonaws.com/api/funds/history/testuser \
  -H "Authorization: Bearer $TOKEN"

# 6. Cancelar suscripción
curl -X POST https://kikkuzrtyg.execute-api.us-east-1.amazonaws.com/api/funds/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"fundId":"DEUDAPRIVADA","notifyBy":"email"}'
```

---

## 📝 Reglas de Negocio

1. **Balance Inicial:** $500,000 COP por usuario
2. **Transacciones Únicas:** UUID v4 para cada transacción
3. **Montos Mínimos:** Validados antes de suscripción
4. **Balance Suficiente:** No se permite suscripción sin fondos
5. **Devolución:** Al cancelar, monto vuelve al balance
6. **Suscripciones Activas:** Un usuario puede tener múltiples fondos
7. **Notificaciones:** Usuario elige canal en cada operación

---

## 🚀 Mejoras Futuras

- [ ] **Colección de Postman** para testing del API
- [ ] **Diagrama de arquitectura detallado** (AWS components)
- [ ] CloudFront para CDN del frontend (HTTPS)
- [ ] Certificado SSL con ACM
- [ ] CI/CD con GitHub Actions
- [ ] Rate limiting en API Gateway
- [ ] Métricas con CloudWatch
- [ ] Logs centralizados
- [ ] Backup automático de RDS
- [ ] Estrategia de WhatsApp (Twilio)
- [ ] Template system para mensajes
- [ ] Dashboard de administración

---

## 📄 Licencia

Proyecto de prueba técnica para **BTG Pactual**.

---

## 👨‍💻 Autor

**Miguel Quintero**
- GitHub: [@mquinteropo](https://github.com/mquinteropo)
- Proyecto: [Seti-Btg](https://github.com/mquinteropo/Seti-Btg)

---

## 📞 Contacto

Para preguntas o soporte sobre este proyecto, contactar al equipo de desarrollo.

---

<div align="center">

**Desarrollado con ❤️ usando AWS Serverless Architecture**

**Última actualización:** Febrero 17, 2026
**Versión:** 1.0.0
**Estado:** ✅ Desplegado en Producción

</div>
