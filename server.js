'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('dns');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGOLAB_URI);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open',()=> console.log("Connected to database ..."));

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});
  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

// body-parser middleware
app.use(bodyParser.urlencoded({extended: false}));

// create schema for url shortener
var urlSchema = new mongoose.Schema({
  original_url: 'String',
  short_url: 'Number'
});

var UrlDb = mongoose.model('UrlDb', urlSchema);

// url shortener microservice
// URL creater
var createUrlEntry = (url, res) => {
      // enumerate collection size to generate short URL index
    var short_url = 0
      UrlDb.find().exec((err, doc) => {
        if (err) res.json({error: err});
        else {
          if (doc != null) short_url = doc.length;
          UrlDb.create({original_url: url, short_url: short_url}, (err, data) => {
                if (err) res.json({error: err});
                else res.json( (({original_url, short_url})=>({original_url, short_url}))(data) );
          
          })
        }
      });  
}

// POST handler
app.post('/api/shorturl/new', (req, res) => {
  var url = req.body.url;
  
  // check whether the URL points to a valid page
  dns.lookup(url, (err, addresses) =>{
    
    if (err=='ENOENT') res.json({error: "invalid URL"});
    
    else {
      // look for previous entry having an identical url in db
      UrlDb.findOne({original_url: url}).exec((err, doc) => {
              if (err) res.json({error: err});
              
              // call createUrlEntry to add a new entry in db
              else if (doc == null) createUrlEntry(url, res);
        
              // if already exists, send appropriate json response 
              else res.json( (({original_url, short_url})=>({original_url, short_url}))(doc) );
           })
    }
  })
});

// GET handler
app.get('/api/shorturl/:short?', (req, res) => {
  UrlDb.findOne({short_url: req.params.short}).exec((err, doc) => { 
    if (err) res.json({error: err});
    else res.redirect(doc.original_url);
  });
})

app.listen(port, function () {
  console.log('Node.js listening ...');
});