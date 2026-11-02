/**
 * pc_aiLessons — „memoria" de antrenare a AI-ului (§5.4). GLOBALE pe organizație.
 * După o propunere, omul dă 👍/👎 (+ notă opțională). La promptul următor, gateway-ul injectează
 * top-K lecții relevante pentru suprafață („fă așa / nu așa"). Fără fine-tuning — doar context.
 * Aditiv, org-scoped. Ștergerile = soft (deletedAt), ca peste tot.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  surface: { type: String, required: true },         // ex. „order.studio"
  command: { type: String, default: "" },            // comanda care a generat propunerea (promptul userului)
  actionId: { type: String, default: "" },           // acțiunea propusă (ex. „delete-section")
  actionLabel: { type: String, default: "" },        // eticheta prietenoasă a acțiunii
  verdict: { type: String, enum: ["up", "down"], required: true }, // 👍 / 👎
  note: { type: String, default: "" },               // de ce (opțional, dar valoros la 👎)
  exampleContext: { type: String, default: "" },     // fragment de context (opțional, scurt)
  createdByPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null },
});

schema.index({ orgId: 1, surface: 1, createdAt: -1 });

module.exports = pcModel("PcAiLesson", schema, "pc_aiLessons");
