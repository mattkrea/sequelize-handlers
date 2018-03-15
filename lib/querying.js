'use strict';

const { methods } = require('./constants');
const { Op } = require('sequelize');

exports.buildWhere = (method, req, options) => {
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
		if (options.limit && req.query.limit) {
			query.limit = req.query.limit > options.limit ? options.limit : req.query.limit;
		} else {
			query.limit = req.query.limit || options.limit;
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
				let like = `%${req.query.search[field]}%`;
				if (options.useLike === true) {
					query.where[field] = {
						[Op.like]: like
					};
				} else {
					query.where[field] = {
						[Op.iLike]: like
					};
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
