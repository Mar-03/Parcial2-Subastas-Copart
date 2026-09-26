# Plataforma de Subastas de Vehículos (estilo Copart)

Aplicación web de subastas de vehículos en tiempo real. Los usuarios registran
sus vehículos, los publican en subasta y los participantes ofertan en vivo con
incremento mínimo del 10 %.

**Stack:** Next.js 15 (App Router) · Firebase Realtime Database · Socket.IO ·
JWT + bcryptjs · JavaScript · Arquitectura hexagonal.

> Firebase se usa **únicamente como base de datos** (Realtime Database).
> La autenticación es propia (JWT firmado + hash bcrypt) y **no** se usa
> Firebase Authentication ni Firestore.

---

## 1. Arquitectura

Proyecto organizado en capas (dominio / aplicación / infraestructura / presentación):

```
src/
├─ domain/                  # No depende de nada externo (ni Firebase, ni React)
│  ├─ entities/             #   User, Vehicle, Bid, AuctionStatus + reglas puras
│  ├─ ports/                #   Interfaces: UserRepository, VehicleRepository,
│  │                        #   BidRepository, DatabasePort
│  ├─ errors/               #   DomainError tipados (notFound, forbidden, validacion…)
│  └─ validators/           #   Validación de entrada (vehículos, usuarios, comunes)
│
├─ application/             # Casos de uso: orquestan dominio + puertos
│  └─ use-cases/            #   auth, vehicle, place-bid, check-health
│
├─ infrastructure/          # Adaptadores (aquí vive Firebase)
│  ├─ container.js          #   Raíz de composición: puerto -> implementación
│  ├─ auth/                 #   Adaptadores de bcryptjs y jsonwebtoken
│  ├─ database/             #   firebase-admin.js (lazy), firebase-utils.js
│  ├─ realtime/             #   socket-io.publisher.js
│  └─ repositories/         #   firebase-user / firebase-vehicle / firebase-bid
│
├─ app/                     # Rutas de Next.js (App Router) y API Routes
└─ components/              # Componentes de UI
```


### Archivos clave de persistencia

| Archivo | Responsabilidad |
| --- | --- |
| `src/infrastructure/database/firebase-admin.js` | Inicialización **lazy** de `firebase-admin`, `dbRef()`, adaptador de salud y cierre. |
| `src/infrastructure/database/firebase-utils.js` | IDs secuenciales transaccionales, escape de llaves de email, helpers. |
| `src/infrastructure/repositories/firebase-user.repository.js` | Usuarios + índice `userEmails` para login por correo. |
| `src/infrastructure/repositories/firebase-vehicle.repository.js` | Catálogo, filtros, facetas, galería, cierre de subastas. |
| `src/infrastructure/repositories/firebase-bid.repository.js` | Puja atómica (transacción de Firebase). |
| `src/infrastructure/container.js` | Inyecta las implementaciones en los casos de uso. |

---

## 2. Estructura de datos en Firebase

```
_meta/                              # metadata de la app (initializedAt, lastSeedAt…)
_counters/
├─ users/{contador}                 # IDs numéricos secuenciales
├─ vehicles/{contador}
└─ bids/{vehicleId}/{contador}      # contador de ofertas por subasta

users/{userId}/
├─ id, firstName, lastName, email, phone, passwordHash, createdAt

userEmails/{claveEmail}             # índice -> userId   (búsqueda O(1) por correo)

vehicles/{vehicleId}/
├─ id, ownerId, year, itemType, brand, model, engine, transmission, fuel,
│  drivetrain, cylinders, damageLevel, basePrice, currentBid, highestBidderId,
│  startTime, endTime, status, createdAt
└─ images/{imageId}/                # galería: { id, imageUrl, sortOrder }

bids/{vehicleId}/{bidId}/
   └─ id, vehicleId, userId, amount, createdAt
```

- Todos los identificadores son **numéricos y secuenciales** (igual que en la
  versión anterior con SQL Server), generados con `ref.transaction()`.
- `status` de subasta: `ACTIVA` · `VENDIDA` · `DESIERTA`.
- El índice `userEmails` escapa los caracteres no permitidos en llaves de
  Firebase (`.`, `#`, `$`, `[`, `]`, `/`).

---

## 3. Reglas de negocio de la puja

Todas se validan en la capa de aplicación (`PlaceBidUseCase`) y **se vuelven a
validar dentro de la transacción** sobre el valor ya bloqueado:

1. El usuario debe estar autenticado.
2. No se acepta antes de `startTime`.
3. No se acepta después de `endTime`.
4. Sin pujas previas: oferta ≥ `basePrice`.
5. Con pujas previas: oferta ≥ `round2(currentBid × 1.10)`.

**Atomicidad (equivalente al `UPDLOCK` + transacción de SQL Server):**

1. `vehicles/{vehicleId}` se escribe con `ref.transaction(...)`. Realtime
   Database re-evalúa la función si hay escritura concurrente y solo confirma
   cuando el commit es exitoso, por lo que **dos pujas simultáneas no pueden
   leer el mismo `currentBid`**.
2. La validación de negocio corre dentro de esa transacción; si lanza un
   `DomainError`, la transacción se cancela y el error se propaga al cliente.
3. Confirmada la transacción, se guarda la oferta con una actualización
   multi-ruta **atómica e idempotente**, re-afirmando `currentBid` y
   `highestBidderId`.
4. El caso de uso emite el evento `bidUpdated` en la sala `auction-{vehicleId}`.

**Privacidad:** el historial de pujas público solo expone `amount` y
`createdAt`. Nunca se envía `userId`, nombre, correo ni teléfono de los
ofertantes. (`Bid.toPublic()`)

**Cierre de subastas:** con pujas → `VENDIDA`; sin pujas → `DESIERTA`. Un
barrido en `server.js` (cada 60 s) y otro oportunista al listar/detallar un
vehículo cierran las subastas vencidas.

---

## 4. Variables de entorno

Copia `.env.example` a `.env` y completa los valores. `.env` está en
`.gitignore`: **nunca subas credenciales al repositorio**.

```bash
cp .env.example .env        # Linux / macOS
copy .env.example .env      # Windows
```

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | Sí | Project ID de Firebase. |
| `FIREBASE_CLIENT_EMAIL` | Sí | `firebase-adminsdk-xxxxx@…iam.gserviceaccount.com` de la cuenta de servicio. |
| `FIREBASE_PRIVATE_KEY` | Sí | Llave privada de la cuenta de servicio. Admite `\n` escapados. |
| `FIREBASE_DATABASE_URL` | Sí | URL de Realtime Database, sin barra final. |
| `JWT_SECRET` | Sí | Cadena larga y aleatoria para firmar los tokens. |
| `JWT_EXPIRES_IN` | No | Duración del token (por defecto `8h`). |
| `PORT` | No | Puerto HTTP (por defecto `3000`). |
| `HOST` | No | Interfaz de escucha (por defecto `0.0.0.0`). |
| `NODE_ENV` | No | `production` en Render. |

> `FIREBASE_PRIVATE_KEY` se normaliza en tiempo de ejecución con
> `process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')`, que es el formato
> que Render guarda al pegar la llave.

### Cómo obtener las credenciales

1. [Firebase Console](https://console.firebase.google.com/) →
   **Configuración del proyecto → General** → *Project ID* y
   *Your web API key* no hacen falta: se usa la cuenta de servicio.
2. **Configuración → Cuentas de servicio → Generar nueva clave privada**.
3. Descarga el JSON y extrae:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (con los `\n` escapados)
4. En **Realtime Database**, copia la URL que aparece en la pestaña
   *Realtime Database* → `FIREBASE_DATABASE_URL`.
5. Las **reglas de seguridad** pueden quedar abiertas: el backend escribe con
   credenciales administrativas, que ignoran las reglas.

---

## 5. Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Next.js. |
| `npm run dev:socket` | Solo `server.js` (Socket.IO) — requiere `npm run build` previo. |
| `npm run build` | Build de producción. **No necesita credenciales de Firebase.** |
| `npm start` | Producción: `server.js` sirve Next + Socket.IO en `PORT`. |
| `npm run db:init` | Verifica la conexión y escribe metadata en `_meta`. No destructivo. |
| `npm run db:seed` | Carga datos de demostración. Idempotente. |

Flujo recomendado la primera vez:

```bash
npm install
cp .env.example .env     # y completa las credenciales
npm run db:init
npm run db:seed
npm run dev
```

### `npm run db:init`

Firebase no necesita `CREATE TABLE` (el esquema es flexible). El script:

1. Valida que las variables de Firebase estén completas.
2. Verifica la conexión real con Realtime Database.
3. Escribe `initializedAt` y `lastInitCheckAt` en `_meta` sin sobrescribir lo
   existente.
4. Muestra cuántos usuarios, vehículos, imágenes y ofertas hay.

No borra ni sobrescribe datos.

### `npm run db:seed`

- 3 usuarios demo con contraseña `Demo1234` (bcrypt, 10 rounds).
- 8 vehículos: **6 subastas activas** + 1 `VENDIDA` + 1 `DESIERTA`.
- 6 imágenes por vehículo.
- Ofertas de ejemplo que respetan la regla del +10 %.

Es **idempotente**: si se ejecuta varias veces no duplica usuarios ni
vehículos (los detecta por índice de correo y por `owner + marca + modelo + año`)
y jamás borra datos.

| Correo | Contraseña |
| --- | --- |
| `usuario1@demo.com` | `Demo1234` |
| `usuario2@demo.com` | `Demo1234` |
| `usuario3@demo.com` | `Demo1234` |

---

## 6. API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Registro (crea usuario e índice de correo). |
| `POST` | `/api/auth/login` | Inicio de sesión → JWT. |
| `GET` | `/api/auth/me` | Perfil del usuario autenticado. |
| `GET` | `/api/vehicles` | Catálogo con filtros, orden y paginación. |
| `POST` | `/api/vehicles` | Publicar vehículo (requiere sesión). |
| `GET` | `/api/vehicles/[id]` | Detalle con galería e historial público. |
| `PUT` | `/api/vehicles/[id]` | Editar vehículo (solo propietario). |
| `GET` | `/api/vehicles/[id]/bids` | Historial público de pujas. |
| `POST` | `/api/vehicles/[id]/bids` | Registrar oferta (requiere sesión). |
| `GET` | `/api/my-vehicles` | Vehículos del usuario autenticado. |
| `GET` | `/api/health` | Health check. |

### Health check

```json
{
  "status": "ok",
  "database": "connected",
  "provider": "firebase-realtime-database",
  "auctions": 8,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Si Firebase no responde, el endpoint sigue devolviendo `200` con
`"database": "disconnected"` (el deploy no se cae), y el mensaje de error **no**
expone secretos.

### Cuentas de evaluación (creadas por `npm run db:seed`)

La pantalla de login **no muestra credenciales** por seguridad. Las cuentas de
demostración se crean en Firebase al ejecutar el seed y son las que debe usar el
docente para evaluar:

| Correo | Contraseña |
| --- | --- |
| `usuario1@demo.com` | `Demo1234` |
| `usuario2@demo.com` | `Demo1234` |
| `usuario3@demo.com` | `Demo1234` |

Los tres usuarios existen en Firebase (`users/3`, `users/4`, `users/5`) con hash
bcrypt. Cualquiera de los tres puede ofertar y publicar vehículos. Para crear
cuentas nuevas, registrarte desde `/register`.

### Tiempo real (Socket.IO)

El cliente se une a la sala `auction-{vehicleId}` y recibe `bidUpdated`:

```json
{
  "vehicleId": 1,
  "currentBid": 21780,
  "minimumBid": 23958,
  "highestBidderId": 3,
  "endTime": "2026-01-02T18:00:00.000Z",
  "status": "ACTIVA",
  "bids": [{ "amount": 19800, "createdAt": "..." }]
}
```

---

## 7. Despliegue en Render

1. Sube el proyecto a un repositorio Git.
2. En Render: **New → Web Service** → conecta el repositorio.
3. Configuración:
   - **Runtime:** Node
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
4. En **Environment** agrega las variables:

   ```
   FIREBASE_PROJECT_ID=...
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@...iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n
   FIREBASE_DATABASE_URL=https://subastas-vehiculos-marielos-default-rtdb.firebaseio.com
   JWT_SECRET=<cadena larga y aleatoria>
   ```
5. **Save & Deploy**. `npm start` ejecuta `server.js`, que sirve Next y
   Socket.IO en el mismo proceso y puerto.

> `next build` no se conecta a Firebase (la inicialización es *lazy*), así que
> el build en Render no necesita credenciales. Los scripts `db:init` y
> `db:seed` sí las necesitan: ejecútalos localmente o desde la Shell de Render.

---

## 8. Migración desde SQL Server

La versión anterior usaba **SQL Server** (`mssql`, pool, esquema y
transacciones con `UPDLOCK`). Todo eso fue eliminado:

- Dependencia `mssql` desinstalada; `firebase-admin` agregada.
- `src/infrastructure/database/mssql-pool.js`, `schema.js` y `sql-types.js`
  eliminados.
- `mssql-user.repository.js`, `mssql-vehicle.repository.js` y
  `mssql-bid.repository.js` reemplazados por los adaptadores `firebase-*`.
- `src/domain/ports/database.port.js` (nuevo) define el puerto de salud.
- `scripts/init-db.js` y `scripts/seed.js` reescritos para Firebase.
- El barrido de subastas vencidas de `server.js` usa
  `vehicleRepository.closeExpiredAuctions()`.
- `package.json`: sin cambios en los nombres de los scripts (`db:init`,
  `db:seed`); ya no se pasan credenciales de base de datos al servidor.

No hay referencias residuales a SQL Server en el código (solo la mención
histórica de esta sección del README).
