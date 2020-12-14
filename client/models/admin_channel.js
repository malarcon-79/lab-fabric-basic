
/**
 * @author Marco Alarcón
 * @description Admin functions for Fabric Channels
 */

'use strict';

const path = require('path');
const fs = require('fs');
const util = require('util');
const commons = require('./blockchain_commons');
const logger = require('winston');
const readFile = util.promisify(fs.readFile);

const upsert = async function (ccparams) {
	const create = ccparams.create;
	const org = ccparams.org;
	let channelConfigPath = ccparams.configPath;
	const channelName = ccparams.channel;

	if (channelConfigPath && !channelConfigPath.startsWith('/'))
		channelConfigPath = path.join(__basedir || __dirname, channelConfigPath);

	const client = await commons.createClient(org);
	logger.debug('Got HFC client for Organization "%s"', org);

	const envelope_bytes = await readFile(channelConfigPath);
	let config_data = client.extractChannelConfig(envelope_bytes);
	logger.debug('Successfull extracted the config data from the configtx envelope at: %s', channelConfigPath);

	let signed = [];
	signed.push(client.signChannelConfig(config_data));

	let signers = [];
	const orgs = commons.config.orgs;
	orgs.forEach(o => {
		signers.push(new Promise(async (resolve) => {
			try {
				const orgCli = await commons.createClient(o);

				logger.debug('Building Signatures for %s', o);
				const sign = orgCli.signChannelConfig(config_data);
				signed.push(sign);

				logger.debug('Successfully Built signature for %s', o);
				resolve(true);
			} catch (err) {
				logger.error('Signature building failed for %s', o, err);
				resolve(false);
			}
		}));
	});

	await Promise.all(signers);

	// build up the create request
	const tx_id = client.newTransactionID();

	let request = {
		config: config_data,
		signatures: signed,
		name: channelName,
		txId: tx_id
	};
	logger.debug('Request is: %s', request);

	const response = create ? await client.createChannel(request) : await client.updateChannel(request);
	logger.debug((create ? 'Create' : 'Update') + ' Channel response: %s', response);

	if (response && response.status == 'SUCCESS') {
		logger.debug('Successfully ' + (create ? 'created' : 'updated') + ' the channel.');
		return commons.formatResult(true, 'Successfully created the channel.', ' response: ' + response, response);
	} else {
		logger.error('Failed to create the channel.');
		return commons.formatResult(false, 'Failed to ' + (create ? 'create' : 'update') + ' the channel \'' + ccparams.channelName + '\'', response);
	}
}

const create = async function (ccparams) {
	let params = Object.assign({}, ccparams);
	params.create = true;
	return await upsert(params);
}

const update = async function (ccparams) {
	let params = Object.assign({}, ccparams);
	params.create = false;
	return await upsert(params);
}

const join = async function (ccparams) {
	const org = ccparams.org;
	const channelName = ccparams.channel;

	const client = await commons.createClient(org);
	logger.debug('Got HFC client for Organization "%s"', org);

	let channel = client.getChannel(channelName, false);
	if (!channel) {
		// Channel is not defined in the network profile
		channel = client.newChannel(channelName);
	}

	let txId = client.newTransactionID();
	const request = {
		txId: txId
	};

	let genesis_block = await channel.getGenesisBlock(request);
	logger.debug('Successfully got the genesis block');

	const mspid = commons.getMspForOrg(org);
	let targets = client.getPeersForOrg(mspid);
	logger.debug('Pre new TX');
	logger.debug(targets);

	txId = client.newTransactionID(true);
	let j_request = {
		targets: targets,
		block: genesis_block,
		txId: txId
	};

	logger.debug('After tx');

	let results = await channel.joinChannel(j_request);
	logger.debug('Join Channel Response: %s', results);
	if (results && results.response && results.response.status == 200) {
		// join successful
		logger.debug('Successfully joined peers in organization %s to join the channel', org);
		return commons.formatResult(true, 'Successfully joined peers in organization ' + org + ' to join the channel ' + channelName, results);
	} else {
		if (results[0] && results[0] && results[0].response && results[0].response.status == 200) {
			logger.debug('Successfully joined peers in organization %s to join the channel', org);
			return commons.formatResult(true, 'Successfully joined peers in organization ' + org + ' to join the channel ' + channelName, results);
		} else {
			logger.error('Failed to join channel %s', channelName);
			return commons.formatResult(false, 'Failed to join channel ' + channelName + ' for Org ' + org);
		}
	}
}

exports.create = create;
exports.update = update;
exports.join = join;