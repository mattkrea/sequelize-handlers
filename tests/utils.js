'use strict';

const utils = require('../lib/utils');
const assert = require('assert');
const db = require('./db');

const plural = [
	{ id: 1, name: 'Tester' },
	{ id: 2, name: 'Another' }
];

const singular = {
	id: 1,
	name: 'Tester'
};

describe('formatOutput()', () => {
	it('should return first arg if nested output is disabled (plural)', () => {
		assert.deepEqual(utils.formatOutput(plural, null, {
			disableNestedData: true
		}), plural);
	});

	it('should nest under a top level property when provided (plural)', () => {
		assert.deepEqual(utils.formatOutput(plural, null, {
			overrideOutputName: 'result'
		}), {
				'results': plural
		});
	});

	it('should nest under the model name by default (plural)', () => {
		assert.deepEqual(utils.formatOutput(plural, db.post, {}), {
			'posts': plural
		});
	});

	it('should return first arg if nested output is disabled (singular)', () => {
		assert.deepEqual(utils.formatOutput(singular, null, {
			disableNestedData: true
		}), singular);
	});

	it('should nest under a top level property when provided (singular)', () => {
		assert.deepEqual(utils.formatOutput(singular, null, {
			overrideOutputName: 'result'
		}), {
				'result': singular
			});
	});

	it('should nest under the model name by default (singular)', () => {
		assert.deepEqual(utils.formatOutput(singular, db.post, {}), {
			'post': singular
		});
	});
});

describe('isSequelizeModel()', () => {
	it('should fail without a model', () => {
		assert.equal(utils.isSequelizeModel({}), false);
	});

	it('should accept a valid model', () => {
		assert.equal(utils.isSequelizeModel(db.post), true);
	});
});
