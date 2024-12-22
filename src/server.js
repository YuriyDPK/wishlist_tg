require("dotenv").config();
const express = require("express");
const sequelize = require("./database");
const usersRoutes = require("./routes/users");
const friendsRoutes = require("./routes/friends");
const wishlistRoutes = require("./routes/wishlist");

const app = express();
app.use(express.json());

app.use("/api/users", usersRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/wishlist", wishlistRoutes);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_HOST:", process.env.DB_HOST);
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log("Database connected!");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Error:", error);
  }
})();
