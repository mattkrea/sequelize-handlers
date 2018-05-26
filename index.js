'use strict';

const { formatOutput, isSequelizeModel } = require('./lib/utils');
const { methods, errors } = require('./lib/constants');
const { buildWhere } = require('./lib/querying');
const dasherize = require('dasherize');
const parser = require('body-parser');
const express = require('express');

const handleRequestError = (req, res) => {
	return (e) => {
		switch (e.name) {
		case 'SequelizeForeignKeyConstraintError':
			return res.status(400).json({ errors: [{ message: 'foreign key constraint error' }] });
		case 'SequelizeValidationError':
		case 'SequelizeUniqueConstraintError': {
			const results = [];
			e.errors.forEach((x) => {
				results.push({
					message: x.message,
					field: x.path
				});
			});

			return res.status(422).json({ errors: results });
		}
		case 'SequelizeDatabaseError':
			return res.status(422).json({ errors: [{ message: e.message }] });
		}

		switch (e) {
		case errors.notFound:
			return res.status(404).json({ errors: [{ message: e.message }] });
		}

		return res.status(500).json({ errors: [{ message: e.message }] });
	};
};

const createChildren = (router, model, opts) => {

	const associations = Object.keys(model.associations);
	if (associations.length === 0) {
		return;
	}

	for (const association of associations) {

		// For now we can't support models with a mapping table
		// so skip if we encounter any
		if (typeof model.associations[association].through !== 'undefined') {
			continue;
		}

		// We also need to disallow overriding output names for children
		// currently since they would conflict with the parent
		const options = Object.assign(opts, { overrideOutputName: null });

		const child = model.associations[association].target;

		if (options.handlers.get === true) {
			router.get(`/:parent/${dasherize(association)}/:id`, (req, res) => {

				let query = buildWhere(methods.GET, req, options);

				// Adjust the query to filter on the child
				query.where[model.associations[association].foreignKey] = req.params.parent;

				// Exclude relations since we will assume the caller already
				// knows the related (i.e. parent) models
				delete query.include;

				child.findOne(buildWhere(methods.GET, req, options)).then((results) => {
					if (!results) {
						throw errors.notFound;
					}

					return res.status(200).json(formatOutput(results, child, options));
				}).catch(handleRequestError(req, res));
			});

			router.get(`/:parent/${dasherize(association)}`, (req, res) => {

				let query = buildWhere(methods.GET, req, options);

				// Adjust the query to filter on the child
				query.where[model.associations[association].foreignKey] = req.params.parent;

				// Exclude relations since we will assume the caller already
				// knows the related (i.e. parent) models
				delete query.include;

				child.findAll(query).then((results) => {
					return res.status(200).json(formatOutput(results, child, options));
				}).catch((e) => {
					return res.status(500).json({ errors: [{ message: e.message }] });
				});
			});
		}
	}
};

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

			model.findAll(query).then((results) => {
				return res.status(200).json(formatOutput(results, model, options));
			}).catch((e) => {
				return res.status(500).json({ errors: [{ message: e.message }] });
			});
		});

		router.get('/:id', (req, res) => {
			model.findOne(buildWhere(methods.GET, req, options)).then((results) => {
				if (!results) {
					throw errors.notFound;
				}

				return res.status(200).json(formatOutput(results, model, options));
			}).catch(handleRequestError(req, res));
		});
	}

	if (options.handlers.post === true) {
		router.post('/', (req, res) => {

			let input = (options.disableNestedData === true ? req.body : req.body[model.name]);

			model.create(input, buildWhere(methods.POST, req, options)).then((results) => {

				if (options.hooks && typeof options.hooks.afterCreate === 'function') {
					options.hooks.afterCreate(model, results);
				}

				return res.status(200).json(formatOutput(results, model, options));
			}).catch(handleRequestError(req, res));
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
			model.destroy(buildWhere(methods.DELETE, req, options)).then((affected) => {
				if (affected !== 1) {
					throw errors.notFound;
				}

				return res.status(200).json({ status: 'ok' });
			}).catch(handleRequestError(req, res));
		});
	}

	if (options.createChildren === true) {
		createChildren(router, model, options);
	}

	return router;
};

const createRouter = (controllerOptions, routerOptions) => {

	if (!Array.isArray(controllerOptions)) {
		throw new TypeError(`'controllerOptions' must be an array`);
	}

	const router = express.Router();

	if (routerOptions) {
		// Append middleware to the start if we have any top-level included
		if (Array.isArray(routerOptions.middleware)) {
			router.use(routerOptions.middleware);
		}
	}

	// Iterate over provided option sets which should be exactly the same as
	// those that are provided for `createController`
	controllerOptions.forEach((controller) => {

		let model;
		let options = {
			handlers: {
				get: true,
				put: true,
				post: true,
				delete: true
			}
		};

		// If router options were provided we will run through them
		// and override any default controller options
		if (routerOptions) {
			Object.keys(routerOptions).forEach((option) => {
				if (option === 'middleware') {
					// Middleware should remain where they are rather than overwriting
					// any that may have been set on the specific controller
					return;
				} else if (option === 'handlers') {
					Object.assign(options[option], routerOptions[option]);
				} else {
					options[option] = routerOptions[option];
				}
			});
		}

		if (isSequelizeModel(controller)) {
			model = controller;
		} else if (isSequelizeModel(controller.model)) {
			model = controller.model;
			options = Object.assign(options, controller.options);
		} else {
			throw errors.invalidModel;
		}

		router.use(`/${dasherize(model.options.name.plural)}`, createController(model, options));
	});

	return router;
};

module.exports = {
	createController,
	createRouter
};
