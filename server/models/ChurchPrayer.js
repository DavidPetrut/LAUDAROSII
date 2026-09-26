const mongoose = require("mongoose");

const MOODS = [
  "tulburat",
  "incredere",
  "eliberare",
  "voia_lui",
  "persistent",
  "nelinistit",
  "astept",
];

// Un motiv de rugaciune al bisericii: lista globala unica, vizibila tuturor,
// editabila doar de cei cu capabilitatea church_prayers.manage.
const churchPrayerSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    isUrgent: { type: Boolean, default: false },
    mood: { type: String, enum: [...MOODS, null], default: null },
    answered: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChurchPrayer", churchPrayerSchema);
module.exports.MOODS = MOODS;
