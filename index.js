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

    console.log('desc', description, 'dur', duration, date, _id);


    try {
      const user = await User.find({ _id })
      const exercise = await Exercise.create({ username: user[0].username, description, duration, date });
      // console.log("date", date, "username", user[0].username, "exercise", exercise);

      const logs = await Log.find({ username: user[0].username })
      // console.log(logs);

      if (logs.length <= 0) {
        const createLog = await Log.create({ username: user[0].username, count: 1, log: [{ description: exercise.description, duration: exercise.duration, date }] })
        console.log("post: /api/users/:_id/exercises");
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
        console.log("update: exer added to log");
        console.log("post: update log /api/users/:_id/exercises");
        res.json({ _id: user[0]._id, username: exercise.username, description: exercise.description, duration: exercise.duration, date: exercise.date.toDateString() });
      }


      // let newx = JSON.parse(exercise)
      // let newExercise = { ex: newx, date: new Date(exercise.date).toDateString() };
      // console.log("new date", newExercise);

    } catch (error) {
      console.log("post: err /api/users/:_id/exercises");
      res.json({ error: "data not added" });
    }
  })

// formate date in yyyy-mm-dd
// Format date in yyyy-mm-dd
function formatDate(date = new Date()) {
  const year = date.toLocaleString('default', { year: 'numeric' });
  const month = date.toLocaleString('default', { month: '2-digit' });
  const day = date.toLocaleString('default', { day: '2-digit' });
  return [year, month, day].join('-');
}

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  let { from = "1990-01-01", to = formatDate(new Date()), limit = 10 } = req.query;

  try {
    // from = new Date(from);
    // to = new Date(to);

    const user = await User.findById(_id);

    if (!user) {
      return res.json({ msg: "No user found" });
    }

    console.log("user: ", user);
    console.log("dates: ", from, to, limit);


    // const logs = await Log.find({
    //   username: user.username,
    //   log: {
    //     $elemMatch: {
    //       date: {
    //         $gte: new Date(from), // Greater than or equal to start date
    //         $lte: new Date(to),   // Less than or equal to end date
    //       }
    //     }
    //   }
    // })

    const logs = await Log.find({
      username: user.username,
      'log.duration': { $gte: 41 }
    })
    // .then(posts => {
    //   console.log('Posts between the specified dates:', posts);
    // })
    // .catch(err => {
    //   console.error('Error fetching posts:', err);
    // });

    console.log('logs are: ', logs);
    console.log('iso date', new Date(from), new Date(to))


    if (logs.length > 0) {
      let filteredLogs = logs[0].log
        .filter(item => item.date >= new Date(from) && item.date <= new Date(to))
        .map(item => ({
          description: item.description,
          duration: item.duration,
          _id: item._id,
          date: item.date.toDateString()
        }))
        .slice(0, limit)
      res.json({ _id: user._id, username: user.username, count: logs[0].count, log: filteredLogs });
    } else {
      res.json({ msg: "Logs are empty" });
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
