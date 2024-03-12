const connectToMongo = require("./db");
const express = require("express");
var cors = require("cors");
// var {currUser} = require("./routes/auth");

connectToMongo();

const app = express();

app.use(express.json());
app.use(cors());


//Available routes
// app.use("/auth", require("./routes/auth") );
// console.log("CurrUser : ", currUser);
app.use("/Medred", require("./routes/medreminder"));


app.listen(9002, () => {
  console.log("Example app listening at port 9002");
});
