'use strict';

exports.methods = {
	GET: 'GET',
	PUT: 'PUT',
	POST: 'POST',
	PATCH: 'PATCH',
	DELETE: 'DELETE'
};

exports.hooks = {
	AFTER_CREATE: 'afterCreate',
	BEFORE_UPDATE: 'beforeUpdate',
	AFTER_UPDATE: 'afterUpdate'
};

exports.errors = {
	notFound: new Error(`record not found`),
	invalidModel: new TypeError(`'model' must be a valid Sequelize model`)
};
