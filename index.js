const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const bcrypt = require("bcrypt");
const path = require("path");
const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

mongoose
  .connect(
    "mongodb+srv://shyam:shyamkaviya@cluster0.u5jk0.mongodb.net/codeStorage?retryWrites=true&w=majority"
  )
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB Atlas connection error:", err));

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  })
);

const snippetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
    enum: [
      "text",
      "python",
      "javascript",
      "java",
      "c",
      "cpp",
      "sql",
      "html",
      "css",
    ],
  },
  email: {
    type: String,
    required: true,
  },
  image: {
    data: Buffer,
    contentType: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Snippet = mongoose.model("Snippet", snippetSchema);

app.get("/", (req, res) => {
  res.render("login");
});

app.post("/", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send("User not found");
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).send("Incorrect password");
  }
  res.redirect("/dashboard?email=" + email);
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    email,
    password: hashedPassword,
  });

  await newUser.save();
  res.redirect("/");
});

// Route: GET /dashboard
app.get("/dashboard", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    console.warn("Email is missing in dashboard request");
    return res.redirect("/");
  }

  try {
    const snippets = await Snippet.find({ email: email });
    res.render("dashboard", { snippets, email });
  } catch (err) {
    console.error("Error fetching snippets for email:", email, "Error:", err);
    res.status(500).send("Error fetching snippets");
  }
});

app.post("/addCode", upload.single("image"), async (req, res) => {
  try {
    const { title, language, code, email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!title || !language || !code) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const newSnippet = new Snippet({
      title,
      language,
      code,
      email,
      image: req.file
        ? { data: req.file.buffer, contentType: req.file.mimetype }
        : undefined,
    });
    await newSnippet.save();
    res.redirect(`/dashboard?email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error("Error saving snippet:", err);
    res.status(500).json({ error: "Error saving snippet" });
  }
});

app.get("/addCode", (req, res) => {
  const email = req.query.email;
  if (!email) {
    console.warn("Email is missing in addCode request");
    return res.redirect("/");
  }
  res.render("addCode", { email: email || "" });
});


app.get("/showCodes", async (req, res) => {
  const email = req.query.email; // Get the email from the query string
  if (!email) {
    return res.redirect("/"); // Redirect to login if email is not present
  }

  try {
    const snippets = await Snippet.find({ email }); // Fetch snippets for the given email
    res.render("dashboard", { snippets, email }); // Pass both snippets and email to the view
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving snippets");
  }
});

// Show Code Details Route
app.get("/snippet/:id", async (req, res) => {
    const snippet = await Snippet.findById(req.params.id);
    if (!snippet) {
        return res.status(404).send("Code not found");
    }
    
    // Convert the image data to base64 format
    let imageBase64 = null;
    if (snippet.image && snippet.image.data) {
        imageBase64 = snippet.image.data.toString('base64');
    }
    
    res.render("snippetDetail", { snippet, imageBase64 });
});


app.listen(3000, () => console.log("Server started on http://localhost:3000"));
