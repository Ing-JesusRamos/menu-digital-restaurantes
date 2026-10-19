# Plataforma de menu digital para restaurantes

Aplicacion web para que los restaurantes publiquen su menu, reciban pedidos desde la mesa mediante un enlace o codigo QR y los gestionen en tiempo real. El cliente abre la carta sin instalar nada, arma su pedido y lo envia; el restaurante lo recibe al instante.

## Stack

- **Next.js 16** (App Router) con TypeScript: frontend y API en un mismo proyecto.
- **Drizzle ORM** sobre **PostgreSQL** (compatible con Supabase).
- **Supabase** para autenticacion y datos (cliente `@supabase/ssr`).
- **Zod** para validacion de entrada, **Pino** para logs y **Vitest** para pruebas.
- Documentacion de API con OpenAPI/Swagger (`next-swagger-doc`, Scalar).
- Gestor de paquetes: **pnpm**.

## Estructura

El codigo vive en `backend/`:

- `src/app/` - rutas de Next.js (paginas y API, incluidas las rutas publicas de pedidos).
- `src/lib/` - logica compartida: acceso a datos, seguridad y utilidades.
- `drizzle/` - esquema y migraciones de la base de datos.
- `scripts/` - utilidades (`seed.ts` para datos de ejemplo y verificacion de autenticacion).
- `docker-compose.yml` - PostgreSQL local para desarrollo.

## Requisitos

- Node.js 20 o superior y pnpm 11.
- PostgreSQL (local mediante Docker, o un proyecto de Supabase).

## Puesta en marcha

```bash
cd backend
pnpm install

# Variables de entorno
cp .env.example .env.local   # completa DATABASE_URL y las claves de Supabase

# Base de datos local (opcional, con Docker)
docker compose up -d

# Esquema y datos de ejemplo
pnpm db:push
pnpm db:seed

# Servidor de desarrollo
pnpm dev
```

La aplicacion queda disponible en http://localhost:3000.

## Scripts utiles

- `pnpm dev` - entorno de desarrollo.
- `pnpm build` / `pnpm start` - build de produccion y arranque.
- `pnpm typecheck` - verificacion de tipos.
- `pnpm test` - pruebas con Vitest.
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:push` - migraciones con Drizzle.

## Seguridad

Las credenciales reales van en `backend/.env.local`, que esta ignorado por git y no se publica. Usa `backend/.env.example` como plantilla. Nunca subas claves de base de datos ni tokens al repositorio.
