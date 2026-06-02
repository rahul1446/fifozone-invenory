const mongoose = require("mongoose");
const PlatformSync = require("./src/models/PlatformSync.model");
mongoose.connect("mongodb://127.0.0.1:27017/fifozone").then(async () => {
  await PlatformSync.updateOne(
    { platform: "fifozone" }, 
    { $set: { status: "synced", lastErrorMessage: "" } }
  );
  console.log("Reset fifozone sync status to synced.");
  process.exit(0);
});
