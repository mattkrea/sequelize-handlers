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

module.exports = {
	findOne,
	findAll
};
