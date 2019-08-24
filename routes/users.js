const express = require("express");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const USER = require("../models/user");
const config = require("../config/config");

const router = express.Router();

const {
  ensureAuthenticated
} = require("../config/auth");

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASSWORD,
  },
});

async function main(emailParams) {
  const info = await transporter.sendMail({
    from: emailParams.from, // Sender address
    to: emailParams.to, // List of receivers
    subject: emailParams.subject, // Subject line
    text: emailParams.plainBody, // Plain text body
    html: emailParams.HTMLBody, // HTML body
  });

  console.log("Message sent: %s", info.messageId);
}

function makeid(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

let notification;

// Register
router.post("/register", (req, res, next) => {

  const {
    email,
    password,
    password2
  } = req.body;

  if (!email || !password || !password2) {
    res.redirect("/?message=emptyField");
  } else {
    if (password !== password2) {
      res.redirect("/?message=passwordsDoNotMatch");
    } else {
      if (password.length < 6) {
        res.redirect("/?message=passwordLength");
      } else {
        if (password.replace(/[^A-Z]/g, "").length < 1) {
          res.redirect("/?message=capitalLetter");
        } else {
          USER.findOne({
            email: email
          }).then(user => {
            if (user) {
              res.redirect("/?message=alreadyInSystem");
            } else {
              const newUser = new USER({
                email,
                password
              });

              bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                  if (err) throw err;
                  newUser.password = hash;
                  newUser
                    .save()
                    .then(user => {
                      req.login(user, function (err) {
                        if (err) {
                          return next(err);
                        }
                        return res.redirect("/dashboard");
                      });
                    })
                    .catch(err => console.log(err));
                });
              });
            }
          });
        }
      }
    }
  }
});

// Login
router.post("/login", (req, res, next) => {
  const {
    email,
    password
  } = req.body;

  USER.findOne({
    email: email
  }).then(user => {
    if (
      user &&
      password.length >= 6 &&
      password.replace(/[^A-Z]/g, "").length >= 1 &&
      user.flag === "active"
    ) {
      passport.authenticate("local", {
        successRedirect: "/dashboard",
        failureRedirect: "/?message=incorrectCred",
      })(req, res, next);
    } else if (!email || !password) {
      res.redirect("/?message=emptyField");
    } else {
      res.redirect("/?message=incorrectCred");
    }
  });
});

// Logout
router.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

// Invite User
router.post("/invite", ensureAuthenticated, (req, res) => {
  const {
    email
  } = req.body;

  const sendInvite = new USER({
    email: email,
    password: "password",
  });

  if (email) {
    USER.findOne({
      email: email
    }).then(user => {
      if (user && user.flag === "pending") {
        res.redirect("/manage?message=invitePending");
      } else if (user && user.flag === "deleted") {
        res.redirect("/manage?message=inviteDeleted");
      } else if (user && user.flag === "active") {
        res.redirect("/manage?message=inviteActive");
      } else if (!user) {
        sendInvite.save().then(() => {
          const token = jwt.sign({
              data: makeid(8),
            },
            "Secret", {
              expiresIn: "1h"
            }
          );

          USER.findOneAndUpdate({
            email: email
          }, {
            token: token
          }, {}, err => {
            if (err) {
              res.redirect("/?message=accessDenied");
            } else {
              const emailData = {
                from: "'User' <mail@address.com>",
                to: email,
                subject: "Invitation",
                plainBody: email,
                HTMLBody: `${"<b>Follow the link below to join the application</b><br>" +
                  "<br><b>If you can not click the link copy and paste it into your web browser </b><br>" +
                  "<a href='"}${
                  config.DOMAIN
                }/users/changePasswordForm?email=${email}&token=${token}'>${
                  config.DOMAIN
                }/users/changePasswordForm?email=${email}&token=${token}</a>`,
              };

              main(emailData)
                .then(res.redirect("/manage?message=inviteSent"))
                .catch(console.error);
            }
          });
        });
      } else {
        res.redirect("/?message=accessDenied");
      }
    });
  } else {
    res.redirect("/manage?message=emptyField");
  }
});

// Send Password Reset Email
router.post("/reset", (req, res) => {
  const {
    email,
    notLogged
  } = req.body;

  USER.findOne({
    email: email
  }).then(user => {
    if (user) {
      const token = jwt.sign({
          data: makeid(8),
        },
        "Secret", {
          expiresIn: "1h"
        }
      );

      USER.findOneAndUpdate({
        email: email
      }, {
        token: token
      }, {}, err => {
        if (err) {
          res.redirect("/");
        } else {
          const emailData = {
            from: "'User' <mail@address.com>",
            to: email,
            subject: "Reset Your Password",
            plainBody: email,
            HTMLBody: `${"<b>Follow the link below to reset your password</b><br>" +
              "<br><b>If you can not click the link copy and paste it into your web browser </b><br>" +
              "<a href='"}${
              config.DOMAIN
            }/users/changePasswordForm?email=${email}&token=${token}'>${
              config.DOMAIN
            }/users/changePasswordForm?email=${email}&token=${token}</a>`,
          };

          main(emailData).catch(console.error);

          if (notLogged) {
            res.redirect("/?message=reset");
          } else {
            res.redirect("/manage?message=reset");
          }
        }
      });
    } else {
      res.redirect("/forgotPassword?message=accessDenied");
    }
  });
});

// Reset Password Form
router.get("/changePasswordForm", (req, res) => {
  const {
    message,
    token,
    email
  } = req.query;

  USER.findOne({
    email: email
  }, "token", (err, userToken) => {
    if (err) {
      res.redirect("/");
    } else if (token && token === userToken.token) {
      jwt.verify(token, "Secret", err2 => {
        if (err2) {
          res.redirect("/settings?message=accessDenied");
        } else {
          if (message === "emptyField") {
            notification = "emptyField";
          } else if (message === "passwordsDoNotMatch") {
            notification = "passwordsDoNotMatch";
          } else if (message === "passwordLength") {
            notification = "passwordLength";
          } else if (message === "capitalLetter") {
            notification = "capitalLetter";
          } else {
            notification = "";
          }

          res.render("resetPasswordForm", {
            user: email,
            notification: notification,
          });
        }
      });
    } else {
      res.redirect("/");
    }
  });
});

// Reset Password Process Form
router.post("/changePassword", (req, res) => {
  const {
    email,
    newpassword,
    newpassword2,
    token
  } = req.body;

  USER.findOne({
    email: email
  }, "token", (err, userToken) => {
    if (token && token === userToken.token) {
      if (!newpassword || !newpassword2) {
        res.redirect(
          `/users/changePasswordForm?message=emptyField&email=${email}&token=${token}`
        );
      } else if (newpassword !== newpassword2) {
        res.redirect(
          `/users/changePasswordForm?message=passwordsDoNotMatch&email=${email}&token=${token}`
        );
      } else if (newpassword.length < 6) {
        res.redirect(
          `/users/changePasswordForm?message=passwordLength&email=${email}&token=${token}`
        );
      } else if (newpassword.replace(/[^A-Z]/g, "").length < 1) {
        res.redirect(
          `/users/changePasswordForm?message=capitalLetter&email=${email}&token=${token}`
        );
      } else {
        bcrypt.genSalt(10, (err2, salt) => {
          bcrypt.hash(newpassword, salt, (err3, hash) => {
            if (err3) throw err3;
            // newpassword = hash;

            USER.findOneAndUpdate({
                email: email
              }, {
                password: hash,
                flag: "active"
              }, {},
              err4 => {
                if (err4) res.redirect("/");

                if (req.isAuthenticated()) {
                  res.redirect("/manage?message=passwordChanged");
                } else {
                  res.redirect("/?message=passwordChanged");
                }
              }
            );
          });
        });
      }
    } else {
      res.redirect("/");
    }
  });
});

// Login
router.post("/info", ensureAuthenticated, (req, res) => {
  const {
    email,
    firstName,
    lastName
  } = req.body;

  USER.findOne({
    email: email
  }).then(user => {
    if (user && user.flag === "active") {
      USER.findOneAndUpdate({
          email: email
        }, {
          firstName: firstName,
          lastName: lastName
        },
        err => {
          if (err) res.redirect("/");

          res.redirect("/settings?message=infoUpdated");
        }
      );
    } else {
      res.redirect("/");
    }
  });
});

module.exports = router;