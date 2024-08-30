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
  date: {
    type: Date,
    default: Date.now()
  },
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
    date: {
      type: Date,
      default: Date.now()
    }
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
    let { description, duration, date = new Date().toISOString() } = req.body;

    const { _id } = req.params;
    date = new Date(date).toISOString();


    try {
      const user = await User.find({ _id })
      if (duration && description) {
        const exercise = await Exercise.create({ username: user[0].username, description, duration, date });

        const logs = await Log.find({ username: user[0].username })

        if (logs.length <= 0) {
          const createLog = await Log.create({ username: user[0].username, count: 1, log: [{ description: exercise.description, duration: exercise.duration, date }] })
          console.log("post: /api/users/:_id/exercises", _id);
          res.json({ _id: user[0]._id, username: exercise.username, description: exercise.description, duration: exercise.duration, date: exercise.date.toDateString() });
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
          console.log("update: exer added to log", _id);
          console.log("post: update log /api/users/:_id/exercises", _id);
          res.json({ _id: user[0]._id, username: exercise.username, description: exercise.description, duration: exercise.duration, date: exercise.date.toDateString() });
        }
      } else {
        return new Error("Please add description and duration")
      }

    } catch (error) {
      console.log("post: err /api/users/:_id/exercises", _id);
      res.json({ error: "data not added" });
    }
  })


function formatDate(date = new Date()) {
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  let { from = "1990-01-01", to = formatDate(new Date()), limit = 10 } = req.query;

  try {
    const user = await User.findById(_id);
    console.log("this is user: ", user);

    if (!user) {
      return res.json({ msg: "No user found" });
    }

    const logs = await Log.find({
      username: user.username,
    })

    if (logs.length > 0 && logs[0].log.length > 0) {
      let filteredLogs = logs[0].log
        .filter(item => item.date >= new Date(from) && item.date <= new Date(to))
        .map(item => ({
          description: item.description,
          duration: item.duration,
          date: item.date.toDateString(),
        }))
        .slice(0, limit)

      // console.log("from", new Date(from), "to", new Date(to));

      // console.log('is less date', new Date(to).toDateString() < new Date(logs[0].log[0].date).toDateString(), new Date(to), new Date(logs[0].log[0].date));

      // description, duration, and date
      console.log("get /api/users:id/logs if log>0", _id);
      res.json({ _id: user._id, username: user.username, count: logs[0].count, log: filteredLogs });
      // res.json({ isLogs: logs.length > 0 && logs[0].log.length > 0, filteredLogs, evi: logs[0].log[0], from: new Date(from).toLocaleDateString(), to: new Date(to).toDateString(), filteredLogs, withoutDatestr: new Date(to) })
    } else {
      console.log("get /api/users:id/logs if logL<0", _id);

      res.json({ _id: user._id, username: user.username, count: 0, log: [{ description: "not desc", duration: 0, date: new Date().toDateString() }] });
    }
  } catch (error) {
    console.log("get: err /api/users/:_id/logs", error);
    res.json({ error, msg: "get: err /api/users/:_id/logs" });
  }
});


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
