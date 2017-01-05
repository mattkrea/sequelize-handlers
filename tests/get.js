'use strict';

const { createController } = require('../index');
const supertest = require('supertest');
const assert = require('assert');
const db = require('./db');

describe('GET /<model>', () => {
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

	it('should return all available records', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.get('/authors')
			.expect(200, (e, res) => {
				assert.equal(res.body.authors.length, 2);
				done();
			});
	});

	it('should support limiting', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.get('/authors?limit=1')
			.expect(200, (e, res) => {
				assert.equal(res.body.authors.length, 1);
				done();
			});
	});

	it('should support offset', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.get('/authors?limit=1&offset=4')
			.expect(200, (e, res) => {
				assert.equal(res.body.authors.length, 0);
				done();
			});
	});

	it('should support filtering', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.get('/authors?filter[name]=Bud')
			.expect(200, (e, res) => {
				assert.equal(res.body.authors.length, 1);
				done();
			});
	});

	it('should support search', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.get('/authors?search[name]=bu')
			.expect(200, (e, res) => {
				assert.equal(res.body.authors.length, 1);
				done();
			});
	});

	it('should not include relationships in root endpoint', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			relationships: [
				db.post
			]
		}));
		const request = supertest(app);

		request.get('/authors')
			.expect(200, (e, res) => {
				assert.equal(res.body.authors.length, 2);
				assert.equal(res.body.authors[0].posts, undefined);
				done();
			});
	});
});

describe('GET /<model>/<id>', () => {
	it('should 404 for an invalid ID', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.get('/authors/100')
			.expect(404, (e, res) => {
				assert.equal(res.status, 404);
				assert.equal(res.body.errors[0].message, 'record not found');
				done();
			});
	});

	it('should return a valid record', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.get('/authors/1')
			.expect(200, (e, res) => {
				assert.equal(res.body.author.name, 'Bud');
				done();
			});
	});

	it('should include any valid relationships', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			relationships: [
				db.post
			]
		}));
		const request = supertest(app);

		request.get('/authors/1')
			.expect(200, (e, res) => {
				assert.equal(res.body.author.name, 'Bud');
				assert.equal(res.body.author.posts.length, 2);
				done();
			});
	});

	it('should only return requested attributes', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.get('/authors/1?attributes=name')
			.expect(200, (e, res) => {
				assert.equal(res.body.author.name, 'Bud');
				assert.equal(res.body.author.id, undefined);
				done();
			});
	});
});
