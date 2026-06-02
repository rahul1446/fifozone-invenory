const mongoose = require("mongoose");
const PlatformSync = require("./src/models/PlatformSync.model");
mongoose.connect("mongodb://127.0.0.1:27017/fifozone").then(async () => {
  await PlatformSync.updateMany(
    { platform: { $in: ["amazon", "flipkart"] } },
    { $set: { syncedProductsCount: 0, status: "error", lastErrorMessage: "Credentials not configured" } }
  );
  await PlatformSync.updateOne(
    { platform: "fifozone" },
    { $set: { platform: "woocommerce", syncedProductsCount: 6 } }
  );
  console.log("PlatformSyncs updated.");
  process.exit(0);
});
