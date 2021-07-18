const express = require('express');
const app = express();
const port = 3000
const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const http = require("http");

var bodyParser = require('body-parser');
var morgan = require('morgan')
var favicon = require('serve-favicon');
var path = require("path");
require('dotenv').config()

const myOAuth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
)

myOAuth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN
});

const myAccessToken = myOAuth2Client.getAccessToken()

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: "ole.hustad@gmail.com",
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
    accessToken: myAccessToken
  }
});

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use('/css', express.static(path.join(__dirname, 'public/css')))
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.set('trust proxy', 1)

app.get('/', function (req, res) {
  res.render('pages/hovedside');
});

app.get('/kalender', function (req, res) {
  res.render('pages/kalender');
});

app.get('/vilkaar', function (req, res) {
  res.render('pages/vilkaar');
});

app.get('/lokalene', function (req, res) {
  res.render('pages/lokalene');
});

app.get('/kontaktskjema', function (req, res) {
  res.render('pages/kontaktskjema', { sjekk: false });
});

app.post('/', function (req, res) {
  var fnavn = req.body.fnavn;
  var enavn = req.body.enavn;
  var epost = req.body.epost;
  var tlf = req.body.tlf;
  var dato = req.body.dato;
  var fra = req.body.fra;
  var til = req.body.til;
  var tekst = req.body.formaal;
  var html_string = "";
  html_string += "Fornavn: " + fnavn + "<br>";
  html_string += "Etternavn: " + enavn + "<br><br>";
  html_string += "Epost: " + epost + "<br>";
  html_string += "Telefonnummer: " + tlf + "<br><br>";
  html_string += "Dato: " + dato + " <br>Fra: " + fra + " Til: " + til + "<br><br>";
  html_string += "Formålet med leien: " + tekst;

  const mailOptions = {
    from: 'ole.hustad@gmail.com',
    to: 'ole.hustad@tietoevry.com',
    /* to: "namsos.athenaeum@gmail.com", */
    subject: 'Bestilling av rom for Namsos Athenæum',
    html: html_string
  }
  transport.sendMail(mailOptions, function (err, result) {
    if (err) {
      res.render('pages/tilbakemelding', {
        sjekk: false,
        message: err
      })
    } else {
      transport.close();
      res.render('pages/tilbakemelding', { sjekk: true })
    }
  })
})

/* setInterval(function () {
  http.get("https://athenaeum-no.herokuapp.com/");
}, 1200000); */

app.listen(process.env.PORT || port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})