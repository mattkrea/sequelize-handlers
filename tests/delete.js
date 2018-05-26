'use strict';

const { createController } = require('../index');
const supertest = require('supertest');
const assert = require('assert');
const db = require('./db');

describe('DELETE /<model>/<id>', () => {
	before(async () => {
		await db.sequelize.sync({ force: true });
		await db.author.bulkCreate([
			{ id: 1, name: 'Bud' },
			{ id: 2, name: 'Frank' }
		]);
		await db.post.bulkCreate([
			{ id: 1, authorId: 1, title: 'One Title' },
			{ id: 2, authorId: 1, title: 'Two Titles' },
			{ id: 3, authorId: 2, title: 'Three Titles' }
		]);
		await db.account.bulkCreate([
			{ id: 1, authorId: 2 }
		]);
	});

	it('should 404 on invalid id', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.delete('/authors/4')
			.expect(404, (e, res) => {
				assert.equal(res.body.errors.length, 1);
				assert.equal(res.body.errors[0].message, 'record not found');
				done();
			});
	});

	it('should fail to delete the record with existing relations', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.delete('/authors/2')
			.expect(400, (e, res) => {
				assert.equal(res.body.errors.length, 1);
				assert.equal(res.body.errors[0].message, 'foreign key constraint error');
				done();
			});
	});

	it('should delete the record', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.delete('/authors/1')
			.expect(200, (e, res) => {
				assert.equal(res.body.status, 'ok');
				done();
			});
	});
});
