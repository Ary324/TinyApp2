const express = require("express");
const app = express();
const bodyParser = require("body-parser");
// Original: const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: "session",
  resave: true,
  keys: ["supersecret"]
}));

const getUserByEmail = function(email, userFound, data) {
  
  for (const user_id in data) {
    const user = data[user_id];
    if (email === user.email) {
      userFound = user;
    }
  }
  
  return userFound;
};

const userURLFilter = id => {
  let userURLs = [];
  for (const url in urlDatabase) {
    if (urlDatabase[url].user_id === id) {
      userURLs.push(urlDatabase[url]);
    }
  }
  return userURLs;
};

const urlDatabase = {
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
  if (!req.session.user_id) { //error when not logged in
    res.status(403);
    res.redirect("/login");
  }
  
  let user_id = req.session.user_id;
  let userURLList = userURLFilter(user_id);
  const user = users[user_id];
  
  if (!user) { //error when user is undefined after restarting server
    req.session.user_id = null;
    res.status(403);
    res.redirect("/login");
  }
  const templateVars = {urls: userURLList, user: user};
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  let user_id = req.session.user_id;
  const user = users[user_id];
  const templateVars = {user: user};
  if (!user_id) {
    res.status(403).redirect("/login");
  }
  res.render("urls_new", templateVars);
});

app.post("/urls", (req, res) => {
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = { longURL: req.body.longURL, shortURL, user_id: req.session.user_id };
  res.redirect("/urls");
});

app.get("/urls/:shortURL", (req, res) => {
  if (!req.session.user_id) { //error when not logged in
    res.status(403);
    res.redirect("/login");
  }
  const url = urlDatabase[req.params.shortURL];

  if (!url) { //error when short url doesnt exist
    res.status(403);
    res.send("Short URL doesnt exist");
  }

  if (url.user_id !== req.session.user_id) { // error when logged in user doesnt own url
    res.status(403);
    res.send("This account does not own this url");
  }
  let user_id = req.session.user_id;
  const user = users[user_id];
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], user: user};
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});

app.post("/urls/:shortURL", (req,res) => {
  if (!req.session.user_id) { //error when not logged in
    res.status(403);
    res.redirect("/login");
  }
  urlDatabase[req.params.shortURL].longURL = req.body.updateURL;
  res.redirect("/urls");
});

app.post("/urls/:shortURL/delete", (req,res) => {
  if (!req.session.user_id) { //error when not logged in
    res.status(403);
    res.redirect("/login");
  }
  const url = urlDatabase[req.params.shortURL];

  if (!url) { //error if short url doesnt exist
    res.status(403);
    res.send("Short URL doesnt exist");
  }

  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls");
});

app.get("/login", (req,res) => {
  let user_id = req.session.user_id;
  let user = users[user_id];
  
  let templateVars = {
    user: user
  };
  
  if (user_id) {  //logged in condition
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
  
  //Looping through user database
  let foundUser;
  foundUser = getUserByEmail(email, foundUser, users);

  //User Conditionss
  if (!foundUser) {
    res.status(403);
    res.send("No User with that email is found");
    return;
  }

  if (!(bcrypt.compareSync(password, foundUser.password))) {
    res.status(403);
    res.send("Incorrect Password");
    return;
  }

  req.session.user_id = foundUser.id;
  res.redirect("/urls");
});

app.post("/logout", (req,res) => {
  req.session = null;
  res.redirect("/login");
});

app.get("/register", (req, res) => {
  let user_id = req.session.user_id;
  const user = users[user_id];
  
  let templateVars = {
    user: user,
  };

  if (user_id) { //logged in condition
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

  let foundUser; //setting found user to undefined as default
  foundUser = getUserByEmail(email, foundUser, users);

  if (foundUser) {   //account existing condition
    res.status(400);
    res.send("Email already exists");
  }

  // New User Creation
  const hashedPassword = bcrypt.hashSync(password, 10);

  users[randId] = {
    id: randId,
    email: email,
    password: hashedPassword,
    urls:[]
  };
  
  req.session.user_id = randId;
  res.redirect("/urls");
});

app.get("/", (req, res) => {
  let user_id = req.session.user_id;
  if (user_id) { //logged in condition
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
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