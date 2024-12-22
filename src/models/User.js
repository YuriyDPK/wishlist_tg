const { DataTypes } = require("sequelize");
const sequelize = require("../database");

const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  telegramId: { type: DataTypes.STRING, unique: true, allowNull: false },
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
});

module.exports = User;
