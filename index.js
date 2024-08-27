const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const mongoose = require('mongoose')

const mongourl = process.env.MONGO;

const exerciseSchema = mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
})

const userSchema = mongoose.Schema({
  username: String
})

const logSchema = mongoose.Schema({
  username: String,
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: Date
  }]
})

const User = mongoose.model("User", userSchema)
const Exercise = mongoose.model("Exercise", exerciseSchema)
const Log = mongoose.model("Log", logSchema)

async function dbconnect() {
  try {
    await mongoose.connect(mongourl).then(() => console.log("conneted to db"))
  } catch (error) {
    console.error(error);
  }
}
dbconnect();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app
  .route("/api/users")
  .post(async (req, res) => {
    const { username } = req.body;
    try {
      const resout = await User.create({ username })
      res.json(resout)
    } catch (error) {
      res.json({ error })
    }
  })
  .get(async (req, res) => {
    try {
      const allUsers = await User.find();
      res.json(allUsers)
    } catch (error) {
      res.json({ error })
    }
  })

app
  .route("/api/users/:_id/exercises")
  .post(async (req, res) => {
    const { description, duration, date = new Date().toUTCString() } = req.body;
    const { _id } = req.params;

    try {
      const user = await User.find({ _id })
      const exercise = await Exercise.create({ username: user.username, description, duration, date });
      const logs = await Log.findById(user._id, (err, data) => {
        if (data.length <= 0) {
          Log.create({ username: user.username, count: 1, log: [{ description: exercise.description, duration: exercise.duration }] })
        } else {
          Log.findByIdAndUpdate(_id, { $in: { count: count + 1 }, log: Array.push({ description: exercise.description, duration: exercise.duration }) })
        }
      })
      res.json({user: exercise});
    } catch (error) {
      res.json({ error });
    }
  })

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  try {
    const logs = await Log.find({ _id });
    res.json(logs)
  } catch (error) {
    res.json({ error })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
