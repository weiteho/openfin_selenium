"use strict";

module.exports = (function () {
    var config = {
        desiredCapabilities: {
            browserName: 'chrome',
            chromeOptions: {
                extensions: [],
                binary: 'RunOpenFin.bat',
                args: ['--config=http://localhost:8080/app.json']
            }
        },
        remoteDriverHost: "localhost",
        remoteDriverPort: 9515,
        testTimeout: 20000,
        expectedRuntimeVersion: "9.61.33.32"
    };

    config.remoteDriverUrl = "http://" + config.remoteDriverHost + ":" + config.remoteDriverPort + 
        (config.remoteDriverPath || "");
    return config;

})();

