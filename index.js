const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const port = process.env.PORT || 9000
const app = express()
const corsOptions = {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      
    ],
    credentials: true,
    optionSuccessStatus: 200,
  }
  app.use(cors(corsOptions))
  app.use(express.json())
  app.use(cookieParser())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zumttn0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const homeService = client.db('HomeServiceDB').collection('service')
     // jwt generate
     app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

     // Save a services data in db
     app.post('/services', async (req, res) => {
      const jobData = req.body
      const result = await homeService.insertOne(jobData)
      res.send(result)
      console.log(result)
    })
    // clere cookis
    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
  })


  app.get('/popular-services', async (req, res)=>{
    const result = await homeService.find().limit(6).toArray()
   
    res.send(result)

  })
  app.get('/all-services', async (req, res) =>{
    const search = req.query.search;
    let query = {
      serviceName: { $regex: search, $options: 'i' },
    };
    const result = await homeService.find(query).toArray()
     console.log(result)
     res.send(result)
  })
  app.get('/view-detail/:id', async(req, res)=>{
    // console.log(req.params.id)
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await homeService.findOne(query)
    // console.log(result);
    res.send(result)

  })
  app.put('/booking/:id', async(req, res)=>{
    const id = req.params.id
      const status = req.body
      const query = { _id: new ObjectId(id)}
      const updateDoc = {
        $set: status,
        
      }
      const options = {upsert:true};
      const result = await homeService.updateOne(query, updateDoc, options)
      res.send(result)
      console.log(result)
  } )

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    
  }
}
run().catch(console.dir);




  app.get('/', (req, res) => {
    res.send('Hello astro dwelling server....')
  })
  
  app.listen(port, () => console.log(`Server running on port ${port}`))