const mongoose = require("mongoose");
const PlatformSync = require("./src/models/PlatformSync.model");
mongoose.connect("mongodb://127.0.0.1:27017/fifozone").then(async () => {
  await PlatformSync.deleteMany(
    { platform: { $in: ["amazon", "flipkart"] } }
  );
  console.log("Deleted amazon and flipkart from PlatformSync.");
  process.exit(0);
});
