// src/controllers/security/catalog.controller.js
const {
  Permission, Module, UserStatus, DocumentType, PqrsType, PqrsStatus,
} = require('../../models');
const { ok } = require('../../utils/response');

async function listPermissions(req, res, next) {
  try {
    const rows = await Permission.findAll({ order: [['id', 'ASC']] });
    return ok(res, { permissions: rows }, 'Permisos');
  } catch (err) { return next(err); }
}

async function listModules(req, res, next) {
  try {
    const rows = await Module.findAll({ order: [['id', 'ASC']] });
    return ok(res, { modules: rows }, 'Módulos');
  } catch (err) { return next(err); }
}

async function listUserStatus(req, res, next) {
  try {
    const rows = await UserStatus.findAll({ order: [['id', 'ASC']] });
    return ok(res, { statuses: rows }, 'Estados de usuario');
  } catch (err) { return next(err); }
}

async function listDocumentTypes(req, res, next) {
  try {
    const rows = await DocumentType.findAll({ order: [['id', 'ASC']] });
    return ok(res, { document_types: rows }, 'Tipos de documento');
  } catch (err) { return next(err); }
}

async function listPqrsTypes(req, res, next) {
  try {
    const rows = await PqrsType.findAll({ order: [['id', 'ASC']] });
    return ok(res, { pqrs_types: rows }, 'Tipos de PQRS');
  } catch (err) { return next(err); }
}

async function listPqrsStatus(req, res, next) {
  try {
    const rows = await PqrsStatus.findAll({ order: [['id', 'ASC']] });
    return ok(res, { pqrs_status: rows }, 'Estados de PQRS');
  } catch (err) { return next(err); }
}

module.exports = {
  listPermissions, listModules, listUserStatus, listDocumentTypes,
  listPqrsTypes, listPqrsStatus,
};