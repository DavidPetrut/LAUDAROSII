/**
 * pc_mediaItems — biblioteca Media (separată de Songs §3.112): slide-uri, video, countdown, imagini.
 * kind: file (hosted) | youtube | vimeo | video (url direct) | image | link. url = sursa.
 * ⚠️ Upload real de pe device = seam (storage). Acum: URL/link + imagini base64 mici.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  title: { type: String, required: true, trim: true },
  kind: { type: String, enum: ["file", "youtube", "vimeo", "video", "image", "link"], default: "link" },
  url: { type: String, default: "" },
  thumbnailUrl: { type: String, default: "" },
  description: { type: String, default: "" },
  author: { type: String, default: "" },
  tagIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcTag", default: [] }, // domain=media
  archived: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
});

schema.index({ orgId: 1, title: 1 });
schema.index({ title: "text", author: "text" }, { name: "pc_media_text" });

module.exports = pcModel("PcMediaItem", schema, "pc_mediaItems");
