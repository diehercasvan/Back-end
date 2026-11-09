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