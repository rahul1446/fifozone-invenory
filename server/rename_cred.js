const mongoose = require("mongoose");
const PlatformCredential = require("./src/models/PlatformCredential.model");
mongoose.connect("mongodb://127.0.0.1:27017/fifozone").then(async () => {
  await PlatformCredential.updateOne({ platform: "woocommerce" }, { $set: { platform: "fifozone" } });
  console.log("Renamed credential from woocommerce to fifozone.");
  process.exit(0);
});
