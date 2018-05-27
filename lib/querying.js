'use strict';

const { HTTP_METHOD, HOOK } = require('./constants');
const { execHook } = require('./utils');
const { Op } = require('sequelize');

exports.buildWhere = (method, req, options) => {
	const query = {
		where: {},
		include: options.relationships,
		limit: undefined,
		offset: undefined
	};

	if (req.params.id) {
		query.where.id = req.params.id;
	}

	if (method === HTTP_METHOD.POST) {
		query.returning = true;
	}

	if (method === HTTP_METHOD.DELETE) {
		query.limit = 1;
	}

	if (method === HTTP_METHOD.GET) {
		if (options.limit && req.query.limit) {
			query.limit = req.query.limit > options.limit ? options.limit : req.query.limit;
		} else {
			query.limit = req.query.limit || options.limit;
		}

		if (req.query.offset) {
			query.offset = req.query.offset;
		}

		if (req.query.filter) {
			for (const field of Object.keys(req.query.filter)) {
				query.where[field] = req.query.filter[field];
			}
		}

		if (req.query.search) {
			for (const field of Object.keys(req.query.search)) {
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
			}
		}

		if (req.query.attributes) {
			try {
				req.query.attributes = req.query.attributes.split(',');
			} catch (e) {
				// Should probably notify the caller here that their query
				// contained garbage data
			}

			query.attributes = req.query.attributes;
		}
	}

	execHook(HOOK.BEFORE_QUERY, options, query, req);

	return query;
};
