const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const User = require("./User");

const WishlistItem = sequelize.define("WishlistItem", {
  text: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
});

// Настройка связи
User.hasMany(WishlistItem, { foreignKey: "userId", onDelete: "CASCADE" });
WishlistItem.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE" });

module.exports = WishlistItem;
