const express = require("express");
const User = require("../models/User");
const router = express.Router();

// Создание пользователя
router.post("/", async (req, res) => {
  const { telegramId, username } = req.body;

  try {
    let user = await User.findOne({ where: { telegramId } });

    if (!user) {
      user = await User.create({ telegramId, username });
      return res.status(201).json({
        user: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
        },
        created: true,
        message: "User created",
      });
    }

    res.status(200).json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
      },
      created: false,
      message: "User already exists",
    });
  } catch (error) {
    console.error("Ошибка создания пользователя:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Получение пользователя по Telegram ID
router.get("/:telegramId", async (req, res) => {
  try {
    console.log('req.params.telegramId: ' + req.params.telegramId);
    
    const user = await User.findOne({
      where: { telegramId: req.params.telegramId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
    });
  } catch (error) {
    console.error("Ошибка получения пользователя:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

module.exports = router;
