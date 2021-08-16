/**
 * @author Marco Alarcón
 * @description Generic Fabric API for Peer operation
 */

'use strict';

global.__basedir = __dirname;

// Libs imports
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');

// Config imports
const port = process.env.PORT || 3000;

// Init logger
let logger = require('winston');
logger.configure({
    transports: [
        new (logger.transports.Console)({
            level: 'debug',
            colorize: true,
            timestamp: true,
            format: logger.format.combine(
                logger.format.colorize(),
                logger.format.splat(),
                logger.format.simple()
            ),
        })
    ]
});

//////////////////////
// Init Application //
//////////////////////

logger.info('Initializing HLF API Server');

const app = express();

app.options('*', cors());
app.use(cors());

// Support parsing of application/json type post data
app.use(bodyParser.json({ limit: '50mb' }));
// Support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
    extended: false,
    limit: '50mb'
}));

//////////////////
// Start Server //
//////////////////
require('./models/blockchain_commons').setup();
const routes = require('./routes/router');
routes.setup(app);

const server = http.createServer(app).listen(port);

logger.info('HLF API Server started');
logger.info('Listening at: [http://0.0.0.0:' + port + ']');
server.timeout = process.env.TIMEOUT || 240000;