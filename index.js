'use strict';

const Sequelize = require('sequelize');
const pluralize = Sequelize.Utils.pluralize;
const dasherize = require('dasherize');
const parser = require('body-parser');
const express = require('express');

const methods = {
	GET: 'GET',
	PUT: 'PUT',
	POST: 'POST',
	PATCH: 'PATCH',
	DELETE: 'DELETE'
};

const errors = {
	notFound: new Error(`record not found`),
	invalidModel: new TypeError(`'model' must be a valid Sequelize model`)
};

let buildWhere = (method, req, options) => {
	let query = {
		where: {},
		include: options.relationships,
		limit: undefined,
		offset: undefined
	};

	if (req.params.id) {
		query.where.id = req.params.id;
	}

	if (method === methods.POST) {
		query.returning = true;
	}

	if (method === methods.DELETE) {
		query.limit = 1;
	}

	if (method === methods.GET) {
		if (req.query.limit) {
			query.limit = req.query.limit;
		} else if (options.limit) {
			query.limit = options.limit;
		}

		if (req.query.offset) {
			query.offset = req.query.offset;
		}

		if (req.query.filter) {
			Object.keys(req.query.filter).forEach((field) => {
				query.where[field] = req.query.filter[field];
			});
		}

		if (req.query.search) {
			Object.keys(req.query.search).forEach((field) => {
				if (options.useLike === true) {
					query.where[field] = {
						$like: `%${req.query.search[field]}%`
					}
				} else {
					query.where[field] = {
						$iLike: `%${req.query.search[field]}%`
					}
				}
			});
		}

		if (req.query.attributes) {
			try {
				req.query.attributes = req.query.attributes.split(',');
			} catch (e) {
				// Should we error here?
			}

			query.attributes = req.query.attributes;
		}
	}

	if (options.hooks && typeof options.hooks.beforeQuery === 'function') {
		options.hooks.beforeQuery(query, req);
	}

	return query;
};

let formatOutput = (results, model, options) => {
	let response = {};
	let plural = Array.isArray(results);

	if (options.disableNestedData === true) {
		return results;
	} else if (options.overrideOutputName) {
		if (plural) {
			response[pluralize(options.overrideOutputName)] = results;
		} else {
			response[options.overrideOutputName] = results;
		}
	} else {
		if (plural) {
			response[pluralize(model.name)] = results;
		} else {
			response[model.name] = results;
		}
	}
	return response;
};

let createController = (model, options) => {

	if (!(model instanceof Sequelize.Model)) {
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
		handlers: {
			get: true,
			put: true,
			post: true,
			delete: true
		},
		middleware: {
			pre: [],
			post: []
		},
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

	if (options.middleware && Array.isArray(options.middleware)) {
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
			}).catch((e) => {
				switch (e) {
				case errors.notFound:
					return res.status(404).json({ errors: [{ message: e.message }] });
				}

				return res.status(500).json({ errors: [{ message: e.message }] });
			});
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
			}).catch((e) => {
				switch (e.name) {
				case 'SequelizeValidationError':
				case 'SequelizeUniqueConstraintError':

					let results = [];

					e.errors.forEach((x) => {
						results.push({
							message: x.message,
							field: x.path
						});
					});

					return res.status(422).json({ errors: results });
				}

				return res.status(500).json({ errors: [{ message: e.message }] });
			});
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
			}).catch((e) => {
				switch (e.name) {
				case 'SequelizeValidationError':
				case 'SequelizeUniqueConstraintError':

					let results = [];

					e.errors.forEach((x) => {
						results.push({
							message: x.message,
							field: x.path
						});
					});

					return res.status(422).json({ errors: results });
				case 'SequelizeDatabaseError':
					return res.status(422).json({ errors: [{ message: e.message }] });
				}

				switch (e) {
				case errors.notFound:
					return res.status(404).json({ errors: [{ message: e.message }] });
				}

				return res.status(500).json({ errors: [{ message: e.message }] });
			});
		});
	}

	if (options.handlers.delete === true) {
		router.delete('/:id', (req, res) => {
			model.destroy(buildWhere(methods.DELETE, req, options)).then((affected) => {
				if (affected !== 1) {
					throw errors.notFound;
				}

				return res.status(200).json({ status: 'ok' });
			}).catch((e) => {
				switch (e.name) {
				case 'SequelizeForeignKeyConstraintError':
					return res.status(400).json({ errors: [{ message: 'foreign key constraint error' }]});
				}

				switch (e) {
				case errors.notFound:
					return res.status(404).json({ errors: [{ message: e.message }] });
				}

				return res.status(500).json({ errors: [{ message: e.message }] });
			});
		});
	}

	return router;
};

let createRouter = (controllerOptions, routerOptions) => {

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

		if (controller instanceof Sequelize.Model) {
			model = controller;
		} else if (controller.model instanceof Sequelize.Model) {
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
