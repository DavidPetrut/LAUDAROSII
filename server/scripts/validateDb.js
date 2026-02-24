require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const { validateReferences } = require("../services/cleanupService");

const runValidation = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Conectat la MongoDB");

    console.log("\nValidare referințe...");
    const results = await validateReferences();

    console.log(`\n✅ Validare completa:`);
    console.log(`   - Utilizatori verificați: ${results.validatedUsers}`);
    console.log(`   - Cursuri verificate: ${results.validatedCourses}`);
    console.log("\nToate referințele orfane au fost curațate.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Eroare la validare:", error);
    process.exit(1);
  }
};

runValidation();
