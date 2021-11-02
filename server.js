const express = require('express');
const app = express();
const port = 3000
const nodemailer = require('nodemailer');
const http = require("http");

var morgan = require('morgan')
var favicon = require('serve-favicon');
var path = require("path");
require('dotenv').config()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD
  },
});

function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }))
app.use('/css', express.static(path.join(__dirname, 'public/css')))
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(morgan('combined'));

app.set('trust proxy', 1)
app.set('view engine', 'ejs');

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
  var fra = req.body.fra.toString();
  var til = req.body.til.toString();
  var tekst = req.body.formaal;
  var html_string = "";
  html_string += "Fornavn: " + fnavn + "<br>";
  html_string += "Etternavn: " + enavn + "<br><br>";
  html_string += "Epost: " + epost + "<br>";
  html_string += "Telefonnummer: " + tlf + "<br><br>";
  html_string += "Dato: " + dato + " <br>Fra: " + fra + " Til: " + til + "<br><br>";
  html_string += "Formålet med leien: " + tekst;

  if (typeof fnavn === 'undefined' || fnavn === null || fnavn === '') {
    res.render('pages/tilbakemelding', {
      sjekk: false,
      message: "Fornavn mangler eller er tom"
    });
  } else if (typeof enavn === 'undefined' || enavn === null || enavn === '') {
    res.render('pages/tilbakemelding', {
      sjekk: false,
      message: "Etternavn mangler eller er tom"
    });
  } else if (!validateEmail(epost)) {
    res.render('pages/tilbakemelding', {
      sjekk: false,
      message: "Epost har feil format"
    });
  } else if (!/^\d{8}$/.test(tlf)) {
    res.render('pages/tilbakemelding', {
      sjekk: false,
      message: "Telefonnummer må være 8 siffer"
    });
  } else if (!new Date(dato).getTime() > 0) {
    res.render('pages/tilbakemelding', {
      sjekk: false,
      message: "Dato har feil format"
    });
  } else if (!fra.match(/^[012][0-9]:[0-9][0-9]$/)) {
    res.render('pages/tilbakemelding', {
      sjekk: false,
      message: "Fra tidspunkt har feil format"
    });
  } else if (!til.match(/^[012][0-9]:[0-9][0-9]$/)) {
    res.render('pages/tilbakemelding', {
      sjekk: false,
      message: "Til tidspunkt har feil format"
    });
  } else if (typeof tekst === 'undefined' || tekst === null || tekst === '') {
    res.render('pages/tilbakemelding', {
      sjekk: false,
      message: "Forespørsel mangler eller er tom"
    });
  } else {
    const mailOptions = {
      from: 'Namsos Athenæum Kontaktskjema <kontaktskjema.athenaeum@gmail.com>',
      to: "namsos.athenaeum@gmail.com",
      subject: 'Bestilling av rom for Namsos Athenæum',
      html: html_string
    }
    transporter.sendMail(mailOptions, function (err, result) {
      if (err) {
        res.render('pages/tilbakemelding', {
          sjekk: false,
          message: err
        });
      } else {
        transporter.close();
        res.render('pages/tilbakemelding', { sjekk: true });
      }
    })
  }
});

setInterval(function () {
  http.get("http://athenæum.no/");
}, 1200000);

app.listen(process.env.PORT || port, () => {
  console.log(`App listening at http://localhost:${port}`)
})