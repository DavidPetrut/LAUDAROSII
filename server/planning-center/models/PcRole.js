/**
 * pc_roles — roluri EXTRA custom, definite de admini (creatorul de roluri din dashboard).
 * Se cumulează peste rolul de bază: user.extraRoles conține `key`-urile acestor roluri, iar
 * accesul efectiv = UNION-ul capabilităților tuturor rolurilor pe care le are userul (+ bază).
 *
 * `slice` = felia aplicației (planning/home/pray/games/profile) — un rol „vede" doar zona lui.
 * `capabilities` = listă de chei de capabilitate (ex. "services.editOrder", "songs.edit").
 * Aditiv & org-scoped (seam multi-tenant). Fără email.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  key: { type: String, required: true, trim: true },   // slug stabil folosit în user.extraRoles
  name: { type: String, required: true, trim: true },  // ex. „Coordonator Închinare"
  slice: { type: String, default: "planning" },        // planning | home | pray | games | profile
  capabilities: { type: [String], default: [] },       // ex. ["services.editOrder", "songs.edit"]
  color: { type: String, default: "" },                // accent opțional pt. UI
  builtIn: { type: Boolean, default: false },           // pre-creat (ex. Planning Admin), ștergibil
});

schema.index({ orgId: 1, slice: 1 });
schema.index({ orgId: 1, key: 1 }, { unique: true });

module.exports = pcModel("PcRole", schema, "pc_roles");
