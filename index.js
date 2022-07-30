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

const PRIORITY_MAP = {
    "queued": 0,
    "sent": 1,
    "delivered": 2,
    "read":4,
    "failed": 5, 
    "undelivered": 6
}

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
            to: response.data.to,
            from: response.data.from,
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

app.post('/status_update',async (req, res) => {

    const sid = req.body.MessageSid;
    const newStatus = req.body.MessageStatus;

    const msgFromDB =await message.findOne({
        sid: sid
    });
    if(!msgFromDB)
    {
        res.send({
            status:true
        })
    }
    const currentStatus = msgFromDB.status;

    if(PRIORITY_MAP[newStatus] > PRIORITY_MAP[currentStatus])
    {
        await message.updateOne({sid: sid},{
            $set: {
                status: newStatus,
            }
        })
    }
    res.send({
        status:true
  });
});

app.post('/receive',async (req, res) => {
    console.log(req.body);
    // store message to db
   const messageObj = new message({
    sid: req.body.SmsSid,
    to: req.body.To,
    from: req.body.From,
    text: req.body.Body,
    status: req.body.SmsStatus,
    direction: "incomimg",
    createdAt: new Date().toDateString,
    updatedAt: new Date().toDateString
});
 await messageObj.save();
    res.send({
        status:true
        });
});

app.listen(PORT, () => {
  console.log(`Server is running on PORT`,PORT);
})