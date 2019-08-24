const express = require("express");

const router = express.Router();

const {
  ensureAuthenticated,
  forwardAuthenticated
} = require("../config/auth");

// Home Page
router.get("/", forwardAuthenticated, (req, res) => {
  res.render("index", {
    layout: "index"
  });
});

// Dashboard
router.get("/dashboard", ensureAuthenticated, (req, res) => {
  res.render("dashboard", {
    user: req.user,
    isActive: "dashboard"
  });
});

// Manage
router.get("/manage", ensureAuthenticated, (req, res) => {
  res.render("manage", {
    user: req.user,
    isActive: "settings"
  });
});

// Forgot Password Page
router.get("/forgotPassword", forwardAuthenticated, (req, res) => {
  res.render("forgotPasswordForm", {
    layout: "forgotPasswordForm",
    errors: errors2
  });
});

module.exports = router;