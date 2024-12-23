const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const User = require("./User");

const Friend = sequelize.define("Friend", {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  friendId: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM("pending", "accepted"),
    defaultValue: "pending",
  },
});

// Настройка ассоциаций
User.belongsToMany(User, {
  through: Friend,
  as: "Friends", // Список друзей пользователя
  foreignKey: "userId",
  otherKey: "friendId",
});

Friend.belongsTo(User, { as: "Requester", foreignKey: "userId" }); // Отправивший запрос
Friend.belongsTo(User, { as: "Receiver", foreignKey: "friendId" }); // Принявший запрос

module.exports = Friend;
