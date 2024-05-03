const express = require('express');
const session = require('express-session');
const app = express();
const port = 8888
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();

var morgan = require('morgan')
var favicon = require('serve-favicon');
var path = require("path");
require('dotenv').config()
let db = new sqlite3.Database('logg.db');
db.run("CREATE TABLE IF NOT EXISTS skjema_logg (logg_dato TEXT,navn TEXT, epost TEXT, tlf TEXT, leie_dato TEXT, tekst TEXT, lokaler TEXT, tilbakemelding TEXT, ip TEXT, user_agent TEXT)");
db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use('/css', express.static(path.join(__dirname, 'public/css')))
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(morgan('combined'));

app.set('view engine', 'ejs');
app.set('trust proxy', 1);

var MemoryStore = require('memorystore')(session)
app.use(session({
  secret: 'bbfec636-2575-4983-81cb-7e548a9fe611',
  cookie: { maxAge: 2147483647 },
  saveUninitialized: false,
  resave: false,
  store: new MemoryStore({
    checkPeriod: 2147483647 // prune expired entries every 30 days
  }),
}))

var authUser = function (req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    return res.redirect('/login');
  }
};

app.get('/login', function (req, res) {
  res.render('pages/login');
});

app.post('/login', function (req, res) {
  if (req.body.password === process.env.PASSWORD) {
    req.session.authenticated = true;
    res.redirect("/logg");
  } else {
    res.render('pages/login');
  }
});

app.get('/logout', function (req, res) {
  if (req.session.authenticated) {
    delete req.session.authenticated;
  }
  res.redirect('/login');
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD
  },
});

function validateEmail(email) {
  const re = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(email);
}

function formatDate(date) {
  // Extracting date components
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is zero-based
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  // Concatenating components in the desired format
  return `${year}${month}${day} ${hours}${minutes}`;
}

app.get('/', function (req, res) {
  res.render('pages/forside');
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

app.get('/priser', function (req, res) {
  res.render('pages/priser');
});

app.get('/kontaktskjema', function (req, res) {
  res.render('pages/kontaktskjema', { sjekk: false });
});

app.get('/logg', authUser, function (req, res) {
  let db = new sqlite3.Database('logg.db');
  db.serialize(function () {
    db.all("SELECT rowid,* FROM skjema_logg", function (err, rows) {
      let rader = {};
      if (rows === undefined || rows.length == 0) {
        res.render('pages/logg', {
          rows: rader
        });
      } else {
        rows.forEach(function (row) {
          rader[row.rowid] = row;
        });
        res.render('pages/logg', {
          rows: rader
        });
      }
    });
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
    });
  });
});

app.get('/logg/:id', authUser, function (req, res) {
  let db = new sqlite3.Database('logg.db');
  db.serialize(function () {
    db.get("SELECT rowid,* FROM skjema_logg WHERE rowid = ?", req.params.id, function (err, row) {
      res.render('pages/logg_id', {
        row: row
      });
    });
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
    });
  });
});

app.post('/skjema', function (req, res) {
  let mailOptions = {};
  let sjekk = false;
  let message = "";
  let db_message = "";
  let navn = req.body.navn;
  let epost = req.body.epost;
  let tlf = req.body.tlf;
  let dato = req.body.dato;
  let lokaler = req.body.lokaler;
  if (lokaler === undefined) {
    lokaler = "Ingen lokaler valgt";
  }
  let tekst = req.body.formaal;
  let html_string = "";
  let ip = req.header('x-forwarded-for');
  let user_agent = req.headers['user-agent'];
  html_string += "Navn: " + navn + "<br>";
  html_string += "Epost: " + epost + "<br>";
  html_string += "Telefonnummer: " + tlf + "<br>";
  html_string += "Dato: " + dato + " <br>";
  html_string += "Lokaler: " + req.body.lokaler + "<br>"
  html_string += "Formålet med leien: " + tekst;

  if (typeof navn === 'undefined' || navn === null || navn === '') {
    message = "Navn mangler eller er tom";
    db_message = "NAVN";
  } else if (!validateEmail(epost)) {
    message = "Epost har feil format";
    db_message = "EPOST";
  } else if (!/^[479]\d{7}$/.test(tlf)) {
    message = "Telefonnummer har feil format";
    db_message = "TLF";
  } else if (new Date(dato) < new Date()) {
    message = "Dato har feil format eller er i fortiden";
    db_message = "DATO";
  } else if (typeof tekst === 'undefined' || tekst === null || tekst === '') {
    message = "Tekstfeltet er tomt";
    db_message = "TEKST";
  } else if (lokaler === "Ingen lokaler valgt") {
    message = "Du må velge et lokale";
    db_message = "LOKALET";
  } else {
    sjekk = true;
    message = "Forespørsel er sendt! Vi tar kontakt med deg så snart som mulig.";
    db_message = "OK";
    mailOptions = {
      from: {
        name: 'Kontaktskjema Athenæum',
        address: process.env.EMAIL_ADDRESS
      },
      to: process.env.EMAIL_ADDRESS_TO,
      bcc: epost,
      replyTo: epost,
      subject: 'Bestilling av rom for Namsos Athenæum',
      text: html_string,
      html: html_string
    }
  }
  let formatted_date = formatDate(new Date());
  let db = new sqlite3.Database('logg.db');
  db.serialize(function () {
    db.run("INSERT INTO skjema_logg (logg_dato, navn, epost, tlf, leie_dato, tekst, lokaler, tilbakemelding, ip, user_agent) VALUES (?,?,?,?,?,?,?,?,?,?)", formatted_date, navn, epost, tlf, dato, tekst, lokaler, db_message, ip, user_agent);
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
    });
  });
  if (sjekk === false) {
    res.render('pages/tilbakemelding', {
      sjekk: sjekk,
      message: message
    });
  } else {
    if (process.env.NODE_ENV === 'production') {
      transporter.verify(function (error, success) {
        if (error) {
          console.log(error);
        } else {
          transporter.sendMail(mailOptions, function (err, result) {
            if (err) {
              res.render('pages/tilbakemelding', {
                sjekk: sjekk,
                message: err
              });
            } else {
              transporter.close();
              res.render('pages/tilbakemelding', { sjekk: sjekk, message: message });
            }
          });
        }
      });
    } else if (process.env.NODE_ENV === 'development') {
      console.log(mailOptions);
      res.render('pages/tilbakemelding', { sjekk: sjekk, message: message });
    }
  }
});

app.listen(process.env.PORT || port, () => {
  console.log(`App listening at http://localhost:${port}`)
})