'use strict';

const { createController } = require('../index');
const supertest = require('supertest');
const assert = require('assert');
const db = require('./db');

describe('PUT /<model>/<id>', () => {
	before(async () => {
		await db.sequelize.sync({ force: true })
		await db.author.bulkCreate([
			{ id: 1, name: 'Bud' },
			{ id: 2, name: 'Frank' }
		]);
		await db.post.bulkCreate([
			{ id: 1, authorId: 1, title: 'One Title' },
			{ id: 2, authorId: 1, title: 'Two Titles' },
			{ id: 3, authorId: 2, title: 'Three Titles' }
		]);
	});

	it('should throw validation error for missing fields', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.put('/authors/1')
			.set('Content-Type', 'application/json')
			.send({
				author: {
					id: 1,
					name: null
				}
			})
			.expect(422, (e, res) => {
				assert.equal(res.body.errors.length, 1);
				assert.equal(res.body.errors[0].message, 'author.name cannot be null');
				done();
			});
	});

	it('should disallow changing primary key', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.put('/authors/1')
			.set('Content-Type', 'application/json')
			.send({
				author: {
					id: 10,
					name: 'NewName'
				}
			})
			.expect(422, (e, res) => {
				assert.equal(res.body.errors.length, 1);
				assert.equal(res.body.errors[0].message, 'cannot change record primary key');
				done();
			});
	});

	it('should successfully update record with valid request', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.put('/authors/1')
			.set('Content-Type', 'application/json')
			.send({
				author: {
					name: 'NewName'
				}
			})
			.expect(200, (e, res) => {
				assert.equal(res.body.author.name, 'NewName');
				assert.equal(res.body.author.id, 1);
				done();
			});
	});
});
