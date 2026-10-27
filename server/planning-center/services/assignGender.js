#!/usr/bin/env node
/**
 * One-time (reutilizabil): asignează gen (M/F) persoanelor după prenume (nume românești).
 * Rulează DIN `server/`:
 *   node planning-center/services/assignGender.js --dry     # doar numără + arată necunoscutele
 *   node planning-center/services/assignGender.js --apply   # SCRIE gender unde e gol (nu suprascrie)
 * Heuristică: seturi curate M/F + regula „-a" = feminin (cu excepții). Ce nu e sigur rămâne „" (admin corectează).
 */
require("dotenv").config();
const mongoose = require("mongoose");
const has = (f) => process.argv.includes(f);

const strip = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z-]/g, "").trim();

const FEMALE = new Set("ana maria elena adina adelina ioana larisa diana cristina cristiana andreea gabriela daniela simona raluca bianca denisa mirela oana roxana georgiana emanuela estera rebeca damaris loriana delia amalia ramona carmen miriam naomi noemi edith agnes alice alisa anda andrada andreea-daniela beatrice becky claudia corina dana daria emilia ema emma erika flavia flaviana gianina irina isabela iulia loredana madalina marta mihaela miruna monica nicoleta paula patricia sara silvia sonia teodora timea valentina vanessa veronica viorica laura lidia lavinia catalina dorina florentina ingrid alkistis agnes rut ruth lesley damaris beatrice alice-gabriela andrada iustina ligia lois magdalena marina melania nadia natalia otilia ramona roberta ruxandra tabita tania teodora tania alina aurelia camelia carla carmen cerasela clara cosmina crina dalia debora ecaterina eliza florina geta hanna ilinca ingrid ioan a iris janina livia luiza manuela marcela melisa mihaela monica nicole olivia oana paraschiva petronela rahela simina stefania valeria viviana zoe damaris estera salomea sabina paula".split(/\s+/).filter(Boolean));
const MALE = new Set("alexandru andrei mihai david daniel gabriel emanuel robert cristian marius ionut bogdan darius liviu silviu vlad sorin nicolae valentin cornel corneliu cosmin paul timotei samuel lorenzo gerardo aristotelis slavic abel adi adrian alex andy avram beni beniamin claudiu dan denis dennis eduard edward emilian flaviu george iancu ionatan iulian luca lucas marcel marcu matei mihnea nicu octavian ovidiu petru radu raul razvan remus roman sebastian sergiu stefan teodor tiberiu tudor victor vasile davide iosif isaac iacob ilie ioan iustin lazar leonard lucian manuel marian mircea moise narcis nelu nicusor ovidiu patrik petrica rares robert sabin samuel sami saul sebi silviu simion sorin stelian teofil toma traian valeriu virgil vlad vladimir zaharia aurel bogdan calin catalin ciprian constantin costel cristi danut dorel dorin emil eugen florin gheorghe horia ionel laurentiu marcel mihail nicolae petre sandu stefan valentin viorel edi samuel sam relu madalin pavel albert alin natanael marcus louis ruben beni timotei fabian denis".split(/\s+/).filter(Boolean));
const MALE_A_EXC = new Set(["luca", "toma", "mircea", "horia", "costea", "nicoara", "ilie", "andrea"]);

function infer(firstName) {
  const first = strip(String(firstName).split(/[\s-]/)[0]);
  if (!first || first.length < 2 || /^\d+$/.test(first)) return "";
  if (FEMALE.has(first)) return "F";
  if (MALE.has(first)) return "M";
  // fallback: -a / -ia = feminin (cu excepții), restul nesigur
  if (/(a|ia)$/.test(first) && !MALE_A_EXC.has(first)) return "F";
  return "";
}

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("Lipsește MONGODB_URI."); process.exit(1); }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const { PcPerson } = require("../models");
  const apply = has("--apply");

  const people = await PcPerson.find({ status: "active" }).select("firstName lastName gender").lean();
  let m = 0, f = 0, unknown = 0, skipExisting = 0;
  const unknowns = [];
  const ops = [];
  for (const p of people) {
    if (p.gender === "M" || p.gender === "F") { skipExisting++; continue; }
    let g = infer(p.firstName);
    if (!g) g = infer(p.lastName); // multe persoane au prenumele în câmpul lastName (nume-întâi)
    if (g === "M") m++; else if (g === "F") f++; else { unknown++; unknowns.push([p.firstName, p.lastName].filter(Boolean).join(" ")); }
    if (g && apply) ops.push({ updateOne: { filter: { _id: p._id }, update: { $set: { gender: g } } } });
  }
  console.log(`Total activi: ${people.length} | deja setat: ${skipExisting} | inferat M: ${m} | F: ${f} | necunoscut: ${unknown}`);
  console.log(`Necunoscute (rămân goale, admin corectează): ${unknowns.slice(0, 60).join(", ")}${unknowns.length > 60 ? ` …(+${unknowns.length - 60})` : ""}`);
  if (apply && ops.length) {
    const r = await PcPerson.bulkWrite(ops);
    console.log(`APLICAT: ${r.modifiedCount} persoane actualizate.`);
  } else if (!apply) {
    console.log("DRY-RUN (fără scriere). Rulează cu --apply pt. a scrie.");
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
