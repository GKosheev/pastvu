/**
 * Module for assembling configuration object on server
 * Configuration with all default parameters is located in 'config/default.config.js'
 *
 * You can specify another path to configuration file with console parameter '-c(--config) yourpath'
 * Another files will recieve object of default configuration with ability to override its properties
 * If config path is not specified it will try to take overrided config at 'config/local.config.js'
 *
 * You can override any specific parameter through console, for example, --no-gzip
 */
'use strict';

const os = require('os');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const argv = require('yargs').argv;
const defaultConfig = require('./default.config');
const browserConfig = require('./browsers.config');
const log4js = require('log4js');
const exitHook = require('async-exit-hook');

const localConfigPath = path.join(__dirname, './local.config.js');
const readJSON = jsonPath => JSON.parse(fs.readFileSync(path.resolve(jsonPath), 'utf8'));

function execConfig(configPath, defaultConfig) {
    // Pass default config and local require as arguments to custom config.
    // Local require is transferring there for convenience, it usage equivalent calling `module.parent.require`
    const requireBind = require.bind(module);
    const alterConfig = require(configPath);

    return browserConfig(alterConfig(defaultConfig, requireBind), requireBind);
}

module.exports = (function () {
    let config = defaultConfig;

    try {
        // Read config parameter from console, which point to alternate config file
        const argvConfigPath = argv.config && path.resolve(argv.config);

        if (argvConfigPath && fs.existsSync(argvConfigPath)) {
            // If alternate config exists, call it. We also use this feature
            // in test environment setup.
            config = execConfig(argvConfigPath, config);
        } else if (fs.existsSync(localConfigPath)) {
            // If local config exists, call it
            config = execConfig(localConfigPath, config);
        }

        // Read configuration parameters from console, which have maximum priority
        _.merge(config, _.pick(argv, _.keys(defaultConfig)));

        // Read version from package.json
        const version = readJSON('./package.json').version;
        // Read build parameters for production enviroment
        const hash = config.env === 'production' ? readJSON('./build.json').hash : version;

        Object.assign(config, { version, hash });
    } catch (err) {
        console.error(err);
    }

    // If enviroment parameter not setted in config, take it from enviroment variable NODE_ENV
    // It give you flexibility to set NODE_ENV (for some optimisations) separately from env parameter,
    // for enabling some code switchers, for example, in analytics
    if (!config.env) {
        config.env = process.env.NODE_ENV || 'development';
    }

    // If client hostname is not setted, take ipv4 as it
    if (!config.client.hostname) {
        config.client.hostname = _.transform(os.networkInterfaces(), (result, face) => face.forEach(address => {
            if (address.family === 'IPv4' && !address.internal) {
                result.push(address.address);
            }
        }), []);
    }

    config.client.host = `${config.client.hostname}${config.client.port}`;
    config.client.origin = `${config.client.protocol}://${config.client.host}`;
    config.storePath = path.resolve(config.storePath);

    // Configure logging.
    const loggerConfig = require('./log4js');

    log4js.configure(loggerConfig(config));

    exitHook(cb => {
        // Delay logger shutdown to capture log output when we stop other things.
        setTimeout(() => {
            const loggerName = argv.script ? path.parse(argv.script).name : path.parse(argv.$0).name;

            log4js.getLogger(loggerName).info('Logger is stopped');
            log4js.shutdown(cb);
        }, 3000);
    });

    return config;
}());
