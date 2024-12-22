const express = require("express");
const { Op } = require("sequelize"); // Импорт Op для условий
const Friend = require("../models/Friend");
const User = require("../models/User");
const router = express.Router();

// Запрос на добавление друга
// Запрос на добавление друга
router.post("/request", async (req, res) => {
  const { telegramId, friendUsername } = req.body;

  try {
    // Находим пользователя
    const user = await User.findOne({ where: { telegramId } });
    if (!user) {
      return res.status(404).json({ error: "Requesting user not found" });
    }

    // Находим друга по username
    const friend = await User.findOne({ where: { username: friendUsername } });
    if (!friend) {
      return res.status(404).json({ error: "Friend not found" });
    }

    // Проверяем существование запроса дружбы
    const existingRequest = await Friend.findOne({
      where: {
        [Op.or]: [
          { userId: user.id, friendId: friend.id },
          { userId: friend.id, friendId: user.id },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return res.status(400).json({
          error: "Friend request already exists",
          message:
            "Friend request is already pending. Please wait for approval.",
          status: "pending",
        });
      } else if (existingRequest.status === "accepted") {
        return res.status(400).json({
          error: "Friend request already accepted",
          message: "You are already friends with this user.",
          status: "accepted",
        });
      } else if (existingRequest.status === "rejected") {
        return res.status(400).json({
          error: "Friend request rejected",
          message:
            "The friend request was rejected. You can send a new request.",
          status: "rejected",
        });
      }
    }

    // Создаем новый запрос дружбы
    const request = await Friend.create({
      userId: user.id,
      friendId: friend.id,
      status: "pending",
    });

    res.json({ message: "Friend request sent", request });
  } catch (error) {
    console.error("Ошибка в запросе на добавление друга:", error);
    res.status(500).json({ error: "Failed to send friend request" });
  }
});

// Обновление статуса запроса
router.post("/update", async (req, res) => {
  const { userId, friendId, status } = req.body;

  try {
    // Находим запрос с любым порядком userId и friendId
    const request = await Friend.findOne({
      where: {
        [Op.or]: [
          { userId, friendId, status: "pending" },
          { userId: friendId, friendId: userId, status: "pending" },
        ],
      },
    });

    if (!request) {
      return res
        .status(404)
        .json({ error: "Friend request not found or already processed" });
    }

    // Обновляем статус
    request.status = status;
    await request.save();

    res.json({ message: "Friend request updated", request });
  } catch (error) {
    console.error("Ошибка обновления запроса:", error);
    res.status(500).json({ error: "Failed to update friend request" });
  }
});

// Получение списка друзей
router.get("/:telegramId", async (req, res) => {
  try {
    // Находим пользователя по Telegram ID
    const user = await User.findOne({
      where: { telegramId: req.params.telegramId },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Получаем всех друзей с подтвержденным статусом
    const friends = await Friend.findAll({
      where: {
        [Op.or]: [
          { userId: user.id, status: "accepted" },
          { friendId: user.id, status: "accepted" },
        ],
      },
      include: [
        {
          model: User,
          as: "User", // Ассоциация должна быть настроена
          attributes: ["id", "username", "telegramId"],
        },
      ],
    });

    res.json(friends);
  } catch (error) {
    console.error("Ошибка получения списка друзей:", error);
    res.status(500).json({ error: "Failed to get friends" });
  }
});

// Удаление друга
router.delete("/:userId/:friendId", async (req, res) => {
  const { userId, friendId } = req.params;
  try {
    const result = await Friend.destroy({
      where: {
        [Op.or]: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (!result) {
      return res.status(404).json({ error: "Friend not found" });
    }

    res.json({ message: "Friend removed" });
  } catch (error) {
    console.error("Ошибка удаления друга:", error);
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

// Получение входящих заявок
router.get("/requests/:telegramId", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { telegramId: req.params.telegramId },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Получаем все входящие запросы в друзья
    const requests = await Friend.findAll({
      where: { friendId: user.id, status: "pending" },
      include: [
        {
          model: User,
          as: "User", // Ассоциация на отправителя запроса
          attributes: ["id", "username"],
        },
      ],
    });

    const formattedRequests = requests.map((request) => ({
      userId: request.User.id,
      username: request.User.username,
    }));

    res.json(formattedRequests);
  } catch (error) {
    console.error("Ошибка получения входящих заявок:", error);
    res.status(500).json({ error: "Failed to get friend requests" });
  }
});

module.exports = router;
