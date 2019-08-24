const express = require("express");

const router = express.Router();

const {
  ensureAuthenticated
} = require("../config/auth");

const USER = require("../models/user");

// Set Role
router.post("/setRole", ensureAuthenticated, (req, res) => {

});

// Delete/Archive
router.post("/setFlag", ensureAuthenticated, (req, res) => {
  const {
    flagID,
    flagSource,
    flagDestination
  } = req.body;

  if (flagID) {
    if (flagSource === "manage") {
      USER.findByIdAndUpdate(flagID, {
        flag: "deleted"
      }, err => {
        if (err) res.send(err);
        res.redirect(`/${flagDestination}`);
      });
    } else {
      console.log("No Flag Set");
      res.redirect("/");
    }
  } else {
    res.redirect("/");
  }
});


// Download
router.get("/download", (req, res) => {
  const {
    FileName
  } = req.query;
  const file = `${__dirname}/../files/${FileName}.pdf`;
  res.download(file);
});

module.exports = router;