# ✅ Paso 1.3 verificado — Avanzamos al Paso 1.4

Las 3 salidas son correctas:

| Verificación          | Resultado                                                                      |
| ---------------------- | ------------------------------------------------------------------------------ |
| `GET /`              | ✅ `{ success:true, message:"PQRS API", ... }`                               |
| `GET /api/v1/health` | ✅ `"database": "conectada"`, `uptime:29`, `environment:"development"`   |
| `GET /no-existe`     | ✅ 404 con `{ success:false, message:"Ruta no encontrada: GET /no-existe" }` |

Formato uniforme funcionando. Express, helmet, cors, morgan, json, el handler async y el 404 están bien montados.

> **Sobre el `Ctrl+C`:** el `⚠️ SIGINT recibido` sí apareció, pero `✅ Servidor y BD cerrados` no se vio. En una de dos: nodemon mató al proceso antes de imprimir, o `server.close()` espera a que las conexiones keep-alive del navegador se liberen. **No bloquea el avance** — lo refinamos en 1.6 cuando extraigamos el errorHandler, agregando `server.closeAllConnections()` si sigue haciendo falta. Lo dejo anotado.

---

## 📦 Paso 1.4 — Ajustes de Base de Datos

Ahora debemos hacer unos ajustes a la BD. Dos cambios:

1. Agregar `is_internal` a `pqrs_response` (para distinguir respuesta al ciudadano vs. nota interna).
2. Migrar `module_role_user` a `user_role_id` (elimina `role_id` + `user_id` redundantes).

Ambos scripts son **idempotentes** (se pueden correr varias veces sin romper nada) y la migración usa **transacción con rollback**.

---

### 1.4.1 — `scripts/add-is-internal.js`

Crea el archivo **`scripts/add-is-internal.js`**:

```javascript
// scripts/add-is-internal.js
// Agrega la columna is_internal a pqrs_response (idempotente)
require('dotenv').config();
const sequelize = require('../src/config/database');

async function run() {
  const qi = sequelize.getQueryInterface();
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a MySQL');

    const desc = await qi.describeTable('pqrs_response');
    if (desc.is_internal) {
      console.log('ℹ️  La columna is_internal ya existe. Nada que hacer.');
      return;
    }

    await qi.addColumn('pqrs_response', 'is_internal', {
      type: sequelize.Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      after: 'message',
      comment: '0 = respuesta visible al ciudadano, 1 = nota interna',
    });

    console.log('✅ Columna is_internal agregada a pqrs_response');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
```

---

### 1.4.2 — `scripts/migrate-module-role-user.js`

Crea el archivo **`scripts/migrate-module-role-user.js`**:

```javascript
// scripts/migrate-module-role-user.js
// Migra module_role_user: (user_id, role_id) → user_role_id
// Idempotente + transacción con rollback
require('dotenv').config();
const sequelize = require('../src/config/database');

async function run() {
  const qi = sequelize.getQueryInterface();
  const t = await sequelize.transaction();

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a MySQL');

    const desc = await qi.describeTable('module_role_user');

    // --- Caso 1: ya migrada ---
    if (desc.user_role_id && !desc.user_id && !desc.role_id) {
      console.log('ℹ️  module_role_user ya está migrada. Nada que hacer.');
      await t.rollback();
      return;
    }

    // --- Caso 2: migración parcial (user_role_id existe pero quedan user_id/role_id) ---
    // Se repara poblando lo que falte
    if (!desc.user_role_id) {
      console.log('▶️  Agregando columna user_role_id...');
      await qi.addColumn(
        'module_role_user',
        'user_role_id',
        { type: sequelize.Sequelize.INTEGER, allowNull: true },
        { transaction: t }
      );
    }

    console.log('▶️  Poblando user_role_id desde user_role (user_id, role_id)...');
    const [updatedRows] = await sequelize.query(
      `UPDATE module_role_user mru
         JOIN user_role ur
           ON ur.user_id = mru.user_id AND ur.role_id = mru.role_id
         SET mru.user_role_id = ur.id
       WHERE mru.user_role_id IS NULL`,
      { transaction: t }
    );
    console.log(`   Filas actualizadas: ${updatedRows}`);

    // Verificar que no quede ninguna sin mapear
    const [nullRows] = await sequelize.query(
      `SELECT COUNT(*) AS c FROM module_role_user WHERE user_role_id IS NULL`,
      { transaction: t }
    );
    if (Number(nullRows[0].c) > 0) {
      throw new Error(
        `Hay ${nullRows[0].c} filas sin user_role_id. Migración abortada para no perder datos.`
      );
    }
    console.log('✅ Todas las filas tienen user_role_id');

    // --- Eliminar FKs y columnas viejas ---
    console.log('▶️  Eliminando FKs y columnas role_id / user_id...');

    // Obtener FKs existentes para borrarlas correctamente
    const [fks] = await sequelize.query(
      `SELECT CONSTRAINT_NAME
         FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'module_role_user'
          AND COLUMN_NAME IN ('role_id','user_id')
          AND REFERENCED_TABLE_NAME IS NOT NULL`,
      { transaction: t }
    );
    for (const row of fks) {
      await sequelize.query(
        `ALTER TABLE module_role_user DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``,
        { transaction: t }
      );
    }

    // Índice UNIQUE antiguo (uk que incluía role_id/user_id)
    const [indexes] = await sequelize.query(
      `SHOW INDEX FROM module_role_user WHERE Column_name IN ('role_id','user_id')`,
      { transaction: t }
    );
    const seenIndexes = new Set();
    for (const row of indexes) {
      const name = row.Key_name;
      if (name === 'PRIMARY' || seenIndexes.has(name)) continue;
      seenIndexes.add(name);
      await sequelize.query(
        `ALTER TABLE module_role_user DROP INDEX \`${name}\``,
        { transaction: t }
      );
    }

    await qi.removeColumn('module_role_user', 'role_id', { transaction: t });
    await qi.removeColumn('module_role_user', 'user_id', { transaction: t });

    // --- Hacer user_role_id NOT NULL + FK + UNIQUE ---
    await sequelize.query(
      `ALTER TABLE module_role_user
         MODIFY user_role_id INT NOT NULL,
         ADD CONSTRAINT fk_mru_user_role FOREIGN KEY (user_role_id)
            REFERENCES user_role(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD UNIQUE KEY uk_mru (user_role_id, module_id, permission_id)`,
      { transaction: t }
    );

    await t.commit();
    console.log('🎉 Migración completada correctamente');
  } catch (err) {
    console.error('❌ Error:', err.message);
    await t.rollback();
    console.error('↩️  Rollback aplicado (la BD quedó como estaba)');
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
```

**Qué hace paso a paso:**

1. **Detecta** si ya está migrada → no hace nada.
2. **Agrega** `user_role_id` (nullable al principio).
3. **Pobla** `user_role_id` haciendo join `module_role_user.user_id+role_id → user_role.id`.
4. **Verifica** que ninguna fila quede con `NULL`. Si queda, aborta.
5. **Elimina** FKs e índices viejos, luego las columnas `role_id` y `user_id`.
6. **Recrea** `user_role_id` como `NOT NULL` con FK y UNIQUE `(user_role_id, module_id, permission_id)`.
7. Todo en **una transacción**. Si algo falla, rollback total.

> 🛡️ **Importante:** antes de correrlo, **respalda la BD** (por si acaso). Comando rápido:
>
> ```powershell
> mysqldump -u root pqrs_system > backup_pqrs_system.sql
> ```
>
> Si no tienes `mysqldump` en el PATH, usa phpMyAdmin → Exportar.

---

### 1.4.3 — Actualizar `package.json` con los nuevos scripts

Abre `package.json` y **reemplaza la sección `"scripts"`** por:

```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "add:is-internal": "node scripts/add-is-internal.js",
  "migrate:mru": "node scripts/migrate-module-role-user.js"
},
```

(Deja el resto del `package.json` intacto.)

---

## ✅ Verificación del Paso 1.4

Sigue el orden. 

### Paso A — Respaldo (obligatorio)

```powershell
cd C:\xampp\htdocs\SENA\Back-end\node.js\pqrs-backend
mysqldump -u root pqrs_system > backup_pqrs_system.sql
```

Si `mysqldump` no está en PATH: abre phpMyAdmin → selecciona `pqrs_system` → Exportar → SQL → Guardar.

Verifica que `backup_pqrs_system.sql` exista y pese > 0 KB.

### Paso B — Ejecutar `add:is-internal`

```powershell
npm run add:is-internal
```

**Salida esperada:**

```
✅ Conectado a MySQL
✅ Columna is_internal agregada a pqrs_response
```

Si lo corres otra vez:

```
ℹ️  La columna is_internal ya existe. Nada que hacer.
```

### Paso C — Verificar la columna con SQL

```powershell
mysql -u root pqrs_system -e "DESCRIBE pqrs_response;"
```

Debe aparecer una fila `is_internal | tinyint(1) | NO | | 0 |` justo después de `message`.

### Paso D — Ejecutar `migrate:mru`

```powershell
npm run migrate:mru
```

**Salida esperada (primera ejecución):**

```
✅ Conectado a MySQL
▶️  Agregando columna user_role_id...
▶️  Poblando user_role_id desde user_role (user_id, role_id)...
   Filas actualizadas: 21
✅ Todas las filas tienen user_role_id
▶️  Eliminando FKs y columnas role_id / user_id...
🎉 Migración completada correctamente
```

**Segunda ejecución (debe ser no-op):**

```
ℹ️  module_role_user ya está migrada. Nada que hacer.
```

### Paso E — Verificar el resultado

```powershell
mysql -u root pqrs_system -e "DESCRIBE module_role_user;"
mysql -u root pqrs_system -e "SELECT COUNT(*) AS total FROM module_role_user;"
mysql -u root pqrs_system -e "SELECT DISTINCT user_role_id FROM module_role_user;"
```

**Resultado esperado:**

- `DESCRIBE` muestra columnas: `id, user_role_id, module_id, permission_id, created_at, updated_at`. **Ya NO** deben aparecer `user_id` ni `role_id`.
- `total` → `21` (se conservaron las 21 filas).
- `DISTINCT user_role_id` → solo `1` (todos apuntan al `user_role` del admin).

### Paso F — El servidor sigue funcionando

```powershell
npm run dev
```

Y en otra terminal:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health | ConvertTo-Json -Depth 5
```

Debe seguir devolviendo `"database": "conectada"`. (Los cambios de 1.4 aún no afectan a `/health`, pero confirman que la BD quedó consistente.)

---

## 🚦 Antes de avanzar al 1.5

Cuando termines, pégame:

1. **Salida de B** (`add:is-internal`)
2. **Salida de C** (`DESCRIBE pqrs_response` filtrado a `is_internal`)
3. **Salida de D** (`migrate:mru`, primera ejecución y segunda ejecución)
4. **Salida de E** (`DESCRIBE module_role_user` + `COUNT` + `DISTINCT user_role_id`)
5. **Estado de `/health`** tras los cambios (`"conectada"`)

Con esas 5 salidas verdes, paso a **1.5 — Modelos Sequelize**, que es donde reflejamos estas dos estructuras nuevas (`PqrsResponse.is_internal`, `ModuleRoleUser.user_role_id`) en código y verificamos que leen las tablas reales.

**No pasamos a 1.5 hasta que 1.4 esté 100% verificado.**
