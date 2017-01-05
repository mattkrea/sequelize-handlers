'use strict';

const Sequelize = require('sequelize');

const sequelize = new Sequelize('test', '', '', {
	dialect: 'sqlite',
	logging: false
});

exports.post = sequelize.define('post', {
	id: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true,
		allowNull: false
	},
	authorId: {
		type: Sequelize.INTEGER,
		allowNull: false,
		references: {
			model: 'authors',
			key: 'id'
		},
		onUpdate: 'CASCADE',
		onDelete: 'CASCADE'
	},
	title: {
		type: Sequelize.STRING
	},
	description: {
		type: Sequelize.TEXT
	}
});

exports.author = sequelize.define('author', {
	id: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true,
		allowNull: false
	},
	name: {
		type: Sequelize.STRING,
		allowNull: false
	}
});

exports.account = sequelize.define('account', {
	id: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true,
		allowNull: false
	},
	authorId: {
		type: Sequelize.INTEGER,
		allowNull: false,
		references: {
			model: 'authors',
			key: 'id'
		},
		onUpdate: 'CASCADE',
		onDelete: 'RESTRICT'
	}
});

exports.author.hasMany(exports.post, {
	foreignKey: 'authorId'
});
exports.post.belongsTo(exports.author, {
	foreignKey: 'authorId'
});
exports.author.hasMany(exports.account, {
	foreignKey: 'authorId'
});
exports.account.belongsTo(exports.author, {
	foreignKey: 'authorId'
});

exports.sequelize = sequelize;
