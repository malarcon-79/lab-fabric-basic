/**
 * @author Marco Alarcón
 * @description Common functionality
 */

'use strict';

const ORGS_CONFIG = 'organizations';
const CAS = 'certificateAuthorities';

const SUCCESS = 'SUCCESS';
const ERROR = 'ERROR';

// Libs imports
const logger = require('winston');
const Client = require('fabric-client');
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
const setup = function () {
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

const getOrganization = function (org) {
	return netConfig[ORGS_CONFIG][org];
}

const getMspForOrg = function (org) {
	const organization = getOrganization(org);
	if (!organization)
		throw new Error('Organization ' + org + ' not found');

	return organization.mspid;
}

const createClient = async function (org) {
	if (clientsCache[org]) {
		return clientsCache[org].client;
	}

	let client = Client.loadFromConfig(netConfig);
	client.loadFromConfig(clientConfigs[org]);
	const organization = getOrganization(org);

	await client.initCredentialStores();

	await client.createUser({
		username: org + 'Admin',
		mspid: getMspForOrg(org),
		cryptoContent: {
			privateKey: organization.adminPrivateKey.path,
			signedCert: organization.signedCert.path
		}
	});
	clientsCache[org] = { client: client };
	return client;
}

const getChannel = async function (org, client, channelName) {
	if (clientsCache[org][channelName]) {
		return clientsCache[org][channelName].channel;
	}

	let channel = client.getChannel(channelName);
	if (!channel) {
		throw new Error('No channel ' + channelName + ' is configured');
	}
	await channel.initialize();

	let eventHubs = channel.getChannelEventHubsForOrg(org);
	clientsCache[org][channelName] = { channel: channel, eventHubs: eventHubs };

	return channel;
}

const getChannelEventHubs = function (org, channelName) {
	if (clientsCache[org][channelName]) {
		return clientsCache[org][channelName].eventHubs;
	}
	throw new Error('No channel ' + channelName + ' is configured');
}

// Common public generic functions

/**
 * Obtains ClassName from an Object instance
 * @param {*} obj 
 */
const getClass = function (obj) {
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
const argExtract = function (args) {
	if (!args)
		return args;
	if (args && args.length && getClass(args) !== 'String' && getClass(args[0]) !== 'String') {
		args[0] = JSON.stringify(args[0]);
	}
	return args;
};

const isPositiveInteger = function (x) {
	return /^\d+$/.test(x);
}

const validateParts = function (parts) {
	for (let i = 0, l = parts.length; i < l; ++i) {
		if (!isPositiveInteger(parts[i])) {
			return false;
		}
	}
	return true;
}

/**
 * Compare two software version numbers (e.g. 1.7.1)
 *  E.g.:
 *  assert(version_number_compare("1.7.1", "1.6.10") > 0);
 *  assert(version_number_compare("1.7.1", "1.7.10") < 0);
 * 
 * @param {String} v1 Version String
 * @param {String} v2 Version String
 * @returns
 * 	0 if they're identical
 *  negative if v1 < v2
 *  positive if v1 > v2
 *  Nan if they in the wrong format
 */
const compareVersionNumbers = function (v1, v2) {
	let v1parts = v1.split('.');
	let v2parts = v2.split('.');

	// First, validate both numbers are true version numbers
	if (!validateParts(v1parts) || !validateParts(v2parts)) {
		return NaN;
	}

	for (let i = 0, l = v1parts.length; i < l; ++i) {
		if (v2parts.length === i) {
			return 1;
		}
		if (v1parts[i] === v2parts[i]) {
			continue;
		}
		if (parseInt(v1parts[i], 10) > parseInt(v2parts[i], 10)) {
			return 1;
		}
		return -1;
	}

	if (v1parts.length != v2parts.length) {
		return -1;
	}

	return 0;
}

/**
 * Increments a Version string as indicated by "type". Valid strings:
 * 1
 * 2.4
 * 4.13.423
 * @param {String} current Version string as MAYOR.[MINOR].[REVISION]
 * @param {String} type Where to apply the version bump, values: MAYOR, MINOR, REVISION 
 */
const bumpVersion = function (current, type) {
	if (!current)
		return current;

	let start = '';
	if (current.toLowerCase().startsWith('v')) {
		start = current.charAt(0);
		current = current.substr(1);
	}
	if (!type)
		type = 'MINOR';

	let index = (type === 'REVISION') ? 2 : (type === 'MINOR') ? 1 : 0;
	let parts = current.split('.');
	if (!validateParts(parts))
		return null;
	if (parts.length <= index) {
		let fill = index - parts.length + 1;
		for (let i = 0; i < fill; i++) {
			parts.push('0');
		}
	} else {
		parts[index] = (parseInt(parts[index]) + 1).toString();
		parts.fill('0', index + 1);
	}
	return start + parts.join('.');
}

/**
 * Creates a generic result object to send as JSON
 * @param {Boolean} isSuccess true for SUCCESS, false for ERROR messages
 * @param {String} message the message description
 * @param {*} result Operation result, if any
 */
const formatResult = function (isSuccess, message, result) {
	const res = {
		status: isSuccess ? SUCCESS : ERROR,
		message: message,
		output: result
	};

	return res;
}

// Exports
exports.setup = setup;

exports.SUCCESS = SUCCESS;
exports.ERROR = ERROR;

exports.config = config;
exports.netConfig = netConfig;
exports.createClient = createClient;
exports.getChannel = getChannel;
exports.getChannelEventHubs = getChannelEventHubs;
exports.getOrganization = getOrganization;
exports.getMspForOrg = getMspForOrg;

exports.argExtract = argExtract;
exports.compareVersionNumbers = compareVersionNumbers;
exports.bumpVersion = bumpVersion;
exports.formatResult = formatResult;