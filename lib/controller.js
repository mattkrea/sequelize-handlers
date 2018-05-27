'use strict';

const { isSequelizeModel, applyMiddleware } = require('./utils');
const { findOne, findAll, createRecord, updateRecord, deleteRecord } = require('./database');
const { HTTP_METHOD, errors } = require('./constants');
const createChildren = require('./children');
const { buildWhere } = require('./querying');
const parser = require('body-parser');
const express = require('express');

const defaults = {
	allowChangingPrimaryKey: false,
	includeRelationsInGetAll: false,
	disableBodyParser: false,
	overrideOutputName: null,
	limit: undefined,
	restrictedFields: [],
	relationships: [],
	createChildren: false,
	handlers: {
		get: true,
		put: true,
		post: true,
		delete: true
	},
	middleware: [],
	useLike: true
};

const createController = (model, options) => {

	if (!isSequelizeModel(model)) {
		throw errors.invalidModel;
	}

	const router = express.Router();

	options = Object.assign({}, defaults, options);

	if (options.disableBodyParser !== true) {
		router.use(parser.json());
	}

	// Override for `$iLike` in Postgres
	try {
		if (model.sequelize.dialect.name === 'postgres') {
			options.useLike = false;
		}
	} catch (e) {
		// Nothing to do here
	}

	applyMiddleware(router, options);

	if (options.handlers.get === true) {
		router.get('/', (req, res) => {
			const query = buildWhere(HTTP_METHOD.GET, req, options);
			// By default we will not look up relations on the root endpoint as
			// this can become very slow with a lot of records
			if (options.includeRelationsInGetAll !== true) {
				delete query.include;
			}
			return findAll(model, query, res, res, options);
		});

		router.get('/:id', (req, res) => {
			const query = buildWhere(HTTP_METHOD.GET, req, options);
			return findOne(model, query, req, res, options);
		});
	}

	if (options.handlers.post === true) {
		router.post('/', (req, res) => {
			const input = (options.disableNestedData === true ? req.body : req.body[model.name]);
			const query = buildWhere(HTTP_METHOD.POST, req, options);
			return createRecord(model, query, input, req, res, options);
		});
	}

	if (options.handlers.put === true) {
		router.put('/:id', (req, res) => {
			const query = buildWhere(HTTP_METHOD.PUT, req, options);
			const input = (options.disableNestedData === true ? req.body : req.body[model.name]);
			return updateRecord(model, query, input, req, res, options);
		});
	}

	if (options.handlers.delete === true) {
		router.delete('/:id', (req, res) => {
			const query = buildWhere(HTTP_METHOD.DELETE, req, options);
			return deleteRecord(model, query, req, res);
		});
	}

	createChildren(router, model, options);

	return router;
};

module.exports = createController;
