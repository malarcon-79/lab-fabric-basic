
/**
 * @author Marco Alarcón
 * @description API router
 */

'use strict';

module.exports.setup = function (app) {

	app.get('/', function (req, res, next) {
		res.render('index', { title: 'HyperLedger Fabric generic Client API - not for use in Production!' });
	});

	app.post('/smartcontract/invoke', require('../controllers/smartcontract_controller').invoke);
	app.post('/smartcontract/query', require('../controllers/smartcontract_controller').query);

};