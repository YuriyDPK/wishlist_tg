require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.BOT_TOKEN);
// Храним состояние пользователя
const state = {};

// Стартовая команда
bot.start(async (ctx) => {
  const telegramId = ctx.message.from.id;
  const username = ctx.message.from.username;

  try {
    const response = await axios.post("http://localhost:3000/api/users", {
      telegramId,
      username,
    });
    const { created } = response.data;

    if (created) {
      ctx.reply("Добро пожаловать! Ваш профиль создан.");
    } else {
      ctx.reply(`Добро пожаловать обратно, ${username}!`);
    }

    // Показываем меню после старта
    ctx.reply(
      "Выберите действие:",
      Markup.keyboard([
        ["📋 Мой Вишлист", "➕ Добавить в вишлист"],
        ["👀 Вишлист друга", "❌ Удалить из вишлиста"],
        ["👥 Список друзей", "➕ Добавить друга"],
        ["📥 Заявки в друзья", "❌ Удалить друга"],
      ]).resize()
    );
  } catch (error) {
    console.error(error);
    ctx.reply("Ошибка при создании профиля.");
  }
});

// Команда для отображения меню
bot.command("menu", (ctx) => {
  ctx.reply(
    "Выберите действие:",
    Markup.keyboard([
      ["📋 Мой Вишлист", "➕ Добавить в вишлист"],
      ["👀 Вишлист друга", "❌ Удалить из вишлиста"],
      ["👥 Список друзей", "➕ Добавить друга"],
      ["📥 Заявки в друзья", "❌ Удалить друга"],
    ]).resize()
  );
});
// Обработчик кнопки "👀 Вишлист друга"
bot.hears("👀 Вишлист друга", async (ctx) => {
  const telegramId = ctx.message.from.id;

  try {
    // Получение списка друзей
    const friendsResponse = await axios.get(
      `http://localhost:3000/api/friends/${telegramId}`
    );

    const friends = friendsResponse.data;

    if (friends.length === 0) {
      ctx.reply("У вас нет друзей с подтвержденным статусом дружбы.");
      return;
    }

    // Формируем список друзей с их номерами
    const friendList = friends
      .map((friend, index) => {
        // Определяем, кто из участников является другом
        const friendUsername =
          friend.Requester.telegramId === String(telegramId)
            ? friend.Receiver.username
            : friend.Requester.username;

        return `${index + 1}. ${friendUsername}`;
      })
      .join("\n");

    // Отправляем список друзей
    ctx.reply(
      `Ваши друзья:\n${friendList}\n\nВведите номер друга для просмотра его вишлиста.`
    );
    console.log('telegramId: ' + telegramId);
    
    // Сохраняем состояние для обработки выбора друга
    state[telegramId] = { viewingFriendWishlist: true, friends };
  } catch (error) {
    console.error("Ошибка загрузки друзей:", error);
    ctx.reply("Ошибка загрузки списка друзей.");
  }
});

// Обработчик кнопки "📥 Заявки в друзья"
bot.hears("📥 Заявки в друзья", async (ctx) => {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/friends/requests/${ctx.message.from.id}`
    );
    const requests = response.data;

    if (requests.length === 0) {
      ctx.reply("Нет входящих заявок в друзья.");
    } else {
      for (const request of requests) {
        await ctx.reply(
          `Пользователь ${request.username} хочет добавить вас в друзья.`,
          Markup.inlineKeyboard([
            Markup.button.callback(
              "Принять",
              `accept_friend_${request.userId}`
            ),
            Markup.button.callback(
              "Отклонить",
              `reject_friend_${request.userId}`
            ),
          ])
        );
      }
    }
  } catch (error) {
    console.error("Ошибка при получении заявок в друзья:", error);
    ctx.reply("Ошибка при загрузке заявок в друзья.");
  }
});
// Обработчик кнопки "📋 Мой Вишлист"
bot.hears("📋 Мой Вишлист", async (ctx) => {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/wishlist/${ctx.message.from.id}`
    );
    const items = response.data;
    if (items.length === 0) {
      ctx.reply("Ваш вишлист пуст.");
    } else {
      const itemList = items
        .map((item, index) => `${index + 1}. ${item.text}`)
        .join("\n");
      ctx.reply(`Ваш вишлист:\n${itemList}`);
    }
  } catch (error) {
    console.error(error);
    ctx.reply("Ошибка при загрузке вишлиста.");
  }
});

// Обработчик кнопки "➕ Добавить друга"
bot.hears("➕ Добавить друга", (ctx) => {
  const telegramId = ctx.message.from.id;
  console.log("telegramId: " + telegramId);

  // Переводим пользователя в состояние "добавления друга"
  state[telegramId] = { addingFriend: true };

  ctx.reply("Введите логин друга, которого хотите добавить:");
});

// Обработчик кнопки "👥 Список друзей"
bot.hears("👥 Список друзей", async (ctx) => {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/friends/${ctx.message.from.id}`
    );

    const friends = response.data;

    if (friends.length === 0) {
      return ctx.reply("Ваш список друзей пуст.");
    }

    // Формируем список друзей
    const friendList = friends.map((friend) => {
      // Определяем, кто является другом
      if (friend.Requester.telegramId === String(ctx.message.from.id)) {
        return friend.Receiver.username;
      } else {
        return friend.Requester.username;
      }
    }).join("\n");

    // Отправляем список друзей
    ctx.reply(`Ваши друзья:\n${friendList}`);
  } catch (error) {
    console.error("Ошибка при загрузке списка друзей:", error);
    ctx.reply("Ошибка при загрузке списка друзей.");
  }
});


// Обработчик кнопки "❌ Удалить друга"
bot.hears("❌ Удалить друга", async (ctx) => {
  const userId = ctx.message.from.id;

  try {
    // Запрашиваем список друзей
    const response = await axios.get(`http://localhost:3000/api/friends/${userId}`);
    const friends = response.data;

    if (friends.length === 0) {
      ctx.reply("Ваш список друзей пуст.");
      return;
    }

    // Формируем список друзей с номерами
    const friendList = friends
      .map((friend, index) => {
        const friendUsername =
          friend.Requester.telegramId === String(userId)
            ? friend.Receiver.username
            : friend.Requester.username;

        return `${index + 1}. ${friendUsername}`;
      })
      .join("\n");

    // Отправляем список друзей пользователю
    ctx.reply(
      `Выберите, кого хотите удалить из друзей:\n${friendList}\n\nВведите номер друга.`
    );

    // Сохраняем друзей в состоянии пользователя
    state[userId] = { deletingFriend: true, friends };
  } catch (error) {
    console.error("Ошибка загрузки списка друзей:", error);
    ctx.reply("Ошибка при загрузке списка друзей.");
  }
});

// Обработчик кнопки "➕ Добавить в вишлист"
bot.hears("➕ Добавить в вишлист", (ctx) => {
  const userId = ctx.message.from.id;

  // Устанавливаем состояние для пользователя: добавляем в вишлист
  state[userId] = { addingToWishlist: true };
  ctx.reply("Введите текст или ссылку для добавления в вишлист.");
});

// Обработчик кнопки "❌ Удалить из вишлиста"
bot.hears("❌ Удалить из вишлиста", async (ctx) => {
  const userId = ctx.message.from.id;

  try {
    const response = await axios.get(
      `http://localhost:3000/api/wishlist/${userId}`
    );
    const items = response.data;
    if (items.length === 0) {
      ctx.reply("Ваш вишлист пуст.");
    } else {
      const itemList = items
        .map((item, index) => `${index + 1}. ${item.text}`)
        .join("\n");

      ctx.reply(
        `Ваш вишлист:\n${itemList}\n\nВведите номер элемента для удаления.`
      );

      // Устанавливаем состояние для удаления
      state[userId] = { deletingFromWishlist: true, items };
    }
  } catch (error) {
    console.error(error);
    ctx.reply("Ошибка при загрузке вишлиста.");
  }
});

// ======== УДАЛЯЕМ или КОММЕНТИРУЕМ эту команду, т.к. логику перенесли ========
// bot.command("addfriend", async (ctx) => {
//   /*
//   Вся логика ушла в обработчик текста ниже
//   */
// });

bot.action(/accept_friend_(.+)/, async (ctx) => {
  const  friendTelegramId =Number(ctx.match[1]); // ID друга 
  const telegramId = ctx.callbackQuery.from.id; // ID пользователя 
  
  console.log("Принятие запроса:", {
    telegramId,
    friendTelegramId,
  });

  try {
    // Получение ID пользователя
    const userResponse = await axios.get(
      `http://localhost:3000/api/users/${telegramId}`
    );
    // const friendResponse = await axios.get(
    //   `http://localhost:3000/api/users/${friendTelegramId}`
    // );

    const userId = userResponse.data.id;
    // const friendId = friendResponse.data.id;
    const friendId = friendTelegramId;

    console.log("IDs для обновления:", { userId, friendId });

    // Отправка запроса на обновление
    await axios.post("http://localhost:3000/api/friends/update", {
      userId,
      friendId,
      status: "accepted",
    });

    // Уведомление об успешном добавлении
    await bot.telegram.sendMessage(
      telegramId,
      "Ваш запрос на добавление в друзья был принят!"
    );
    ctx.reply("Запрос принят.");
  } catch (error) {
    console.error("Ошибка при принятии запроса:", error);
    ctx.reply("Ошибка при принятии запроса.");
  }
});

bot.action(/reject_friend_(.+)/, async (ctx) => {
  const friendTelegramId = Number(ctx.match[1]); // ID друга
  const telegramId = ctx.callbackQuery.from.id; // ID пользователя

  try {
    // Удаляем запись о запросе дружбы
    await axios.delete("http://localhost:3000/api/friends", {
      data: {
        userId: telegramId,
        friendTelegramId,
      },
    });

    ctx.reply("Запрос отклонён.");
  } catch (error) {
    console.error("Ошибка при отклонении запроса:", error);
    ctx.reply("Ошибка при отклонении запроса.");
  }
});


// ================== Главный обработчик любых сообщений (bot.on("text")) ==================
bot.on("text", async (ctx) => {
  const userId = ctx.message.from.id;
  const userText = ctx.message.text;

  // 1. Проверяем, в состоянии ли пользователь "удаление из вишлиста"
  if (state[userId]?.deletingFromWishlist) {
    const items = state[userId].items;

    const index = parseInt(userText, 10) - 1;
    if (index >= 0 && index < items.length) {
      const itemId = items[index].id;

      try {
        await axios.delete(`http://localhost:3000/api/wishlist/${itemId}`);
        ctx.reply("Элемент успешно удален из вашего вишлиста.");
      } catch (error) {
        console.error(error);
        ctx.reply("Ошибка при удалении элемента из вишлиста.");
      } finally {
        // Сбрасываем состояние
        delete state[userId];
      }
    } else {
      ctx.reply("Неверный номер элемента. Попробуйте снова.");
    }
    return; // Выходим, чтобы не проверять другие состояния
  }

  // 2. Проверяем, в состоянии ли пользователь "добавление в вишлист"
  if (state[userId]?.addingToWishlist) {
    try {
      const response = await axios.post("http://localhost:3000/api/wishlist", {
        userId,
        text: userText,
      });

      if (response.data.item) {
        ctx.reply("Элемент успешно добавлен в ваш вишлист.");
      } else {
        ctx.reply("Ошибка: элемент не был добавлен.");
      }
    } catch (error) {
      console.error(error);
      ctx.reply("Ошибка при добавлении в вишлист.");
    } finally {
      delete state[userId];
    }
    return;
  }

  // 3. Проверяем, в состоянии ли пользователь "добавление друга"
  if (state[userId]?.addingFriend) {
    const friendUsername = userText;

    if (!friendUsername) {
      ctx.reply("Укажите имя пользователя друга.");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3000/api/friends/request",
        {
          telegramId: userId,
          friendUsername,
        }
      );

      if (response.data.request) {
        const friendId = response.data.request.friendId;

        bot.telegram.sendMessage(
          friendId,
          "Вас хотят добавить в друзья! Подтвердите запрос.",
          Markup.inlineKeyboard([
            Markup.button.callback("Да", `accept_friend_${userId}`),
            Markup.button.callback("Нет", `reject_friend_${userId}`),
          ])
        );

        ctx.reply("Запрос на добавление друга отправлен.");
      } else {
        ctx.reply("Ошибка при добавлении друга. Попробуйте позже.");
      }
    } catch (error) {
      console.error(error);
      ctx.reply(
        "Ошибка при добавлении друга. Проверьте логин или повторите позже."
      );
    } finally {
      delete state[userId];
    }
    return;
  }

  // 4. Проверяем, в состоянии ли пользователь "просмотр вишлиста друга"
  if (state[userId]?.viewingFriendWishlist) {
    const friendIndex = parseInt(userText, 10) - 1;
  
    if (isNaN(friendIndex) || friendIndex < 0 || friendIndex >= state[userId].friends.length) {
      ctx.reply("Введите корректный номер друга.");
      return;
    }
  
    // Извлекаем друга из состояния
    const friend = state[userId].friends[friendIndex];
  
    // Определяем `telegramId` друга
    const friendTelegramId =
      friend.Requester.telegramId === String(userId)
        ? friend.Receiver.telegramId
        : friend.Requester.telegramId;
  
    console.log("Определён telegramId друга:", friendTelegramId); // Лог для проверки
  
    try {
      const wishlistResponse = await axios.get(
        `http://localhost:3000/api/wishlist/${friendTelegramId}`
      );
      const items = wishlistResponse.data;
  
      if (items.length === 0) {
        ctx.reply("Вишлист этого друга пуст.");
      } else {
        const wishlist = items
          .map((item, i) => `${i + 1}. ${item.text}`)
          .join("\n");
        ctx.reply(`Вишлист друга:\n${wishlist}`);
      }
    } catch (error) {
      console.error("Ошибка загрузки вишлиста друга:", error);
      ctx.reply("Ошибка при загрузке вишлиста друга.");
    } finally {
      delete state[userId]; // Сбрасываем состояние
    }
    return;
  }


   // 5. Проверяем, в состоянии ли пользователь "удаление друга"
   if (state[userId]?.deletingFriend) {
    const friends = state[userId].friends;

    // Проверяем, что ввод корректен
    const friendIndex = parseInt(userText, 10) - 1;
    if (isNaN(friendIndex) || friendIndex < 0 || friendIndex >= friends.length) {
      ctx.reply("Введите корректный номер друга из списка.");
      return;
    }

    // Извлекаем друга для удаления
    const friend = friends[friendIndex];
    const friendTelegramId =
      friend.Requester.telegramId === String(userId)
        ? friend.Receiver.telegramId
        : friend.Requester.telegramId;

    try {
      // Отправляем запрос на удаление друга
      await axios.delete(`http://localhost:3000/api/friends`, {
        data: { userId, friendTelegramId },
      });

      ctx.reply("Друг успешно удалён из вашего списка.");
    } catch (error) {
      console.error("Ошибка при удалении друга:", error);
      ctx.reply("Ошибка при удалении друга. Попробуйте позже.");
    } finally {
      // Сбрасываем состояние
      delete state[userId];
    }
    return;
  }
  
  

  // Если ни одно из состояний не подходит, отправляем сообщение об ошибке
  ctx.reply("Неизвестная команда или неверный ввод. Попробуйте снова.");
});

// Запуск бота
bot.launch();

console.log("Бот запущен!");
