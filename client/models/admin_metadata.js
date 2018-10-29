/**
 * @author Marco Alarcón
 * @description Admin functions for HLF Network current metadata
 */

'use strict';

const BASE_VERSION = 'v0.0.0';

const commons = require('./blockchain_commons');
const logger = require('winston');

const installedChaincode = async function (ccparams) {
	const org = ccparams.org;
	const client = await commons.createClient(org);

	const mspid = commons.getMspForOrg(org);
	const peers = client.getPeersForOrg(mspid);
	if (!peers || !peers.length) {
		logger.warn('No valid peers found for org %s', org);
		return commons.formatResult(false, 'Failed to retrieve Peer Chaincode Information, no valid peers found');
	}
	let peer = peers[0];
	let chaincodes = [];

	let response = await client.queryInstalledChaincodes(peer, true);
	if (response.chaincodes) {
		response.chaincodes.forEach(chaincode => {
			logger.debug('%s Peer, CC installed [%s], version [%s]', org, chaincode.name, chaincode.version);
			chaincodes.push(chaincode);
		});
	}
	return commons.formatResult(true, 'Retrieved installed Chaincodes information', chaincodes);
}

const latestChaincodeVersion = async function (ccparams) {
	const chaincodeName = ccparams.chaincodeName;
	const ccinfo = await installedChaincode(ccparams);
	if (ccinfo.status === commons.SUCCESS) {
		let maxVersion = BASE_VERSION;
		if (ccinfo.output) {
			let chaincodes = ccinfo.output;
			let version = chaincodes.reduce((prev, curr) => {
				if (curr.name !== chaincodeName)
					return prev;
				return (commons.compareVersionNumbers(curr.version.substr(1), prev.version.substr(1)) > 0) ? curr : prev;
			}, { version: BASE_VERSION });
			maxVersion = version.version;
		}
		return commons.formatResult(true, 'Latest version found ' + chaincodeName, maxVersion);
	} else {
		return ccinfo;
	}
}


exports.BASE_VERSION = BASE_VERSION;
exports.installedChaincode = installedChaincode;
exports.latestChaincodeVersion = latestChaincodeVersion;