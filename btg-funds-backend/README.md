
Proyecto Node.js para la gestión de fondos de inversión.

## Despliegue en AWS (CloudFormation)

Este backend se despliega en AWS usando Serverless Framework, que internamente utiliza AWS CloudFormation para crear y administrar todos los recursos (Lambdas, API Gateway, DynamoDB, RDS, SES, etc.).

### Requisitos previos

- Tener una cuenta de AWS y credenciales configuradas (`aws configure`).
- Node.js y npm instalados.
- Instalar Serverless Framework globalmente:
  ```bash
  npm install -g serverless
  ```
- Clonar este repositorio y ubicarse en la carpeta del proyecto.
- Crear un archivo `.env` con las variables necesarias (ver `.env.example`).

### Despliegue

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Despliega el stack en AWS:
   ```bash
   sls deploy --stage dev
   ```
   Esto ejecuta CloudFormation en tu cuenta y crea todos los recursos definidos en `serverless.yml`.
3. Al finalizar, revisa la consola para obtener el endpoint de la API (ejemplo: https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev).

### Recursos creados
- AWS Lambda (funciones backend)
- API Gateway (endpoints REST)
- DynamoDB (fondos)
- RDS PostgreSQL (usuarios, transacciones)
- SES (notificaciones email)

### Variables de entorno
Debes definir todas las variables sensibles en `.env`. No subas este archivo al repositorio.

### Pruebas locales
Puedes probar localmente con:
```bash
sls offline
```
o usando la colección Postman incluida (`BTG-Funds-Backend.postman_collection.json`).

### Notas
- El archivo `serverless.yml` es el template principal de infraestructura (CloudFormation).
- Puedes modificar el stage (`--stage prod`) para otros entornos.
