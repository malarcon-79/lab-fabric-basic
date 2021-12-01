/**
 * @author Marco Alarcón
 * @description Common functionality
 */

'use strict';

const ORGS_CONFIG = 'organizations';

// Libs imports
const logger = require('winston');
const fabric = require('fabric-network');
const util = require('util');
const fs = require('fs');
const path = require('path');
const readFile = util.promisify(fs.readFile);

// Global app config
let config = null;
let netConfig = null;

let clientConfigs = {};

// Clients Cache
let clientsCache = {};

/**
 * Set-up the common module
 * @param {String} configPath 
 */
const setup = () => {
	config = require('../config/appconfig.json');

	// Load Network definition

	let _netConfig = require(path.join(__basedir || __dirname, 'config/network.json'));
	netConfig = JSON.parse(JSON.stringify(_netConfig, (k, v) => (k === 'path' && !v.startsWith('/')) ? path.join(__basedir || __dirname, v) : v));

	// Initialize HLF specific clients configurations
	const orgs = config.orgs;

	orgs.forEach(org => {
		let conf = JSON.parse(JSON.stringify(config.hlfClientBaseConfig, (k, v) => (typeof v === 'string' && v.includes('%org%')) ? v.replace('%org%', org) : v));
		clientConfigs[org] = conf;
	});

	module.exports.config = config;
	module.exports.netConfig = netConfig;

	logger.debug('Client configurations created: ', clientConfigs);
}

const getOrganization = (org) => {
	return netConfig[ORGS_CONFIG][org];
}

const getMspForOrg = (org) => {
	const organization = getOrganization(org);
	if (!organization)
		throw new Error('Organization ' + org + ' not found');

	return organization.mspid;
}

/**
 * Creates a new Gateway client
 * @param {string} org 
 * @returns {fabric.Gateway}
 */
const createClient = async (org) => {
	if (clientsCache[org]) {
		return clientsCache[org];
	}

	const organization = getOrganization(org);
	const certificate = await readFile(organization.signedCert.path);
	const privateKey = await readFile(organization.adminPrivateKey.path);
	const identity = {
		credentials: {
			certificate: certificate.toString(),
			privateKey: privateKey.toString(),
		},
		mspId: getMspForOrg(org),
		type: 'X.509',
	};
	const wallet = await fabric.Wallets.newInMemoryWallet();
	await wallet.put(`${org}Admin`, identity);

	const gwOptions = {
		identity: identity,
		wallet: wallet,
		discovery: {
			enabled: true,
			asLocalhost: true
		}
	};
	const gateway = new fabric.Gateway();
	await gateway.connect(netConfig, gwOptions);
	clientsCache[org] = gateway;

	return gateway;
}

// Common public generic functions

/**
 * Obtains ClassName from an Object instance
 * @param {*} obj 
 */
const getClass = (obj) => {
	if (typeof obj === 'undefined')
		return 'undefined';
	if (obj === null)
		return 'null';
	return Object.prototype.toString.call(obj).match(/^\[object\s(.*)\]$/)[1];
}

/**
 * Arguments Extractor Helper
 * @param {*} args 
 */
const argExtract = (args) => {
	if (!args)
		return args;
	if (args && args.length && getClass(args) !== 'String' && getClass(args[0]) !== 'String') {
		args[0] = JSON.stringify(args[0]);
	}
	return args;
};

/**
 * Creates a generic result object to send as JSON
 * @param {Boolean} success true for SUCCESS, false for ERROR messages
 * @param {String} message the message description
 * @param {*} result Operation result, if any
 */
const formatResult = (success, message, result) => {
	let _result = result;
	if (result instanceof Buffer) {
		_result = result.toString('utf8');
	}
	const res = {
		success: success,
		message: message,
		output: _result
	};

	return res;
}

// Exports
exports.config = config;
exports.netConfig = netConfig;

exports.setup = setup;
exports.getOrganization = getOrganization;
exports.getMspForOrg = getMspForOrg;
exports.createClient = createClient;
exports.argExtract = argExtract;
exports.formatResult = formatResult;