const express = require("express");
const { Op } = require("sequelize"); // Импорт Op для условий
const Friend = require("../models/Friend");
const User = require("../models/User");
const router = express.Router();

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
  console.log("userId:", userId, "friendId:", friendId, "status:", status);

  try {
    // Найти запрос в обоих направлениях
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

    // Обновить статус запроса
    request.status = status;
    await request.save();

    res.json({ message: "Friend request updated successfully", request });
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

    // Получаем друзей пользователя
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
          as: "Requester", // Пользователь, отправивший запрос
          attributes: ["id", "username", "telegramId"],
        },
        {
          model: User,
          as: "Receiver", // Пользователь, принявший запрос
          attributes: ["id", "username", "telegramId"],
        },
      ],
    });

    console.log("Friends: ", JSON.stringify(friends, null, 2));

    res.json(friends);
  } catch (error) {
    console.error("Ошибка получения списка друзей:", error);
    res.status(500).json({ error: "Failed to get friends" });
  }
});


// Отклонить заявку
router.delete("/", async (req, res) => {
  const { userId, friendTelegramId } = req.body;

  try {
   
    if (!userId || !friendTelegramId) {
      return res.status(404).json({ error: "User or friend not found" });
    }
    console.log('userId: ' + userId);
    console.log('friendTelegramId: ' + friendTelegramId);
    
    // Удаляем запись о дружбе/запросе
    const friendship = await Friend.findOne({
      where: {
        [Op.or]: [
          { userId: userId, friendId: friendTelegramId },
          { userId: friendTelegramId, friendId: userId },
        ],
      },
    });

    if (!friendship) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    await friendship.destroy();

    res.json({ success: true, message: "Friend request deleted successfully" });
  } catch (error) {
    console.error("Ошибка при удалении запроса:", error);
    res.status(500).json({ error: "Failed to delete friend request" });
  }
});

// Удаление друга
router.delete("/delete/", async (req, res) => {
  const { userId, friendTelegramId } = req.body;

  try {
    const userRespone = await User.findOne({
      where: { telegramId: userId },
    });

    const friendResponce = await User.findOne({
      where: { telegramId: friendTelegramId },
    });
    if (!userRespone || !friendResponce) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log('userId: ' + userRespone.id);
    console.log('friendId: ' + friendResponce.id);
    
    // Удаляем запись о дружбе/запросе
    const friendship = await Friend.findOne({
      where: {
        [Op.or]: [
          { userId: userRespone.id, friendId: friendResponce.id },
          { userId: friendResponce.id, friendId: userRespone.id },
        ],
      },
    });

    if (!friendship) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    await friendship.destroy();

    res.json({ success: true, message: "Friend request deleted successfully" });
  } catch (error) {
    console.error("Ошибка при удалении запроса:", error);
    res.status(500).json({ error: "Failed to delete friend request" });
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
          as: "Requester", // Ассоциация на отправителя запроса
          attributes: ["id", "username"],
        },
      ],
    });

    // Форматируем результат
    const formattedRequests = requests.map((request) => ({
      userId: request.Requester.id,
      username: request.Requester.username,
    }));

    res.json(formattedRequests);
  } catch (error) {
    console.error("Ошибка получения входящих заявок:", error);
    res.status(500).json({ error: "Failed to get friend requests" });
  }
});


module.exports = router;
