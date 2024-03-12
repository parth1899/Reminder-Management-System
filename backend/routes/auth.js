const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const fetchuser = require('../middleware/fetchuser')
const User = require("../models/User");
const router = express.Router();
const JWT_SECRET = "yashparyani";


const currUser = "yash";
// Authentication to create a new user
router.post(
  "/Createacc",
  [
    body("name").isLength({ min: 2 }),
    body("email").isEmail().notEmpty(),
    body("phoneNo").isLength({ min: 10 }),
    body("password").notEmpty()
  ],
  async (req, res) => {
    let success = false
    //If there is an error return bad request an the error
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      success = false
      return res.status(400).json({ success,errors: errors.array() });
    }

    try {
      //Check wheather user with this email exists or not
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        success = false
        return res.status(400).json({ success,error: "Sorry user already exist" });
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
      success = true

      res.json({ success,authtoken });
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
    let success = false
    //If there is an error return bad request an the error
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (!user) {
        success = false
        return res.status(400).json({ success,error: "Invalid Credentials" });
      }

      const passwordCompare = await bcrypt.compare(password, user.password);

      if (!passwordCompare) {
        success = false 
        return res.status(400).json({ success,error: "Invalid Credentials" });
      }
      const data = {
        user: {
          id: user.id,
        },
      };
      // currUser = data.user;
      const authtoken = jwt.sign(data, JWT_SECRET);
      success = true;
      // testFn(data.user.id);
      res.json({success ,authtoken });
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Some error occured");
    }
  }
);

// Get logged in user details : login required

router.post("/getuser",fetchuser ,async (req, res) => {
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
