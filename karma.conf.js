const browsers = process.platform === "win32" ?
    ["ChromeHeadless", "FirefoxHeadless", "IE"] :
    ["ChromeHeadless", "FirefoxHeadless"];

module.exports = function (config) {
    config.set({
        frameworks: ["mocha", "chai", "karma-typescript"],

        files: [
            "index.ts",
            {
                pattern: "lib/**/*.ts"
            },
            {
                pattern: "test/**/*.ts"
            }
        ],

        preprocessors: {
            "**/*.ts": ["karma-typescript"]
        },

        karmaTypescriptConfig: {
            tsconfig: "tsconfig.json",
            include: [
                "./index.ts",
                "./lib/**/*.ts",
                "./test/**/*.ts"
            ],
            /* for debug */
/*            bundlerOptions: {
                sourceMap: true
            },
            coverageOptions: {
                instrumentation: false
            }
*/
        },

        reporters: ["dots", "karma-typescript"],

        browsers,

        singleRun: true

        /* for debug */
/*        browsers: ["ChromeHeadless"],
        singleRun: false,
        autoWatch: true,
        customLaunchers: {
            ChromeHeadless: {
                base: 'Chrome',
                flags: [
                    //"--no-sandbox",
                    //"--user-data-dir=/tmp/chrome-test-profile",
                    "--disable-web-security",
                    "--remote-debugging-address=0.0.0.0",
                    "--remote-debugging-port=9222",
                ],
                debug: true,
            }
        }
*/
    });
};