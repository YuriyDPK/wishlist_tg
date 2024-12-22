const express = require("express");
const WishlistItem = require("../models/WishlistItem");
const User = require("../models/User");
const router = express.Router();

// Добавление элемента в вишлист
router.post("/", async (req, res) => {
  const { userId, text } = req.body;

  try {
    const user = await User.findOne({ where: { telegramId: userId } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const item = await WishlistItem.create({ userId: user.id, text });
    res.json({ message: "Wishlist item added", item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add wishlist item" });
  }
});

// Получение вишлиста пользователя
router.get("/:userId", async (req, res) => {
  try {
    // Ищем пользователя по telegramId
    const user = await User.findOne({
      where: { telegramId: req.params.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Ищем элементы вишлиста по user.id
    const items = await WishlistItem.findAll({
      where: { userId: user.id },
    });

    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get wishlist" });
  }
});

// Удаление элемента из вишлиста
router.delete("/:itemId", async (req, res) => {
  try {
    const item = await WishlistItem.findByPk(req.params.itemId);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    await item.destroy();
    res.json({ message: "Wishlist item deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete wishlist item" });
  }
});

module.exports = router;
