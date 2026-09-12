const c = require("./metro.config.js");
console.log("DIAG_ASSETEXTS_HAS_MP4:", c.resolver.assetExts.includes("mp4"));
console.log("DIAG_ASSETEXTS:", c.resolver.assetExts.join(","));
console.log("DIAG_SOURCEEXTS:", c.resolver.sourceExts.join(","));
console.log("DIAG_PROJECTROOT:", c.projectRoot);
console.log("DIAG_WATCHFOLDERS:", JSON.stringify(c.watchFolders));
