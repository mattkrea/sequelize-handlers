'use strict';

const pluralize = require('pluralize');
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
	notFound: new Error('record not found')
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

	if (req.query.filter) {
		Object.keys(req.query.filter).forEach((field) => {
			query.where[field] = req.query.filter[field];
		});
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
	}

	return query;
};

let formatOutput = (results, model, options) => {
	let response = {};
	let plural = Array.isArray(results);
	if (options.overrideOutputName) {
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

exports.createController = (model, options) => {
	const router = express.Router();

	options = Object.assign({
		overrideOutputName: null,
		limit: undefined,
		restrictedFields: [],
		relationships: []
	}, options);

	router.use(parser.json());

	router.get('/', (req, res) => {
		model.findAll(buildWhere(methods.GET, req, options)).then((results) => {
			return res.status(200).json(formatOutput(results, model, options));
		}).catch((e) => {
			return res.status(500).json({ errors: [e.message] });
		});
	});

	router.get('/:id', (req, res) => {
		model.findOne(buildWhere(methods.GET, req, options)).then((results) => {
			if (typeof results === 'undefined') {
				throw errors.notFound;
			}

			return res.status(200).json(formatOutput(results, model, options));
		}).catch((e) => {
			switch (e) {
			case errors.notFound:
				return res.status(404).json({ errors: [e.message] });
			}

			return res.status(500).json({ errors: [e.message] });
		});
	});

	router.post('/', (req, res) => {
		model.create(req.body[model.name], buildWhere(methods.POST, req, options)).then((results) => {
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

			return res.status(500).json({ errors: [e.message] });
		});
	});

	router.put('/:id', (req, res) => {
		model.findOne(buildWhere(methods.PUT, req, options)).then((result) => {
			if (!result) {
				throw errors.notFound;
			}

			Object.keys(req.body[model.name]).forEach((field) => {
				result.set(field, req.body[model.name][field]);
			});

			if (model.name === 'employee') {
				trackChanges(result.changed(), result);
			}

			return result.save();
		}).then((results) => {
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
				return res.status(422).json({ errors: [e.message] });
			}

			switch (e) {
			case errors.notFound:
				return res.status(404).json({ errors: [e.message] });
			}

			return res.status(500).json({ errors: [e.message] });
		});
	});

	router.delete('/:id', (req, res) => {
		model.destroy(buildWhere(methods.DELETE, req, options)).then((affected) => {
			if (affected !== 1) {
				throw errors.notFound;
			}

			return res.status(200).json({ status: 'ok' });
		}).catch((e) => {
			switch (e) {
			case errors.notFound:
				return res.status(404).json({ errors: [e.message] });
			}

			return res.status(500).json({ errors: [e.message] });
		});
	});

	return router;
};