const { defineConfig } = require("cypress");
const { port, hostName } = require("./config/env/all");

module.exports = defineConfig({
  e2e: {
    baseUrl: `http://${hostName}:${port}`,
    fixturesFolder: "test/e2e/fixtures",
    specPattern: "test/e2e/integration/**/*.js",
    supportFile: "test/e2e/support/index.js",
    screenshotsFolder: "test/e2e/screenshots",
    videosFolder: "test/e2e/videos",
    video: false
  }
});
