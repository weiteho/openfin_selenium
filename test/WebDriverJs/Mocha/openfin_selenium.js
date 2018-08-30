

var expect, until, webdriver, chrome, config;
expect = require('chai').expect;
until = require('selenium-webdriver').until;
webdriver = require('selenium-webdriver');
chrome = require('selenium-webdriver/chrome');
config = require("../../config"),
spawn = require('child_process').spawn;


describe('openfin with selenium-webdriver', function () {
    "use strict";

    var client, notificationButton, cpuInfoButton, cpuInfoExitButton;

    this.timeout(config.testTimeout);

    before(function (done) {
        // configure webdriver
        var capabilities = webdriver.Capabilities.chrome();
        capabilities.set('chromeOptions', config.desiredCapabilities.chromeOptions);
        client = new webdriver.Builder().usingServer(config.remoteDriverUrl).withCapabilities(capabilities).build();
        var timeouts = client.manage().timeouts();
        timeouts.implicitlyWait(config.testTimeout).then(function () {
            timeouts.pageLoadTimeout(config.testTimeout).then(function () {
                timeouts.setScriptTimeout(config.testTimeout).then(function () {
                    done();
                });
            });
        });
    });

    after(function (done) {
        // needs "done" here to give time to run .end()
        client.quit().then(function () {
            done();
        });
    });

    /**
     * Select a Window
     * @param windowHandle handle of the window
     * @param callback callback with window title if selection is successful
     */
    function switchWindow(windowHandle, callback) {
        client.switchTo().window(windowHandle).then(function () {
            // known issue:  getTitle may hang if the window closed
            // https://bugs.chromium.org/p/chromedriver/issues/detail?id=1132
            client.getTitle().then(function (title) {
                callback(title);
            });
        }).then(null, function(e) {
                        // some windows get opened and closed during startup, so not really an error
                        callback("no such window");
                    });
    }

    /**
     * Select the window with specified title.
     *
     * @param windowTitle window title
     * @param done done callback for Mocha
     */
    function switchWindowByTitle(windowTitle, done) {
        client.getAllWindowHandles().then(function (handles) {
            var handleIndex = 0,
                checkTitle = function (title) {
                if (title === windowTitle) {
                        done();
                } else {
                    handleIndex += 1;
                    if (handleIndex < handles.length) {
                        switchWindow(handles[handleIndex], checkTitle);
                    } else {
                        // the window may not be loaded yet, so call itself again
                        switchWindowByTitle(windowTitle, done);
                    }
                }
            };
            switchWindow(handles[handleIndex], checkTitle);
        });
    }

    /**
     * Select the window with specified title.
     *
     * @param windowName window name
     * @param done done callback for Mocha
     */
    function switchWindowByName(windowName, done) {
        client.switchTo().window(windowName).then(function () {
            done();
        }).catch(function(e) {
            client.sleep(1000).then(function() {
                switchWindowByName(windowName, done);
            });
        });
    }


    /**
     * Retrieve document.readyState
     * @param callback
     */
    function getDocumentReadyState(callback) {
       executeAsyncJavascript("var callback = arguments[arguments.length - 1];" +
           "if (document && document.getElementById) { callback(document.readyState); } else { callback(undefined); }").then(function(result) {
               console.log(result);
               callback(result);
       });
    }

    /**
     *  Wait for document.readyState === 'complete'
     *
    **/
    function waitForDocumentReady(readyCallback) {
        var callback = function(readyState) {
            if (readyState === 'complete') {
                readyCallback();
            } else {
                client.sleep(1000).then(function() {
                    waitForDocumentReady(readyCallback);
                });
            }
        };
        getDocumentReadyState(callback);
    }



    /**
     *  Check if OpenFin Javascript API fin.desktop.System.getVersion exits
     *
    **/
    function checkFinGetVersion(callback) {
        executeAsyncJavascript("var callback = arguments[arguments.length - 1];" +
        "if (fin && fin.desktop && fin.desktop.System && fin.desktop.System.getVersion) { callback(true); } else { callback(false); }").then(function(result) {
            callback(result);
        });
    }


    /**
     * Inject a snippet of JavaScript into the page for execution in the context of the currently selected window.
     * The executed script is assumed to be asynchronous and must signal that is done by invoking the provided callback, which is always
     * provided as the final argument to the function. The value to this callback will be returned to the client.
     *
     * @param script
     * @returns {*|!webdriver.promise.Promise.<T>}
     *
     */
    function executeAsyncJavascript(script) {
        return client.executeAsyncScript(script);
    }

    /**
     * Inject a snippet of JavaScript into the page for execution in the context of the currently selected frame. The executed script is assumed
     * to be synchronous and the result of evaluating the script is returned to the client.
     *
     * @param script
     * @returns {*|!webdriver.promise.Promise.<T>}
     */
    function executeJavascript(script) {
        return client.executeScript(script);
    }

    it('Wait for document ready', function(done) {
        expect(client).to.exist;
        waitForDocumentReady(done);
    });

    it('Switch to login window', function(done) {
        expect(client).to.exist;
        switchWindowByName('openfin_selenium_login', done);
    });

    it('Verify OpenFin Runtime Version', function (done) {
        expect(client).to.exist;
        executeAsyncJavascript("var callback = arguments[arguments.length - 1];" +
            "fin.desktop.System.getVersion(function(v) { callback(v); } );").then(function(v) {
            expect(v).to.equal(config.expectedRuntimeVersion);
                // without the sleep here, sometimes the next step does not go through for some reason
                client.sleep(1000).then(function () {
                    done();
                });
            });
    });


    it("Login", function (done) {
        expect(client).to.exist;
        client.findElements(webdriver.By.id("openfin_username")).then(function(result) {
            result[0].sendKeys("openfin_selenium");
        });
        client.findElements(webdriver.By.id("openfin_password")).then(function(result) {
            result[0].sendKeys("test1234");
        });
        client.findElements(webdriver.By.id("btnLogin")).then(function(result) {
            result[0].click();
            done();
        });
    });

    it('Switch to launch bar', function(done) {
        expect(client).to.exist;
        switchWindowByName('openfin_selenium_launch_bar', done);
    });

    it("Open Google", function (done) {
        expect(client).to.exist;
        client.findElements(webdriver.By.id("btnGoogle")).then(function(result) {
            result[0].click();
            done();
        });
    });

    // it('Exit OpenFin Runtime', function (done) {
    //     expect(client).to.exist;
    //     executeJavascript("fin.desktop.System.exit();").then(function () {
    //         done();
    //     });
    // });


});
