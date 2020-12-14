/**
 * @author Marco Alarcón
 * @description Admin functions for SmartContracts
 */

'use strict';

const path = require('path');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const commons = require('./blockchain_commons');
const adminMetadata = require('./admin_metadata');
const logger = require('winston');

const DEFAULT_TIMEOUT = 45000;
const INSTALL_TIMEOUT = 120000;
let scConfigs = {};

/**
 * Retrieves the SmartContract configuration for the current ENV
 * @param {*} scConfigPath 
 */
const getConfigEnv = function (scConfigPath) {
	let config = scConfigs[scConfigPath];
	if (!config) {
		config = require(path.join(__basedir || __dirname, scConfigPath));
		scConfigs[scConfigPath] = config;
	}

	process.env.GOPATH = path.join(__basedir || __dirname, config.srcBasePath);
	return config;
}

/**
 * Compare transaction proposals, returns an error response if comparisson fails
 * @param {ProposalResponseObject} response 
 */
const compareProposals = function (results, channel, resilient) {
	const proposalResponses = results[0];
	let errors = [];
	let valids = [];

	proposalResponses.forEach(p => {
		try {
			if (p.response && p.response.status === 200 && channel.verifyProposalResponse(p)) {
				logger.info('Proposal response was good');
				valids.push(p);
			} else {
				logger.warn('Proposal response was bad');
				if (p.details && p.details.message) {
					errors.push(p.details.message);
				} else {
					errors.push(p);
				}
			}
		} catch (e) {
			logger.error('Unexpected error while comparing proposal responses', e);
			errors.push(p);
		}
	});

	if (resilient) {
		if (errors.length > 0 && valids.length == 0) {
			logger.warn('Failed to send Transaction Proposal or received invalid response: ', errors);
			return { result: commons.formatResult(false, errors[0], proposalResponses), success: false };
		}
	} else {
		if (errors.length > 0) {
			logger.warn('Failed to send Transaction Proposal or received invalid response: ', errors);
			return { result: commons.formatResult(false, errors[0], proposalResponses), success: false };
		}
	}

	let fullEval = channel.compareProposalResponseResults(valids);
	if (!fullEval) {
		logger.warn('Not all endorsers did agree on the proposal');
		return { result: commons.formatResult(false, 'Failed to send Transaction Proposal, not all endorsers did agree on the proposal', valids), success: false };
	}

	if (resilient) {
		results[0] = valids;
	}
	return { result: results, success: true };
}

/**
 * Installs a SmartContract
 * @param {*} ccparams 
 */
const installSmartContract = async function (ccparams) {
	const org = ccparams.org;
	const smartContractConfig = ccparams.smartContractConfig;
	const smartContract = ccparams.smartContract || ccparams.chaincodeName;
	const smartContractVersion = ccparams.smartContractVersion;
	let packagePath = ccparams.packagePath;

	const client = await commons.createClient(org);
	logger.debug('Got HFC client for Organization "%s"', org);

	const scConfig = getConfigEnv(smartContractConfig);
	const config = scConfig.smartcontracts[smartContract];
	if (!config) {
		logger.error('No SmartContract configuration found for %s', smartContract);
		return commons.formatResult(false, 'No SmartContract configuration found for ' + smartContract);
	}
	let chaincodeType = config.type || 'golang';
	let ccpath = config.path;
	if (chaincodeType !== 'golang') {
		ccpath = path.join(__basedir || __dirname, ccpath);
	}
	let channelName = ccparams.channelName || scConfig.defaultChannel;
	let metadataPath;
	if (config.metadataPath) {
		metadataPath = path.join(__basedir || __dirname, config.metadataPath);
	}

	const mspid = commons.getMspForOrg(org);
	let targets = client.getPeersForOrg(mspid);
	let request = {
		targets: targets,
		chaincodePath: ccpath,
		chaincodeId: smartContract,
		chaincodeVersion: smartContractVersion,
		chaincodeType: chaincodeType,
		channelNames: channelName,
		metadataPath: metadataPath
	};

	// Retrieve Chaincode Package
	if (packagePath) {
		if (packagePath.startsWith('.'))
			packagePath = path.join(__basedir || __dirname, packagePath);

		let chaincodePackage = await readFile(packagePath);
		request.chaincodePackage = chaincodePackage;
	}

	let results = await client.installChaincode(request, INSTALL_TIMEOUT);
	let proposalResponses = results[0];
	let errors = [];

	proposalResponses.forEach(p => {
		if (p.response && p.response.status === 200) {
			logger.info('Install proposal was good');
		} else {
			logger.error('Install proposal was bad');
			errors.push(p);
		}
	});
	if (errors.length === 0) {
		let response = 'Successfully sent install Proposal and received ProposalResponse: Status - ' + proposalResponses[0].response.status;
		logger.debug(response);

		return commons.formatResult(true, response, proposalResponses);
	} else {
		logger.warn('Failed to send install Proposal or receive valid response: ', errors);
		return commons.formatResult(false, 'Failed to send install Proposal or receive valid response', proposalResponses);
	}
}

/**
 * Instantiates a SmartContract previously installed
 * @param {*} ccparams 
 */
const instantiateSmartContract = async function (ccparams) {
	const org = ccparams.org;
	const smartContractConfig = ccparams.smartContractConfig;
	const smartContract = ccparams.smartContract;
	const smartContractVersion = ccparams.smartContractVersion;
	const ccargs = commons.argExtract(ccparams.args);

	let client = await commons.createClient(org);
	logger.debug('Got HFC client for Organization "%s"', org);

	const scConfig = getConfigEnv(smartContractConfig);
	const config = scConfig.smartcontracts[smartContract];
	if (!config) {
		logger.error('No SmartContract configuration found for %s', smartContract);
		return commons.formatResult(false, 'No SmartContract configuration found for ' + smartContract);
	}
	let chaincodeType = config.type || 'golang';
	let channelName = ccparams.channelName || scConfig.defaultChannel;

	// Get the channel where to instantiate
	let channel = await commons.getChannel(org, client, channelName);

	// Create endorsement policy on the fly
	let endorsement = scConfig.endorsements[config.endorsement];
	if (!endorsement) {
		return commons.formatResult(false, 'Invalid configuration for Endorsement policy', config);
	}

	let identities = [];
	endorsement.identities.forEach(async (r) => {
		identities.push({ role: { name: r.role, mspId: commons.getMspForOrg(r.org) } });
	});
	let endorsementPolicy = {
		identities: identities,
		policy: endorsement.policy
	};

	// Send proposal to endorser
	let tx_id = client.newTransactionID(true);
	const mspid = commons.getMspForOrg(org);
	let targets = client.getPeersForOrg(mspid);

	let request = {
		targets: targets,
		chaincodeType: chaincodeType,
		chaincodeId: smartContract,
		chaincodeVersion: smartContractVersion,
		txId: tx_id,
		fcn: config.instantiatefuncname,
		args: ccargs,
		endorsement: endorsementPolicy
	};
	if (ccparams.transientMap && ccparams.transientMap != '') {
		request.transientMap = ccparams.transientMap
	}
	logger.debug('Proposal request: %s', request);

	let results;
	if (ccparams.upgrade) {
		logger.debug('Upgrading the Chaincode - proposal');
		results = await channel.sendUpgradeProposal(request, INSTALL_TIMEOUT);
	} else {
		logger.debug('Installing the Chaincode - proposal');
		results = await channel.sendInstantiateProposal(request, INSTALL_TIMEOUT);
	}

	const proposalResult = compareProposals(results, channel, false);
	if (proposalResult.success) {
		results = proposalResult.result;
	} else {
		logger.error('Error during instantiate proposal', proposalResult.result);
		return proposalResult.result;
	}

	// Create deploy TX
	let deployId = tx_id.getTransactionID();
	request = {
		proposalResponses: results[0],
		proposal: results[1],
		txID: deployId
	};

	// Send deploy TX, evaluate results and events
	let response = await channel.sendTransaction(request);

	if (!(response instanceof Error) && response.status === 'SUCCESS') {
		logger.debug('Successfully sent deploy transaction to the orderer.');
		const output = {
			response: response,
			txId: tx_id.getTransactionID()
		}

		return commons.formatResult(true, 'Successfully sent deploy transaction to the orderer.', output);
	} else {
		return commons.formatResult(false, 'Failed to execute deploy transaction to the orderer for SC: ' + smartContract, response);
	}
}

const install = async function (ccparams) {
	const org = ccparams.org || ccparams.orgs[0];
	const orgs = ccparams.orgs || [org];
	const chaincodeName = ccparams.chaincode;
	const smartContractConfig = ccparams.smartContractConfig;
	const channelName = ccparams.channel;
	const transientMap = ccparams.transientMap;
	const args = ccparams.args;
	const bumpType = ccparams.bumpType || 'MINOR';
	const packagePath = ccparams.packagePath;

	const versionInfo = await adminMetadata.latestChaincodeVersion({ org: org, chaincodeName: chaincodeName });
	if (versionInfo.status === commons.ERROR) {
		return versionInfo;
	}

	let version = versionInfo.output;
	const upgrade = (version != adminMetadata.BASE_VERSION);
	if (!upgrade) {
		version = commons.bumpVersion(version, 'MAYOR');
	} else {
		version = commons.bumpVersion(version, bumpType);
	}

	let failed = [];
	let installed = [];
	logger.info('Installing Chaincode Version: ' + version);

	for (let i = 0, l = orgs.length; i < l; i++) {
		const _org = orgs[i];
		let installInfo = null;
		for (let retry = 3; retry > 0; retry--) {
			installInfo = await installSmartContract({
				org: _org,
				smartContract: chaincodeName,
				smartContractConfig: smartContractConfig,
				smartContractVersion: version,
				channelName: channelName,
				packagePath: packagePath
			});
			if (installInfo.status === commons.SUCCESS) {
				break;
			} else {
				logger.warn('Failed to install SmartContract, retries remaining: ' + retry);
			}
		}

		if (installInfo && installInfo.status === commons.SUCCESS) {
			installed.push(installInfo);
		} else {
			failed.push(installInfo);
		}
	}

	if (installed.length == 0) {
		logger.error('Chaincode install failed in all Organizations, aborting process');
		return commons.formatResult(false, 'Chaincode install failed in all Organizations', failed);
	}

	// Instantiate ONCE, on orgs[0]
	let instantiate = await instantiateSmartContract({
		org: org,
		smartContract: chaincodeName,
		smartContractConfig: smartContractConfig,
		smartContractVersion: version,
		channelName: channelName,
		args: args,
		upgrade: upgrade,
		transientMap: transientMap
	});

	if (instantiate.status === commons.SUCCESS)
		return commons.formatResult(true, 'Succesfully installed and instantiated SmartContract as version ' + version, instantiate.output);
	else
		return instantiate;
}

const invoke = async function (ccparams) {
	const org = ccparams.org;
	const chaincodeName = ccparams.chaincode;
	const functionName = ccparams.function;
	//const version = ccparams.version;
	const ccargs = commons.argExtract(ccparams.args);
	const channelName = ccparams.channel;

	const client = await commons.createClient(org);
	logger.debug('Got HFC client for Organization "%s"', org);

	let channel = await commons.getChannel(org, client, channelName);

	let tx_id = client.newTransactionID(true);
	// Send Invoke
	let request = {
		chaincodeId: chaincodeName,
		txId: tx_id,
		fcn: functionName,
		args: ccargs
	};

	if (ccparams.transientMap && ccparams.transientMap != '') {
		request.transientMap = ccparams.transientMap;
	}

	if (ccparams.invokeSinglePeer) {
		let targets = commons.getQueryTargets(false, org, channelName);
		request.targets = targets;
	}

	let results = await channel.sendTransactionProposal(request, DEFAULT_TIMEOUT);
	logger.info('Response Payloads length is ' + results.length);

	const proposalResult = compareProposals(results, channel, true);
	if (proposalResult.success) {
		results = proposalResult.result;
	} else {
		logger.error('Error during invoke proposal', proposalResult.result);
		return proposalResult.result;
	}

	// Create deploy TX
	let invokeId = tx_id.getTransactionID();
	request = {
		proposalResponses: results[0],
		proposal: results[1],
		txID: invokeId
	};

	// Send deploy TX, evaluate results and events
	let response = await channel.sendTransaction(request);

	if (!(response instanceof Error) && response.status === 'SUCCESS') {
		logger.debug('Successfully sent invoke transaction to the orderer.');
		const output = {
			response: response,
			txId: tx_id.getTransactionID()
		}
		return commons.formatResult(true, 'Successfully sent invoke transaction to the orderer.', output);
	}

	return commons.formatResult(false, 'Failed to execute invoke transaction to the orderer for SC: ' + smartContract, response);
}

const query = async function (ccparams) {
	const org = ccparams.org;
	const chaincodeName = ccparams.chaincode;
	const functionName = ccparams.function;
	const ccargs = commons.argExtract(ccparams.args);
	const channelName = ccparams.channel;

	const client = await commons.createClient(org);
	logger.debug('Got HFC client for Organization "%s"', org);

	let channel = await commons.getChannel(org, client, channelName);

	let tx_id = client.newTransactionID();
	// Send Query
	const request = {
		chaincodeId: chaincodeName,
		txId: tx_id,
		fcn: functionName,
		args: ccargs
	};

	if (ccparams.transientMap && ccparams.transientMap != '') {
		request.transientMap = ccparams.transientMap;
	}

	let response = await channel.queryByChaincode(request);
	logger.info('Response Payloads length is ' + response.length);
	let last = null;
	let allAgree = true;
	for (let i = 0, l = response.length; i < l; i++) {
		let parsed = response[i].toString('utf8');
		if (last && parsed != last) {
			logger.warn('Not all peers agree on the query result');
			allAgree = false;
			break;
		}
		last = parsed;
	}
	if (last && last != '')
		try {
			last = JSON.parse(last);
		} catch (err) {
			// No op
		}

	if (allAgree) {
		logger.debug('Successful query transaction.');
		return commons.formatResult(true, 'Successful Query Transaction', last);
	} else {
		logger.debug('Successful query transaction, but results differs.');
		return commons.formatResult(false, 'Not all peers agree on the query result', last);
	}
}

exports.install = install;
exports.invoke = invoke;
exports.query = query;