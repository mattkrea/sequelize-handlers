'use strict';

const { formatOutput, handleRequestError } = require('./utils');
const { errors } = require('./constants');

const findOne = (model, query, req, res, options) => {
	return model.findOne(query).then((results) => {
		if (!results) {
			throw errors.notFound;
		}

		return res.status(200).json(formatOutput(results, model, options));
	}).catch(handleRequestError(req, res));
};

const findAll = (model, query, req, res, options) => {
	return model.findAll(query).then((results) => {
		return res.status(200).json(formatOutput(results, model, options));
	}).catch((e) => {
		return res.status(500).json({ errors: [{ message: e.message }] });
	});
};

const createRecord = (model, query, input, req, res, options) => {
	return model.create(input, query).then((results) => {

		if (options.hooks && typeof options.hooks.afterCreate === 'function') {
			options.hooks.afterCreate(model, results);
		}

		return res.status(201).json(formatOutput(results, model, options));
	}).catch(handleRequestError(req, res));
};

const deleteRecord = (model, query, req, res) => {
	return model.destroy(query).then((affected) => {
		if (affected !== 1) {
			throw errors.notFound;
		}

		return res.status(200).json({ status: 'ok' });
	}).catch(handleRequestError(req, res));
};

module.exports = {
	findOne,
	findAll,
	createRecord,
	deleteRecord
};
