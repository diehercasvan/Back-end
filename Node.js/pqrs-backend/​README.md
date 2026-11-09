# PQRS Backend

API REST del sistema PQRS — Node.js + Express + Sequelize + MySQL.

## Requisitos

- Node.js >= 18
- MySQL / MariaDB con la base `pqrs_system` volcada

## Instalación

1. `npm install`
2. Copiar `.env.example` a `.env` y ajustar credenciales reales + `JWT_SECRET` (32+ chars)
3. `npm run dev`
4. Verificar: `http://localhost:3000/api/v1/health`

## Scripts

| Comando         | Descripción                          |
| --------------- | ------------------------------------- |
| `npm run dev` | Servidor en modo desarrollo (nodemon) |
| `npm start`   | Servidor en modo producción          |

## Estado

- [X] 1.1 Estructura y archivos base
- [ ] 1.2 Config (env + database)
- [ ] 1.3 app.js + server.js (health check)
- [ ] 1.4 Ajustes BD (is_internal + user_role_id)
- [ ] 1.5 Modelos Sequelize
- [ ] 1.6 Utils + middlewares base
- [ ] 1.7 Auth (login, me, select-role)
- [ ] 1.8 Swagger + Postman + fix-seed
