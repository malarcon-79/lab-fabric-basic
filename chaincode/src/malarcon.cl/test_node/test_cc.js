'use strict';
const shim = require('fabric-shim');

let logger = null;

let Chaincode = class {

	constructor() {
		// Force context binding for functions
		this.iterateThroughQuery = this.iterateThroughQuery.bind(this);
		this.queryCustomers = this.queryCustomers.bind(this);
	}

	// The Init method is called when the Smart Contract is instantiated by the blockchain network
	// Best practice is to have any Ledger initialization in separate function -- see initLedger()
	async Init(stub) {
		logger = shim.newLogger('NODE_TEST_CC');
		logger.level = 'debug';

		logger.info('=========== Instantiated bcs-test chaincode ===========');
		return shim.success();
	}

	// The Invoke method is called as a result of an application request to run the Smart Contract.
	// The calling application program has also specified the particular smart contract
	// function to be called, with arguments
	async Invoke(stub) {
		let ret = stub.getFunctionAndParameters();
		logger.info(ret);

		let method = this[ret.fcn];
		if (!method) {
			logger.error('no function of name:' + ret.fcn + ' found');
			throw new Error('Received unknown function ' + ret.fcn + ' invocation');
		}
		try {
			let payload = await method(stub, ret.params);
			logger.debug('Payload is: ', payload);
			if (!payload) {
				payload = Buffer.from(JSON.stringify(ret.params));
			}
			return shim.success(payload);
		} catch (err) {
			logger.error(err);
			return shim.error(err);
		}
	}

	async ping(stub) {
		return Buffer.from('pong');
	}

	async queryCustomer(stub, args) {
		if (args.length != 1) {
			throw new Error('Incorrect number of arguments. Expecting RUT ex: 1-9');
		}
		let rut = args[0];

		let customerAsBytes = await stub.getState(rut); //get the customer from chaincode state
		if (!customerAsBytes || customerAsBytes.toString().length <= 0) {
			throw new Error('Customer RUT ' + rut + ' does not exist');
		}
		logger.debug(customerAsBytes.toString());
		return customerAsBytes;
	}

	async initLedger(stub, args) {
		logger.info('============= START : Initialize Ledger ===========');
		let customers = [];
		customers.push({
			rut: '1-9',
			firstName: 'Juan',
			lastName: 'Perez',
			amount: 1000,
			accountType: 'VIP',
			status: 'ACTIVE'
		});
		customers.push({
			rut: '2-7',
			firstName: 'Perico',
			lastName: 'Los Palotes',
			amount: 1000,
			accountType: 'BASIC',
			status: 'LOCKED'
		});
		customers.push({
			rut: '123-4',
			firstName: 'Pedro',
			lastName: 'Gonzalez',
			amount: 1000,
			accountType: 'BASIC',
			status: 'ACTIVE'
		});

		for (let i = 0; i < customers.length; i++) {
			let c = customers[i];
			await stub.putState(c.rut, Buffer.from(JSON.stringify(c)));
			logger.info('Added <--> ', c);
		}

		logger.info('============= END : Initialize Ledger ===========');
	}

	async createCustomer(stub, args) {
		logger.info('============= START : Create Customer ===========');
		if (args.length != 6) {
			throw new Error('Incorrect number of arguments. Expecting 6');
		}

		let customer = {
			rut: args[0],
			firstName: args[1],
			lastName: args[2],
			amount: Number(args[3]),
			accountType: args[4],
			status: args[5]
		};

		await stub.putState(customer.rut, Buffer.from(JSON.stringify(customer)));
		logger.info('============= END : Create Customer ===========');
	}

	async addCustomerFunds(stub, args) {
		logger.info('============= START : Add Customer funds ===========');
		if (args.length != 2) {
			throw new Error('Incorrect number of arguments. Expecting 2');
		}

		let rut = args[0];
		let customerAsBytes = await stub.getState(rut);
		let customer = JSON.parse(customerAsBytes);
		customer.amount += Number(args[1]);

		await stub.putState(rut, Buffer.from(JSON.stringify(customer)));
		logger.info('============= END : Add Customer funds ===========');
	}

	async queryAllCustomers(stub, args) {
		logger.info('============= START : Query all Customers ===========');
		let startKey = '';
		let endKey = '';

		let iterator = await stub.getStateByRange(startKey, endKey);

		let allResults = [];
		while (true) {
			let res = await iterator.next();

			if (res.value && res.value.value.toString()) {
				let jsonRes = {};
				logger.debug(res.value.value.toString('utf8'));

				jsonRes.Key = res.value.key;
				try {
					jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
				} catch (err) {
					logger.error(err);
					jsonRes.Record = res.value.value.toString('utf8');
				}
				allResults.push(jsonRes);
			}
			if (res.done) {
				logger.debug('end of data');
				await iterator.close();
				logger.info(allResults);
				return Buffer.from(JSON.stringify(allResults));
			}
		}
	}

	async queryCustomerHistory(stub, args) {
		logger.info('============= START : Query Customer History ===========');
		let rut = args[0];
		let iterator = await stub.getHistoryForKey(rut);
		let allResults = [];

		while (true) {
			let res = await iterator.next();

			logger.debug(res);
			if (res.value && res.value.value.toString()) {
				let jsonRes = {};
				let timestamp = res.value.timestamp;
				logger.debug('Timestamp (full, seconds, nanos): ', timestamp, timestamp.seconds, timestamp.nanos);

				logger.debug(res.value.value.toString('utf8'));

				jsonRes.Key = res.value.key;
				try {
					jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
				} catch (err) {
					logger.error(err);
					jsonRes.Record = res.value.value.toString('utf8');
				}
				allResults.push(jsonRes);
			}
			if (res.done) {
				logger.debug('end of data');
				await iterator.close();
				logger.info(allResults);
				return Buffer.from(JSON.stringify(allResults));
			}
		}
	}

	// iterateThroughQuery takes in an iterator object and returns a string of all
	// records in the set
	async iterateThroughQuery(iter) {
		let res = {};
		let outArray = [];
		while (!res.done) {
			res = await iter.next();
			if (res.value && res.value.value)
				outArray.push(res.value.value.toString('utf8'));
		}
		await iter.close();
		if (outArray.length === 0) {
			logger.debug('No record found');
			return Buffer.from('No record found');
		}

		return Buffer.from(JSON.stringify(outArray));
	}

	async queryCustomers(stub, args) {
		logger.info('============= START : Query Customers ===========');
		const jsonSnip = args[0];

		logger.debug('Beginning rich query');
		logger.debug('Search by: ', jsonSnip);

		//create iterator from selector key
		let partialIterator = await stub.getQueryResult(jsonSnip);
		//return all keys
		let out = await this.iterateThroughQuery(partialIterator);

		logger.debug('Rich Query Complete');
		logger.debug(out);
		return out;
	}
};

shim.start(new Chaincode());