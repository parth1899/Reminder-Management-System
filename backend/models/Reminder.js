const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({

  user:{
   type : mongoose.Schema.Types.ObjectId,
   ref : 'user'
  },
  reminderMsg: {
    type: String,
    required: true,
  },
  remindAt: {
    type: String,
    required: true,
  },
  reminderType:{
   
    type : String,
  },
  isReminded: {
    type: Boolean,
  },
});
// const Reminder = new mongoose.model("reminder", reminderSchema);

module.exports=mongoose.model("reminder", reminderSchema);
