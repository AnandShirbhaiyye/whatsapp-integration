const { default: axios } = require('axios');
const express = require('express');
const mongoose = require('mongoose');
require("dotenv").config();

const message = require('./models/message');
//const axios = require('axios');
const PORT = process.env.PORT || 5000;

const app = express();
app.use(express.json());
app.use(express.urlencoded());

//mongodb connection
mongoose.connect(process.env.MONGO_URI, () => {
    console.log('connected to Mongodb...❤️');
})

const TWILIO_SEND = `https://api.twilio.com/2010-04-01/Accounts/${process.env.ACCOUNT_SID}/Messages.json`;

app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to the API'
    });
});


app.post("/send",async (req,res)=>{
    const {to, text} = req.body;

    // Send
    const response = await axios.post(TWILIO_SEND,
        new URLSearchParams({  
            From:"whatsapp:+14155238886",
            To:`whatsapp:${to}`,
            Body:text,
        }),
        {
        auth:{
            username: process.env.ACCOUNT_SID,
            password: process.env.AUTH_TOKEN
        } 
    })

     // store message to db
   const messageObj = new message({
            sid: response.data.sid,
            from: response.data.from,
            to: response.data.to,
            text: response.data.body,
            status: response.data.status,
            direction: "outgoing",
            createdAt: response.data.date_created,
            updatedAt: response.data.date_updated
    });
    const savedMessage = await messageObj.save();

    res.json({
        success: true,
        data: savedMessage 
    });
})

app.post('/status_update',(req, res) => {
     console.log(req.body);
    res.send({
        data:req.body
  });
});

app.post('/receive',async (req, res) => {
    console.log(req.body);
    // store message to db
   const messageObj = new message({
    sid: req.body.SmsSid,
    from: req.body.From,
    to: req.body.To,
    text: req.body.Body,
    status: req.body.Smstatus,
    direction: "incoming",
    createdAt: new Date().now,
    updatedAt: new Date().now
});
 await messageObj.save();
    res.send({
        status:true
        });
});

app.listen(PORT, () => {
  console.log(`Server is running on PORT`,PORT);
})