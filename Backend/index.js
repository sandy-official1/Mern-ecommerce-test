const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./db/user");
const Product = require("./db/product");
require("./db/config");

const jwt = require("jsonwebtoken");
const jwtKey = "ecommerce";
const app = express();
app.use(express.json());
app.use(cors());

// Register and generate authentication token
app.post("/register", async (req, res) => {
  try {
    const user = new User(req.body);
    const result = await user.save();
    const token = jwt.sign({ userId: result._id }, jwtKey, { expiresIn: "2h" });
    res.send({ result, auth: token });
  } catch (error) {
    console.error("Failed to register user:", error);
    res.status(500).send({ result: "Failed to register user" });
  }
});

// Login and generate authentication token
app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne(req.body).select("-password");
    if (user) {
      const token = jwt.sign({ userId: user._id }, jwtKey, { expiresIn: "2h" });
      res.send({ user, auth: token });
    } else {
      res.send({ result: "No User found" });
    }
  } catch (error) {
    console.error("Failed to login:", error);
    res.status(500).send({ result: "Failed to login" });
  }
});

// Add product API
app.post("/add-product", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const product = new Product({ ...req.body, userId });
    const result = await product.save();
    res.send(result);
  } catch (error) {
    console.error("Failed to add product:", error);
    res.status(500).send({ result: "Failed to add product" });
  }
});

// Get list of products for a user
app.get("/products", verifyToken, async (req, resp) => {
  const userId = req.user.userId;
  const products = await Product.find({ userId });
  if (products.length > 0) {
    resp.send(products);
  } else {
    resp.send({ result: "No Product found" });
  }
});

// Delete product API
app.delete("/product/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = req.params.id;

    const product = await Product.findOneAndDelete({ _id: productId, userId });

    if (product) {
      res.send({ result: "Product deleted successfully" });
    } else {
      res.send({ result: "Product not found or unauthorized" });
    }
  } catch (error) {
    console.error("Failed to delete product:", error);
    res.status(500).send({ result: "Failed to delete product" });
  }
});

// Get product details API
app.get("/product/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = req.params.id;

    const product = await Product.findOne({ _id: productId, userId });

    if (product) {
      res.send(product);
    } else {
      res.send({ result: "Product not found or unauthorized" });
    }
  } catch (error) {
    console.error("Failed to fetch product details:", error);
    res.status(500).send({ result: "Failed to fetch product details" });
  }
});

// Update product API
app.put("/product/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = req.params.id;
    const { name, price, category, company } = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: productId, userId },
      { name, price, category, company },
      { new: true }
    );

    if (product) {
      res.send(product);
    } else {
      res.send({ result: "Product not found or unauthorized" });
    }
  } catch (error) {
    console.error("Failed to update product:", error);
    res.status(500).send({ result: "Failed to update product" });
  }
});
// Search products API
app.get("/search/:key", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const key = req.params.key;

    const products = await Product.find({
      userId,
      $or: [
        { name: { $regex: key, $options: "i" } },
        { category: { $regex: key, $options: "i" } },
        { company: { $regex: key, $options: "i" } },
      ],
    });

    if (products.length > 0) {
      res.send(products);
    } else {
      res.send({ result: "No products found" });
    }
  } catch (error) {
    console.error("Failed to search products:", error);
    res.status(500).send({ result: "Failed to search products" });
  }
});

// Middleware for verifying token
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (token) {
    const tokenValue = token.split(" ")[1];
    jwt.verify(tokenValue, jwtKey, (err, decoded) => {
      if (err) {
        res.status(401).send({ result: "Please provide a valid token" });
      } else {
        req.user = decoded;
        next();
      }
    });
  } else {
    res.status(401).send({ result: "Please add a token in the header" });
  }
}

// Connect to MongoDB and start the server
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/ecommerce", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
    app.listen(8080, () => {
      console.log("Server started on port 8080");
    });
  } catch (error) {
    console.error("Failed to connect to the database:", error);
  }
};

connectDB();
