
"use strict";

var should = require('chai').should(),
    webdriver = require('webdriverio'),
    assert = require("assert"),
    config = require("../../config"),
    spawn = require('child_process').spawn;


describe('OpenFin with webdriver.io', function () {
    var client;

    this.timeout(config.testTimeout);

    before(function (done) {

        // configure webdriver
        var driverOptions = {
            desiredCapabilities: config.desiredCapabilities,
            host: config.remoteDriverHost,
            port: config.remoteDriverPort,
            waitforTimeout: config.testTimeout,
            logLevel: 'silent'  // http://webdriver.io/guide/getstarted/configuration.html
        };
        client = webdriver.remote(driverOptions);

        if (!config.remoteDriverPath) {
            client.requestHandler.startPath = "";  // webdriverio defaults it to '/wd/hub';
        }
        client.init().then(function () {
            client.timeouts("implicit", config.testTimeout).then(function (t) {
                client.timeouts("script", config.testTimeout).then(function (t2) {
                    client.timeouts("page load", config.testTimeout).then(function (t3) {
                        done();
                    })
                });

            });
        });
    });

    after(function () {
        return client.end();
    });


    /**
     * Select a Window
     * @param windowHandle handle of the window
     * @param callback callback with window title if selection is successful
     */
    function switchWindow(windowHandle, callback) {
        client.switchTab(windowHandle).then(function () {
            client.getTitle().then(function (title) {
                callback(title);
            }, () => {
                callback("__error_getting_title__");
            });
        }, () => {
            //no such window
            callback("__no_such_window__");
        });
    }

    /**
     * Select the window with specified title
     * @param windowTitle window title
     * @param done done callback for Mocha
     */
    function switchWindowByTitle(windowTitle, done) {
        client.getTabIds().then(function (tabIds) {
            var handleIndex = 0;
            var checkTitle = function (title) {
                if (title === windowTitle) {
                    done();
                } else {
                    handleIndex++;
                    if (handleIndex < tabIds.length) {
                        switchWindow(tabIds[handleIndex], checkTitle);
                    } else {
                        // the window may not be loaded yet, so call itself again
                        client.pause(1000).then(()=>{
                            switchWindowByTitle(windowTitle, done);
                        });
                    }
                }
            };
            switchWindow(tabIds[handleIndex], checkTitle);
        });
    }


    /**
     *  Check if OpenFin Javascript API fin.desktop.System.getVersion exits
     *
    **/
    function checkFinGetVersion(callback) {
        client.executeAsync(function (done) {
            if (fin && fin.desktop && fin.desktop.System && fin.desktop.System.getVersion) {
                done(true);
            } else {
                done(false);
            }
        }).then(function (result) {
            callback(result.value);
        });
    }

    /**
     *  Wait for OpenFin Javascript API to be injected 
     *
    **/
    function waitForFinDesktop(readyCallback) {
        var callback = function (ready) {
            if (ready === true) {
                readyCallback();
            } else {
                client.pause(1000).then(function () {
                    waitForFinDesktop(readyCallback);
                });
            }
        };
        checkFinGetVersion(callback);
    }

    it('Wait for OpenFin API ready', function (done) {
        should.exist(client);
        waitForFinDesktop(done);
    });


    it('Switch to login window', function (done) {
        should.exist(client);
        switchWindowByTitle("openfin_selenium_login", done);
    });

    it('Verify OpenFin Runtime Version', function (done) {
        should.exist(client);
        client.executeAsync(function (done) {
            fin.desktop.System.getVersion(function (v) { console.log(v); done(v); });
        }).then(function (result) {
            should.exist(result.value);
            result.value.should.equal(config.expectedRuntimeVersion);
            done();
        });
    });

    it("Login", function (done) {
        should.exist(client);
        client.element("#openfin_username").then((result) => {
            should.exist(result.value);
            client.elementIdValue(result.value.ELEMENT, "openfin_selenium").then(() => {
                client.element("#openfin_password").then((result) => {
                    should.exist(result.value);
                    client.elementIdValue(result.value.ELEMENT, "test1234").then(() => {
                        client.element("#btnLogin").then((result) => {
                            should.exist(result.value);
                            client.elementIdClick(result.value.ELEMENT).then(() => {
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it('Switch to launch bar', function (done) {
        should.exist(client);
        switchWindowByTitle("openfin_selenium_launch_bar", done);
    });

    it("Click on [Google]", function (done) {
        should.exist(client);
        client.element("#btnGoogle").then((result) => {
            should.exist(result.value);
            client.elementIdClick(result.value.ELEMENT).then(() => {
                done();
            });
        });
    });
});
