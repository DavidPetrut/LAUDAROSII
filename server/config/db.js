const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB conectat cu succes");
  } catch (error) {
    console.error("Eroare conectare MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
