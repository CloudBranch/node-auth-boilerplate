const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
// const helmet = require("helmet");
const MongoStore = require("connect-mongo")(session);

const app = express();

// app.use(helmet());

mongoose.set("useFindAndModify", false);

// Passport Config
require("./config/passport")(passport);

// Config
const config = require("./config/config");

mongoose
    .connect(config.DATABASE, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// EJS
app.use(expressLayouts);
app.set("view engine", "ejs");

// Express body parser
app.use(express.urlencoded({
    extended: true
}));

app.set("trust proxy", 1);

// var expiryDate = new Date(Date.now() + 60 * 60 * 1000);

// Express session
app.use(
    session({
        secret: "secret",
        store: new MongoStore({
            url: config.DATABASE
        }),
        resave: false,
        saveUninitialized: true,
        // maxAge: 3600000,
        //httpOnly: true,
        //secure: true,
        cookie: {
            //secure: true,
            //httpOnly: true,
            //sameSite: true,
            //domain: "localhost.com",
            path: "/"
            // expires: expiryDate
        }
    })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

const options = {
    dotfiles: "ignore",
    etag: false,
    extensions: ["htm", "html", "css"],
    index: false,
    maxAge: "1d",
    redirect: false,
    setHeaders: res => {
        res.set("x-timestamp", Date.now());
    }
};

app.use("/static", express.static(`${__dirname}/static`, options));

app.use("/", require("./routes/index.js"));
app.use("/", require("./routes/pages.js"));
app.use("/users", require("./routes/users.js"));
app.use("/util", require("./routes/utilities.js"));

app.get("*", (req, res) => {
    res.status(404).json({
        message: "This page does not exist - 404"
    });
});

const server = app.listen(config.PORT, config.HOSTNAME, () => {
    console.log(`App running at http://${config.HOSTNAME}:${config.PORT}/`);
});