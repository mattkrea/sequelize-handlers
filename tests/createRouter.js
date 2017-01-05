'use strict';

const { createRouter } = require('../index');
const Sequelize = require('sequelize');
const supertest = require('supertest');
const assert = require('assert');
const db = require('./db');

describe('createRouter()', () => {
	before((done) => {
		db.sequelize.sync({ force: true }).then(() => {
			return db.author.bulkCreate([
				{
					id: 1,
					name: 'Bud'
				},
				{
					id: 2,
					name: 'Frank'
				}
			]).then(() => {
				return db.post.bulkCreate([
					{
						id: 1,
						authorId: 1,
						title: 'One Title'
					},
					{
						id: 2,
						authorId: 1,
						title: 'Two Titles'
					},
					{
						id: 3,
						authorId: 2,
						title: 'Three Titles'
					}
				]);
			});
		}).then(() => {
			done();
		}).catch(done);
	});

	it('should require an array for options', (done) => {
		try {
			createRouter('123', '123');
			done(true);
		} catch (e) {
			done();
		}
	});

	it('should accept a plain model for array entry', (done) => {
		const app = require('express')();
		app.use(createRouter([db.author]));
		const request = supertest(app);

		request.get('/authors')
			.expect(200, done);
	});

	it('should accept an object for each array entry', (done) => {
		const app = require('express')();
		app.use(createRouter([
			{
				model: db.author,
				options: {
					middleware: [
						(req, res, next) => {
							req.testValue = 'test';
							return next();
						},
						(req, res, next) => {
							assert.equal(req.testValue, 'test');
							done();
						}
					]
				}
			}
		]));
		const request = supertest(app);

		request.get('/authors')
			.expect(200, (e, res) => {
				// Nothing
			});
	});

	it('should accept mixed array entries', (done) => {
		const app = require('express')();
		app.use(createRouter([
			{
				model: db.author,
				options: {
					middleware: [
						(req, res, next) => {
							req.testValue = 'test';
							return next();
						},
						(req, res, next) => {
							assert.equal(req.testValue, 'test');
							return next();
						}
					]
				}
			},
			db.post
		]));
		const request = supertest(app);

		request.get('/authors')
			.expect(200, (e, res) => {
				request.get('/posts')
					.expect(200, (e, res) => {
						assert.equal(res.body.posts.length, 3);
						done();
					});
			});
	});

	it('should accept top-level middleware', (done) => {
		const app = require('express')();
		app.use(createRouter([
			{
				model: db.author,
				options: {
					middleware: [
						(req, res, next) => {
							done('failed');
						}
					]
				}
			}
		], {
			middleware: [
				(req, res, next) => {
					req.testValue = 'test';
					return next();
				},
				(req, res, next) => {
					done();
				}
			]
		}));
		const request = supertest(app);

		request.get('/authors')
			.expect(200, (e, res) => {
				// Nothing
			});
	});

	it('should accept top-level controller options (global limit)', (done) => {
		const app = require('express')();
		app.use(createRouter([db.author], {
			limit: 1
		}));
		const request = supertest(app);

		request.get('/authors')
			.expect(200, (e, res) => {
				assert.equal(res.body.authors.length, 1);
				done();
			});
	});

	it('should accept top-level controller options (handlers)', (done) => {
		const app = require('express')();
		app.use(createRouter([db.author], {
			handlers: {
				get: false
			}
		}));
		const request = supertest(app);

		request.get('/authors')
			.end((e, res) => {
				assert.equal(res.status, 404);
				request.delete('/authors/1')
					.expect(200, done);
			});
	});
});