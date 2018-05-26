'use strict';

const { formatOutput, isSequelizeModel, handleRequestError } = require('./utils');
const { findOne, findAll, createRecord, deleteRecord } = require('./database');
const { methods, errors } = require('./constants');
const createChildren = require('./children');
const { buildWhere } = require('./querying');
const parser = require('body-parser');
const express = require('express');

const createController = (model, options) => {

	if (!isSequelizeModel(model)) {
		throw errors.invalidModel;
	}

	const router = express.Router();

	options = Object.assign({
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
	}, options);

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

	if (Array.isArray(options.middleware)) {
		options.middleware.forEach((middleware) => {
			router.use(middleware);
		});
	}

	if (options.handlers.get === true) {
		router.get('/', (req, res) => {

			let query = buildWhere(methods.GET, req, options);

			// By default we will not look up relations on the root endpoint as
			// this can become very slow with a lot of records
			if (options.includeRelationsInGetAll !== true) {
				delete query.include;
			}

			return findAll(model, query, res, res, options);
		});

		router.get('/:id', (req, res) => {
			const query = buildWhere(methods.GET, req, options);
			return findOne(model, query, req, res, options);
		});
	}

	if (options.handlers.post === true) {
		router.post('/', (req, res) => {
			const input = (options.disableNestedData === true ? req.body : req.body[model.name]);
			const query = buildWhere(methods.POST, req, options);
			return createRecord(model, query, input, req, res, options);
		});
	}

	if (options.handlers.put === true) {
		router.put('/:id', (req, res) => {

			// Prevent a consumer from changing the primary key of a given record
			if (options.allowChangingPrimaryKey !== true
				&& model.primaryKeyField
				&& typeof req.body[model.name][model.primaryKeyField] !== 'undefined') {

				if (req.params.id != req.body[model.name][model.primaryKeyField]) {
					return res.status(422).json({
						errors: [{
							message: 'cannot change record primary key',
							field: model.primaryKeyField
						}]
					});
				}
			}

			model.findOne(buildWhere(methods.PUT, req, options)).then((result) => {
				if (!result) {
					throw errors.notFound;
				}

				let input = (options.disableNestedData === true ? req.body : req.body[model.name]);

				Object.keys(input).forEach((field) => {
					result.set(field, input[field]);
				});

				if (options.hooks && typeof options.hooks.beforeUpdate === 'function') {
					options.hooks.beforeUpdate(model, result);
				}

				return result.save();
			}).then((results) => {

				if (options.hooks && typeof options.hooks.afterUpdate === 'function') {
					options.hooks.afterUpdate(model, results);
				}

				return res.status(200).json(formatOutput(results, model, options));
			}).catch(handleRequestError(req, res));
		});
	}

	if (options.handlers.delete === true) {
		router.delete('/:id', (req, res) => {
			const query = buildWhere(methods.DELETE, req, options);
			return deleteRecord(model, query, req, res);
		});
	}

	if (options.createChildren === true) {
		createChildren(router, model, options);
	}

	return router;
};

module.exports = createController;