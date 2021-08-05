const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const { response } = require("express");
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "1234"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "456"
  }
};

const generateRandomString = () => {
  let output = "";
  while (output.length < 6) {
    let randCharCode = Math.floor(Math.random() * 122 + 48);
    //number ^^^
    if (randCharCode < 58) {
      output += String.fromCharCode(randCharCode);
    //cap and lower letters ^^^
    } else if ((randCharCode >= 65 && randCharCode <= 90) || (randCharCode >= 97 && randCharCode <= 122)) {
      output += String.fromCharCode(randCharCode);
    }
    //cap and lower letters ^^^
  }
  return output;
};

app.get("/urls", (req, res) => {
  let user_id = req.cookies.user_id;
  const user = users[user_id];
  const templateVars = { urls: urlDatabase, user: user };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  let user_id = req.cookies.user_id;
  const user = users[user_id];
  const templateVars = { urls: urlDatabase, user: user};
  res.render("urls_new", templateVars);
});

app.post("/urls", (req, res) => {
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect("/urls");
});

app.get("/urls/:shortURL", (req, res) => {
  let user_id = req.cookies.user_id;
  const user = users[user_id];
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], user: user};
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let longURL = urlDatabase[shortURL];
  res.redirect(longURL);
});

app.post("/urls/:shortURL", (req,res) => {
  // const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL] };
  urlDatabase[req.params.shortURL] = req.body.updateURL;
  res.redirect("/urls");

});

app.post("/urls/:shortURL/delete", (req,res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls");
});

app.get("/login", (req,res) => {
  let user_id = req.cookies.user_id;
  let user = users[user_id];
  
  let templateVars = {
    user: user
  };
  
  if (user_id) {
    res.redirect("/urls");
  } else {
    res.render("urls_login", templateVars);
  }
});

app.post("/login", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  if (!email || !password) {
    res.status(400);
    res.send("Email or/and Password cannot be blank");
    return;
  }
  
  let foundUser;

  for (let user_id in users) {
    
    let user = users[user_id];
    
    if (email === user.email) {
      foundUser = user;
    }
  }

  if (!foundUser) {
    res.status(403);
    res.send("No User with that email is found");
    return;
  }

  if (!(bcrypt.compareSync(password, foundUser.password))) {
    res.status(403);
    response.send("Incorrect Password");
    return;
  }

  res.cookie("user_id",foundUser.id);
  res.redirect("/urls");
});

app.post("/logout", (req,res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  let user_id = req.cookies["user_id"];
  const user = users[user_id];
  
  let templateVars = {
    user: user,
  };

  if (user_id) {
    res.redirect("/urls");
  } else {
    res.render("urls_register",templateVars);
  }
});

app.post("/register", (req, res) => {
  let randId = generateRandomString();
  let email = req.body.email;
  let password = req.body.password;
  
  if (!email || !password) {
    res.status(400);
    res.send("Email or/and Password cannot be blank");
    return;
  }

  let foundUser;
  for (const user_id in users) {
    const user = users[user_id];
    if (email === user.email) {
      foundUser = user;
    }
  }

  if (foundUser) {
    res.status(400);
    res.send("Email already exists");
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  users[randId] = {
    id: randId,
    email: email,
    password: hashedPassword,
    urls:[]
  };
  
  res.cookie("user_id", randId);
  res.redirect("/urls");
});

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});