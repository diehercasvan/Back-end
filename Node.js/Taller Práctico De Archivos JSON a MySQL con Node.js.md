# Taller Práctico: De Archivos JSON a MySQL con Node.js

Este taller está diseñado para que construyas una API REST completa, evolucionando el almacenamiento de datos en tres momentos: comenzando con la simplicidad de los archivos JSON, pasando por la ligereza de SQLite, y terminando con la robustez de MySQL. La arquitectura se mantendrá descentralizada (Rutas, Controladores, Modelos) para que el cambio de motor de base de datos no afecte la lógica de tu servidor.

El caso de uso será la gestión de **"Productos"** (con campos como `id`, `nombre`, `precio`, `stock`).

---

### Estructura del Proyecto (Arquitectura Descentralizada)

Para los tres momentos, mantendremos la misma estructura de carpetas, cambiando únicamente la implementación dentro de la carpeta `models` o `config`.

```text
mi-api-productos/
├── src/
│   ├── config/          # Conexiones a BD (JSON, SQLite, MySQL)
│   ├── controllers/     # Lógica de negocio (req, res)
│   ├── models/          # Acceso a datos (Lectura/Escritura)
│   ├── routes/          # Definición de endpoints
│   └── app.js           # Configuración de Express
├── data/                # Almacenamiento físico (JSON, .db)   
├── .env                 # Variables de entorno
├── package.json
└── server.js
```

**Dependencias base:**

```bash
npm init -y
npm install express
npm install -D nodemon
```

---

### Momento 1: Manejo de Archivos con JSON

**Objetivo:** Entender el flujo de datos y la asincronía del sistema de archivos (`fs`) sin depender de un motor de base de datos externo.

**Configuración (`src/config/jsonDb.js`):**
Usaremos el módulo nativo `fs/promises` para leer y escribir el archivo `productos.json`. Si el archivo no existe, lo creamos con un array vacío.

```javascript
const fs = require('fs/promises');
const path = require('path');

// Ruta absoluta basada en la raíz del proyecto (donde está package.json)
// process.cwd() = directorio desde donde ejecutas `node server.js`
const filePath = path.join(process.cwd(), 'data', 'productos.json');

/**
 * Asegura que el archivo exista y no esté vacío.
 * - Si no existe: lo crea con "[]" en UTF-8 puro (sin BOM)
 * - Si está vacío (0 bytes): lo reinicia con "[]"
 */
const asegurarArchivo = async () => {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      console.log('🆕 Archivo JSON vacío, reiniciando a []');
      await fs.writeFile(filePath, '[]', 'utf-8');
    }
  } catch {
    console.log('🆕 Archivo JSON no existe, creándolo con []');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, '[]', 'utf-8');
  }
};

/**
 * Lee el JSON del disco.
 * - Limpia BOM UTF-8 y UTF-16 si existen
 * - Si el JSON está corrupto, lo reinicia a [] (auto-reparable)
 */
const leerDatos = async () => {
  await asegurarArchivo();

  const buffer = await fs.readFile(filePath);
  let texto = buffer.toString('utf-8');

  // Quitar BOM UTF-8 (EF BB BF → U+FEFF)
  if (texto.charCodeAt(0) === 0xfeff) {
    texto = texto.slice(1);
  }

  // Quitar BOM UTF-16 residual
  if (texto.charCodeAt(0) === 0xfffe) {
    texto = texto.slice(1);
  }

  // Archivo con solo espacios o saltos de línea
  if (texto.trim() === '') {
    return [];
  }

  try {
    return JSON.parse(texto);
  } catch (error) {
    console.error('⚠️ JSON corrupto, reiniciando archivo. Inicio del contenido:', JSON.stringify(texto.slice(0, 40)));
    await fs.writeFile(filePath, '[]', 'utf-8');
    return [];
  }
};

/**
 * Escribe los datos en disco en UTF-8 sin BOM (fs.writeFile lo hace por defecto).
 */
const escribirDatos = async (datos) => {
  await fs.writeFile(filePath, JSON.stringify(datos, null, 2), 'utf-8');
};

/**
 * Inicializador invocado desde server.js al arrancar.
 */
const inicializarDB = async () => {
  await asegurarArchivo();
  console.log('✅ JSON DB lista en:', filePath);
};

module.exports = { inicializarDB, leerDatos, escribirDatos };
```

**Modelo (`src/models/productoModelJson.js`):**
Implementamos el CRUD básico. Nota cómo el controlador no sabe que es un archivo, solo llama a funciones del modelo.

```javascript
const { leerDatos, escribirDatos } = require('../config/jsonDb');

/**
 * Retorna todos los productos.
 */
const getAll = async () => {
  const productos = await leerDatos();
  return productos;
};

/**
 * Retorna un producto por su id (string, porque en JSON usamos timestamp).
 */
const getById = async (id) => {
  const productos = await leerDatos();
  return productos.find((p) => p.id === String(id)) || null;
};

/**
 * Crea un producto con id basado en timestamp.
 */
const create = async (producto) => {
  if (!producto || typeof producto !== 'object' || Array.isArray(producto)) {
    const err = new Error('Se esperaba un objeto con nombre y precio');
    err.status = 400;
    throw err;
  }

  const { nombre, precio, stock } = producto;

  if (!nombre || precio === undefined) {
    const err = new Error('nombre y precio son obligatorios');
    err.status = 400;
    throw err;
  }

  const productos = await leerDatos();

  const nuevo = {
    id: Date.now().toString(),
    nombre,
    precio: Number(precio),
    stock: Number(stock ?? 0),
  };

  productos.push(nuevo);
  await escribirDatos(productos);

  return nuevo;
};

/**
 * Actualiza un producto existente por id.
 */
const update = async (id, datos) => {
  const productos = await leerDatos();
  const index = productos.findIndex((p) => p.id === String(id));

  if (index === -1) {
    return null;
  }

  const actualizado = {
    ...productos[index],
    ...datos,
    id: productos[index].id, // el id no se puede cambiar
  };

  productos[index] = actualizado;
  await escribirDatos(productos);

  return actualizado;
};

/**
 * Elimina un producto por id.
 */
const remove = async (id) => {
  const productos = await leerDatos();
  const filtrados = productos.filter((p) => p.id !== String(id));

  if (filtrados.length === productos.length) {
    return false; // no se eliminó nada
  }

  await escribirDatos(filtrados);
  return true;
};

module.exports = { getAll, getById, create, update, remove };
```

---

### Momento 2: Manejo de Información en SQLite

**Objetivo:** Migrar a un motor SQL real, ligero y basado en archivos, ideal para desarrollo o despliegues de un solo servidor. Usaremos `better-sqlite3` por su velocidad y simplicidad síncrona (aunque envuelta en promesas para mantener la consistencia de la API) .

**Instalación:**

```bash
npm install better-sqlite3
```

**Configuración (`src/config/sqliteDb.js`):**
Creamos la conexión y la tabla si no existe. Usamos modo WAL para mejorar el rendimiento .

```javascript
const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../../data/productos.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Inicialización de la tabla
db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    stock INTEGER DEFAULT 0
  )
`);

module.exports = db;
```

**Modelo (`src/models/productoModelSqlite.js`):**
Las consultas son SQL estándar. `better-sqlite3` es síncrono, pero mantenemos la firma de la función similar al JSON.

```javascript
const db = require('../config/sqliteDb');

const getAll = async () => {
  return db.prepare('SELECT * FROM productos').all();
};

const create = async (producto) => {
  const stmt = db.prepare('INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)');
  const info = stmt.run(producto.nombre, producto.precio, producto.stock);
  return { id: info.lastInsertRowid, ...producto };
};

// ... Implementar getById, update y delete
module.exports = { getAll, create };
```

---

### Momento 3: Manejo de Información en MySQL (API Final)

**Objetivo:** Llevar la aplicación a un entorno de producción utilizando un motor cliente-servidor. Usaremos `mysql2` con promesas para manejar la concurrencia .

**Base de datos:**

```sql
--
-- Base de datos: `taller_node`
--
CREATE DATABASE IF NOT EXISTS `taller_node` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `taller_node`;
-- --------------------------------------------------------
--
-- Estructura de tabla para la tabla `productos`
--
DROP TABLE IF EXISTS `productos`;
CREATE TABLE IF NOT EXISTS `productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `stock` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
COMMIT;
```

**Instalación:**

```bash
npm install mysql2 dotenv
```

**Configuración (`src/config/mysqlDb.js`):**
Es crucial usar variables de entorno para las credenciales. Creamos un pool de conexiones para manejar múltiples solicitudes de manera eficiente.

```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'taller_node',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función de inicialización (ejecutar una vez al arrancar)
const initDB = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      precio DECIMAL(10,2) NOT NULL,
      stock INT DEFAULT 0
    )
  `;
  await pool.query(query);
};

module.exports = { pool, initDB };
```

**Modelo (`src/models/productoModelMysql.js`):**
Usamos consultas parametrizadas para prevenir inyección SQL .

```javascript
const { pool } = require('../config/mysqlDb');

const getAll = async () => {
  const [rows] = await pool.query('SELECT * FROM productos');
  return rows;
};

const create = async (producto) => {
  const query = 'INSERT INTO productos(nombre, precio, stock) VALUES (?, ?, ?)';
    console.log('Consulta',query);
  const [result] = await pool.execute(query, [producto.nombre, producto.precio, producto.stock]);

  return { id: result.insertId, ...producto };
};

// ... Implementar getById, update y delete
module.exports = { getAll, create };
```

---

### El Controlador y las Rutas (Constantes en los 3 Momentos)

La magia de la arquitectura descentralizada es que el **Controlador** y la **Ruta** son idénticos en los tres momentos. Solo cambia la importación del modelo en el controlador (o usas una variable de entorno para seleccionar el modelo).

**Controlador (`src/controllers/productoController.js`):**

```javascript
// Cambiar esta línea según el momento del taller:
 //const Producto = require('../models/productoModelJson');
 //const Producto = require('../models/productoModelSqlite');
const Producto = require('../models/productoModelMysql');

const listar = async (req, res) => {
  try {
    const productos = await Producto.getAll();
   
    res.json(productos);
  } catch (error) {
  
     console.error('❌ Error en listar:', error.message); // 👈 ¿existe esta línea?
    res.status(500).json({ error: error.message });  
  }
};

const crear = async (req, res) => {
  try {
   
    const nuevo = await Producto.create(req.body);
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear producto' });
  }
};

module.exports = { listar, crear };
```

**Ruta (`src/routes/productoRoutes.js`):**

```javascript
const { Router } = require('express');
const controller = require('../controllers/productoController');
const router = Router();

router.get('/', controller.listar);
router.post('/', controller.crear);

module.exports = router;
```

**App (`src/app.js`):**

```javascript
const express = require('express');
const productoRoutes = require('./routes/productoRoutes');
const app = express();

app.use(express.json());
app.use('/api/productos', productoRoutes);

module.exports = app;
```

**Servidor (`server.js`):**

```javascript
const app = require('./src/app');
// Importar la inicialización correspondiente según el momento:
 const { inicializarDB } = require('./src/config/jsonDb');
 const db = require('./src/config/sqliteDb'); // Solo con require ya crea la tabla
const { initDB } = require('./src/config/mysqlDb');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await inicializarDB(); // Crea data/productos.json si no existe
    app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
  } catch (error) {
    console.error('❌ Error al iniciar:', error.message);
    process.exit(1);
  }
};

start();
```

---

### Ejecución

```Shell
npm run dev
```

### Ajustar el archivo de ejecución

`Servidor (package.json):`

```JSON
{
  "name": "mi-api-productos",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "better-sqlite3": "^13.0.3",
    "dotenv": "^18.0.9",
    "express": "^5.3.0",
    "mysql2": "^3.24.6"
  },
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}
```

## Resultados esperados paso a paso

## 📋 Tabla Completa de Peticiones

| #  | Método | URL                                 | Cabeceras                      | Body (raw → JSON)                                                                       | Respuesta esperada                                                                                                                                                                                   |
| -- | ------- | ----------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | GET     |                                     | (ninguna adicional)            | (vacío)                                                                                 | 200 OK<br />[]                                                                                                                                                                                       |
| 2  | POST    |                                     | Content-Type: application/json | {<br />"nombre": "Laptop HP",<br />"precio": 2500000,<br />"stock": 10<br />}            | 201 Created<br />{<br />"id": "1730851200000",<br />"nombre": "Laptop HP",<br />"precio": 2500000,<br />"stock": 10<br />}                                                                           |
| 3  | POST    |                                     | Content-Type: application/json | {<br />"nombre": "Mouse Logitech",<br />"precio": 85000,<br />"stock": 30<br />}         | 201 Created<br />{<br />"id": "1730851200500",<br />"nombre": "Mouse Logitech",<br />"precio": 85000,<br />"stock": 30<br />}                                                                        |
| 4  | GET     |                                     | (ninguna adicional)            | (vacío)                                                                                 | 200 OK<br />[<br />{ "id": "1730851200000", "nombre": "Laptop HP", "precio": 2500000, "stock": 10 },<br />{ "id": "1730851200500", "nombre": "Mouse Logitech", "precio": 85000, "stock": 30 }<br />] |
| 5  | GET     |                                     | (ninguna adicional)            | (vacío)                                                                                 | 200 OK<br />{<br />"id": "1730851200000",<br />"nombre": "Laptop HP",<br />"precio": 2500000,<br />"stock": 10<br />}                                                                                |
| 6  | GET     |                                     | (ninguna adicional)            | (vacío)                                                                                 | 404 Not Found<br />{ "error": "Producto no encontrado" }                                                                                                                                             |
| 7  | PUT     |                                     | Content-Type: application/json | {<br />"nombre": "Laptop HP Actualizada",<br />"precio": 2700000,<br />"stock": 8<br />} | 200 OK<br />{<br />"id": "1730851200000",<br />"nombre": "Laptop HP Actualizada",<br />"precio": 2700000,<br />"stock": 8<br />}                                                                     |
| 8  | PUT     |                                     | Content-Type: application/json | {<br />"nombre": "No existe",<br />"precio": 100<br />}                                  | 404 Not Found<br />{ "error": "Producto no encontrado" }                                                                                                                                             |
| 9  | DELETE  |                                     | (ninguna adicional)            | (vacío)                                                                                 | 204 No Content<br />*(cuerpo vacío)*                                                                                                                                                              |
| 10 | DELETE  |                                     | (ninguna adicional)            | (vacío)                                                                                 | 404 Not Found<br />{ "error": "Producto no encontrado" }                                                                                                                                             |
| 11 | POST    |                                     | Content-Type: application/json | {<br />"precio": 500000<br />}                                                           | 400 Bad Request<br />{ "error": "nombre y precio son obligatorios" }                                                                                                                                 |
| 12 | POST    |                                     | Content-Type: application/json | [<br />{ "nombre": "X", "precio": 1, "stock": 1 }<br />]                                 | 400 Bad Request<br />{ "error": "Se esperaba un objeto con nombre y precio" }                                                                                                                        |
| 13 | POST    |                                     | Content-Type: text/plain       | nombre=Laptop&precio=100<br />(enviado como text)                                        | 400 Bad Request<br />{ "error": "nombre y precio son obligatorios" }<br />(porque express.json no parsea text/plain)                                                                                 |
| 14 | GET     | http://localhost:3000/api/productos | (ninguna adicional)            | (vacío)                                                                                 | 200 OK<br />[<br />{ "id": "1730851200500", "nombre": "Mouse Logitech", "precio": 85000, "stock": 30 }<br />]<br />(solo queda Mouse porque Laptop fue eliminada en paso 9)                          |

⚠️ **Nota sobre el campo `id`:** Los valores `1730851200000` y `1730851200500` son  **ejemplos ilustrativos** . En tu ejecución real serán timestamps diferentes (el momento exacto en que hiciste el POST). Copia el `id` real que devuelve tu POST y úsalo en los `GET /:id`, `PUT` y `DELETE`.

## 🖥️ Cómo Configurar Cada Petición en Postman (paso a paso)

### Petición 1 — Listar productos (GET inicial)

1. Abre Postman →  **"New" → "HTTP Request"** .
2. Cambia el método a  **`GET`** .
3. En la URL escribe: `http://localhost:3000/api/productos`.
4. No toques **Headers** ni  **Body** .
5. Clic en  **"Send"** .

**Respuesta esperada:**

**text**

```
Status: 200 OK
Body:
[]
```

---

### Petición 2 — Crear producto (POST)

1. Nueva pestaña → método  **`POST`** .
2. URL: `http://localhost:3000/api/productos`.
3. Pestaña **"Headers"** → verifica que esté:
   **text**

   ```
   Content-Type    application/json
   ```

   *(Postman lo agrega solo cuando eliges JSON en Body).*
4. Pestaña **"Body"** → selecciona  **"raw"** .
5. Al lado derecho de "raw", elige el tipo **"JSON"** (dropdown).
6. Pega:
   **json**

   ```
   {
     "nombre": "Laptop HP",
     "precio": 2500000,
     "stock": 10
   }
   ```
7. Clic en  **"Send"** .

**Respuesta esperada:**

**text**

```
Status: 201 Created
Body:
{
  "id": "1730851200000",
  "nombre": "Laptop HP",
  "precio": 2500000,
  "stock": 10
}
```

> 💡 **Copia el `id` real que te devuelva.** Lo usarás en las peticiones 5, 7, 9.

---

### Petición 3 — Crear segundo producto

Igual que la #2, pero con:

**json**

```
{
  "nombre": "Mouse Logitech",
  "precio": 85000,
  "stock": 30
}
```

---

### Petición 4 — Listar todos

Igual que la #1. Debes ver los 2 productos.

---

### Petición 5 — Obtener por ID

1. Método  **`GET`** .
2. URL: `http://localhost:3000/api/productos/`**+ el id real** (ej: `1730851200000`).
3. Sin headers ni body.
4. **"Send"** .

---

### Petición 6 — Obtener ID inexistente

Igual que #5, pero con un id que no exista (ej: `9999999999999`).

**Respuesta esperada:**

**text**

```
Status: 404 Not Found
{ "error": "Producto no encontrado" }
```

---

### Petición 7 — Actualizar producto (PUT)

1. Método  **`PUT`** .
2. URL: `http://localhost:3000/api/productos/` **+ id real** .
3. Headers: `Content-Type: application/json`.
4. Body → raw → JSON:
   **json**

   ```
   {
     "nombre": "Laptop HP Actualizada",
     "precio": 2700000,
     "stock": 8
   }
   ```
5. **"Send"** .

---

### Petición 8 — Actualizar ID inexistente

Igual que #7 pero con id inexistente → `404`.

---

### Petición 9 — Eliminar producto

1. Método  **`DELETE`** .
2. URL: `http://localhost:3000/api/productos/` **+ id real** .
3. Sin body.
4. **"Send"** .

**Respuesta esperada:**

**text**

```
Status: 204 No Content
(cuerpo vacío)
```

---

### Petición 10 — Eliminar el mismo otra vez

Mismo URL → **404 Not Found** porque ya no existe.

---

### Petición 11 — Validar error (sin nombre)

POST con body:

**json**

```
{
  "precio": 500000
}
```

**Respuesta esperada:**

**text**

```
Status: 400 Bad Request
{ "error": "nombre y precio son obligatorios" }
```

---

### Petición 12 — Validar error (enviar array)

POST con body:

**json**

```
[
  { "nombre": "X", "precio": 1, "stock": 1 }
]
```

**Respuesta esperada:**

**text**

```
Status: 400 Bad Request
{ "error": "Se esperaba un objeto con nombre y precio" }
```

> Esta prueba valida que el bug del array está **protegido** por el modelo `productoModelJson.js` (validación `Array.isArray`).

---

### Petición 13 — Validar Content-Type incorrecto

1. Método  **`POST`** .
2. Body → **"raw"** → tipo **"Text"** (no JSON).
3. Contenido: `nombre=Laptop&precio=100`.
4. **"Send"** .

**Respuesta esperada:**

**text**

```
Status: 400 Bad Request
{ "error": "nombre y precio son obligatorios" }
```

Esto demuestra que `express.json()`**ignora** los bodies que no son `application/json` → `req.body` queda vacío → el modelo lo rechaza.

---

### Petición 14 — Estado final

GET a `/api/productos`. Solo debe quedar el producto "Mouse Logitech" (porque "Laptop HP" fue eliminada en el paso 9).

### Entregables y Evaluación del Taller

Para considerar el taller completado, el estudiante debe entregar un repositorio con **tres ramas (branches)** o **tres carpetas** (`momento1-json`, `momento2-sqlite`, `momento3-mysql`) donde se demuestre, el manejo de crud para cada uno de los ejemplos:

1. **Momento 1:** El endpoint `GET /api/productos` devuelve `[]` o los datos del archivo `productos.json`. Al hacer `POST`, el archivo físico se actualiza en el disco.
2. **Momento 2:** El archivo `productos.db` se crea automáticamente. Los datos persisten tras reiniciar el servidor. La consulta SQL utiliza `AUTOINCREMENT`.
3. **Momento 3:** La API se conecta a un servidor MySQL real (puede ser local con XAMPP o Docker). El endpoint de creación devuelve el `insertId` generado por MySQL. Se debe incluir un archivo `.env.example` con las credenciales necesarias.

**Reflexión final:** El estudiante debe poder explicar por qué en el Momento 3 es necesario usar un *Pool de conexiones* y por qué las consultas parametrizadas (`?`) son obligatorias para evitar ataques de inyección SQL .
