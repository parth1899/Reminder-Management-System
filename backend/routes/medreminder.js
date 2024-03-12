require("dotenv").config();

const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const router = express.Router();
const fetchuser = require("../middleware/fetchuser");
const Reminder = require("../models/Reminder");
const User = require("../models/User");
var jwt = require("jsonwebtoken");
const JWT_SECRET = "yashparyani";

let loggedUserId = null;

// ROUTE TO GET THE LIST OF ALL REMINDERS
router.get("/fetchallreminder", fetchuser, async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.user.id });
    res.json(reminders);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Some error occured");
  }
});

// Route to add a new reminder

router.post(
  "/addreminder",
  fetchuser,
  [
    body("reminderMsg").notEmpty(),
    body("remindAt").notEmpty(),
    body("reminderType").notEmpty(),
  ],
  async (req, res) => {
    const { reminderMsg, remindAt, reminderType } = req.body;
    //If there is an error return bad request an the error

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const reminder = new Reminder({
        user: req.user.id,
        reminderMsg,
        remindAt,
        reminderType,
        isReminded: false,
      });
      const savedReminder = await reminder.save();

      res.json(savedReminder);
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Some error occured");
    }
  }
);

// Route to update a existing reminder

router.put("/updatereminder/:id", fetchuser, async (req, res) => {
  const { reminderMsg, remindAt, reminderType } = req.body;

  try {
    // create a new reminder

    const newReminder = {};

    if (reminderMsg) {
      newReminder.reminderMsg = reminderMsg;
    }
    if (remindAt) {
      newReminder.remindAt = remindAt;
    }
    if (reminderType) {
      newReminder.reminderType = reminderType;
    }

    //Find the reminder to update it

    let reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).send("Not Found");
    }
    //check wheater the logged in user is updating  on his reminders
    if (reminder.user.toString() != req.user.id) {
      return res.status(401).send("Not Allowed");
    }

    reminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      { $set: newReminder },
      { new: true }
    );
    res.send({ reminder });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Some error occured");
  }
});

// Route to delete a existing reminder

router.delete("/deletereminder/:id", fetchuser, async (req, res) => {
  try {
    //Find the reminder to delete

    let reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).send("Not Found");
    }
    //check wheater the logged in user is deleting  on his reminders
    if (reminder.user.toString() != req.user.id) {
      return res.status(401).send("Not Allowed");
    }

    reminder = await Reminder.findByIdAndDelete(req.params.id);
    res.send({ Success: "Reminder deleted" });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Some error occured");
  }
});

// Whatsapp fuctionality

// if(loggedUserId != null) {
setInterval(() => {
  Reminder.find({ user: loggedUserId }, async (err, reminderList) => {
    const user = await User.find({ _id: loggedUserId });
    user[0]?.phoneNo;

    var no = "whatsapp:+91" + user[0]?.phoneNo;

    if (err) {
      console.log(err);
    }
    if (reminderList) {
      reminderList.forEach((reminder) => {
        if (!reminder.isReminded) {
          const now = new Date();
          if (new Date(reminder.remindAt) - now < 0) {
            Reminder.findByIdAndUpdate(
              reminder._id,
              { isReminded: true },
              (err, remindObj) => {
                if (err) {
                  console.log(err);
                }
                console.log(reminder.reminderMsg);

                const accountSid = process.env.ACCOUNT_SID;
                const authToken = process.env.AUTH_TOKEN;
                const client = require("twilio")(accountSid, authToken);

                // client.messages
                //     .create({
                //         body:  reminder.reminderMsg,
                //         from: 'whatsapp:+14155238886',
                //         to: 'whatsapp:+919423253694'
                //     })
                //     .then(message => console.log(message.sid))
                //     .done();

                client.messages
                  .create({
                    body: reminder.reminderMsg,
                    from: "whatsapp:+14155238886",
                    to: no, // Use the 'no' variable to send the message to the user's phone number
                  })
                  .then((message) => {
                    console.log(message.sid);
                  })
                  .catch((error) => {
                    console.error(error);
                  });
              }
            );
          }
        }
      });
    }
  });
}, 1000);

// Authentication routes
// Authentication to create a new user
router.post(
  "/Createacc",
  [
    body("name").isLength({ min: 2 }),
    body("email").isEmail().notEmpty(),
    body("phoneNo").isLength({ min: 10 }),
    body("password").notEmpty(),
  ],
  async (req, res) => {
    let success = false;
    //If there is an error return bad request an the error
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      success = false;
      return res.status(400).json({ success, errors: errors.array() });
    }

    try {
      //Check wheather user with this email exists or not
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        success = false;
        return res
          .status(400)
          .json({ success, error: "Sorry user already exist" });
      }
      // Hasing the password using bcryprt
      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(req.body.password, salt); // await are used because they both return promise

      // Create a user
      user = await User.create({
        name: req.body.name,
        password: secPass,
        email: req.body.email,
        phoneNo: req.body.phoneNo,
      });

      const data = {
        user: {
          id: user.id,
        },
      };

      const authtoken = jwt.sign(data, JWT_SECRET);
      success = true;

      res.json({ success, authtoken });
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Some error occured");
    }
  }
);

// Authentication to login a existing user
router.post(
  "/Login",
  [body("email").isEmail(), body("password").exists()],
  async (req, res) => {
    let success = false;
    //If there is an error return bad request an the error
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (!user) {
        success = false;
        return res.status(400).json({ success, error: "Invalid Credentials" });
      }

      const passwordCompare = await bcrypt.compare(password, user.password);

      if (!passwordCompare) {
        success = false;
        return res.status(400).json({ success, error: "Invalid Credentials" });
      }
      const data = {
        user: {
          id: user.id,
        },
      };
      loggedUserId = data.user.id;
      // currUser = data.user;
      const authtoken = jwt.sign(data, JWT_SECRET);
      success = true;
      // testFn(data.user.id);
      res.json({ success, authtoken });
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Some error occured");
    }
  }
);

// Get logged in user details : login required

router.post("/getuser", fetchuser, async (req, res) => {
  try {
    userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Some error occured");
  }
});

module.exports = router;
