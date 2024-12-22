const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const User = require("./User");

const Friend = sequelize.define("Friend", {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  friendId: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM("pending", "accepted", "rejected"),
    defaultValue: "pending",
  },
});

// Настройка ассоциаций
User.belongsToMany(User, {
  through: Friend,
  as: "Friends", // Пользователи, которых добавили в друзья
  foreignKey: "userId",
  otherKey: "friendId",
});

Friend.belongsTo(User, { as: "User", foreignKey: "userId" });
Friend.belongsTo(User, { as: "Friend", foreignKey: "friendId" });

module.exports = Friend;
