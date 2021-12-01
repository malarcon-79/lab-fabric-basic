/**
 * @author Marco Alarcón
 * @description Admin functions for SmartContracts
 */

'use strict';

const commons = require('./blockchain_commons');
const logger = require('winston');

exports.invoke = async (ccparams) => {
	const org = ccparams.org;
	const chaincodeId = ccparams.chaincode;
	const functionName = ccparams.function;
	const ccargs = commons.argExtract(ccparams.args);
	const channelName = ccparams.channel;

	const client = await commons.createClient(org);
	logger.debug('Got HFC client for Organization "%s"', org);

	const channel = await client.getNetwork(channelName);
    const contract = channel.getContract(chaincodeId);

    const tx = contract.createTransaction(functionName);

    logger.debug('Submitting transaction %s', tx.getTransactionId());
	try {
		const payload = await tx.submit(...ccargs);
        return commons.formatResult(true, tx.getTransactionId(), payload);
	} catch (e) {
        logger.error('Error received from transaction submit. %s', e);
		let response = e;
		if (e.message) { // Timed out
			response = e.message;
		} else if (e.responses) { // Failed at Endorsement
			const responses = e.responses;
			if (responses.length) {
				for (const res of responses) {
					if (res.response && res.response.status != 200) {
						response = res.response.message;
						break;
					}
				}
			}
		}
		return commons.formatResult(false, 'Failed to send Invoke Transaction', response);
	}
}

exports.query = async (ccparams) => {
	const org = ccparams.org;
	const chaincodeId = ccparams.chaincode;
	const functionName = ccparams.function;
	const ccargs = commons.argExtract(ccparams.args);
	const channelName = ccparams.channel;

	const client = await commons.createClient(org);
	logger.debug('Got HFC client for Organization "%s"', org);

	const channel = await client.getNetwork(channelName);
    const contract = channel.getContract(chaincodeId);

    const tx = contract.createTransaction(functionName);

    try {
		const payload = await tx.evaluate(...ccargs);
        return commons.formatResult(true, '', payload)
	} catch (e) {
		let response = e;
		if (e.errors && e.errors[0]) {
			response = e.errors[0];
		}
		logger.error(e);
		return commons.formatResult(false, 'Failed to send Query Transaction', response);
	}
}
