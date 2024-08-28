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
  username: {
    type: String,
    unique: true
  }
})

const logSchema = mongoose.Schema({
  username: String,
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: String
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
      console.log("post: /api/users");
      res.json(resout)
    } catch (error) {
      console.log("post: err /api/users");
      res.json({ error })
    }
  })
  .get(async (req, res) => {
    try {
      const allUsers = await User.find();
      console.log("get: /api/users");
      res.json(allUsers)
    } catch (error) {
      console.log("get: err /api/users");
      res.json({ error })
    }
  })

app
  .route("/api/users/:_id/exercises")
  .post(async (req, res) => {
    const { description, duration, date = new Date().toDateString() } = req.body;
    const { _id } = req.params;

    console.log(description, duration, date, _id);


    try {
      const user = await User.find({ _id })
      const exercise = await Exercise.create({ username: user[0].username, description, duration, date });
      // console.log("date", date, "username", user[0].username, "exercise", exercise);

      const logs = await Log.find({ username: user[0].username })
      // console.log(logs);

      if (logs.length <= 0) {
        const createLog = await Log.create({ username: user[0].username, count: 1, log: [{ description: exercise.description, duration: exercise.duration, date }] })
        console.log("post: /api/users/:_id/exercises");
        res.json({ exercise });
      }

      if (logs.length >= 1) {
        const updateLog = await Log.findOneAndUpdate({ username: user[0].username },
          {
            $inc: { count: 1 },
            $push: {
              log: {
                description: exercise.description, duration: exercise.duration, date
              }
            }
          }, { new: true }
        )
        console.log("update: exer added to log");
        console.log("post: update log /api/users/:_id/exercises");
        res.json({ user: exercise });
      }


      // let newx = JSON.parse(exercise)
      // let newExercise = { ex: newx, date: new Date(exercise.date).toDateString() };
      // console.log("new date", newExercise);

    } catch (error) {
      console.log("post: err /api/users/:_id/exercises");
      res.json({ error: "data not added" });
    }
  })

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  function formatDate(date = new Date()) {
    const year = date.toLocaleString('default', { year: 'numeric' });
    const month = date.toLocaleString('default', { month: '2-digit' });
    const day = date.toLocaleString('default', { day: '2-digit' });
    return [year, month, day].join('-');
  }

  let { from = "1990-01-01", to=formatDate(new Date()), limit } = req.query;

  console.log(_id);

  try {
    // console.log(news)
    from = new Date(from).toISOString();
    to = new Date(to).toISOString();
    const user = await User.find({ _id })
    // use this for date
    // date: {
    // $gte: ISODate("2023-01-01T00:00:00.000Z"),
    // $lte: ISODate("2023-12-31T23:59:59.999Z")
    // }

    const logs = await Log.find({
      username: user[0].username, date: {
        $gte: ISODate(from),
        $lte: ISODate(to)
      }
    }).limit(limit);
    console.log("get: /api/users/:_id/logs");

    res.json({ count: logs[0].count, log: logs[0].log })
  } catch (error) {
    console.log("get: err /api/users/:_id/logs");
    res.json({ error })
  }
})

app.post("/api/del", async (req, res) => {
  try {
    const delu = await User.deleteMany()
    const delex = await Exercise.deleteMany();
    const dellog = await Log.deleteMany();
    res.json({ delu, delex, dellog })
  } catch (error) {
    res.json({ error })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
