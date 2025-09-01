// server.js
import express from "express";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import fs from "fs";

const app = express();
const PORT = 3000;

const DATA_FILE = "reservations.json";

// Idősávok (okt. 4. 22:00 - okt. 5. 09:00)
let slots = [
  "22:00-23:00", "23:00-00:00",
  "00:00-01:00", "01:00-02:00", "02:00-03:00", "03:00-04:00",
  "04:00-05:00", "05:00-06:00", "06:00-07:00", "07:00-08:00", "08:00-09:00"
];

// Helyfoglalások betöltése fájlból
let reservations = {};
if (fs.existsSync(DATA_FILE)) {
  reservations = JSON.parse(fs.readFileSync(DATA_FILE));
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// E-mail beállítások (pl. Gmail)
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "szentmihalyjelentkezes@gmail.com",
    pass: "<IDE_A_JELSZÓ>" // jobb megoldás: App Password használata
  }
});

// Főoldal - jelentkezési felület (modern, Bootstrap)
app.get("/", (req, res) => {
  let html = `
  <html lang="hu">
  <head>
    <meta charset="UTF-8">
    <title>Szent Mihály búcsú - Virrasztás</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  </head>
  <body class="bg-light">
    <div class="container py-5">
      <h1 class="text-center mb-4">Szent Mihály búcsú - Virrasztás</h1>
      <h4>Válassz egy idősávot:</h4>
      <div class="row row-cols-1 row-cols-md-2 g-3">`;

  slots.forEach(slot => {
    if (!reservations[slot]) {
      html += `
        <div class="col">
          <div class="card p-3 shadow-sm">
            <h5 class="card-title">${slot}</h5>
            <form method="POST" action="/signup">
              <input type="hidden" name="slot" value="${slot}">
              <div class="mb-2">
                <input type="text" name="name" class="form-control" placeholder="Név" required>
              </div>
              <div class="mb-2">
                <input type="email" name="email" class="form-control" placeholder="E-mail" required>
              </div>
              <div class="mb-2">
                <input type="text" name="phone" class="form-control" placeholder="Telefon" required>
              </div>
              <button type="submit" class="btn btn-primary w-100">Jelentkezem</button>
            </form>
          </div>
        </div>`;
    }
  });

  html += `
      </div>
    </div>
  </body>
  </html>`;
  res.send(html);
});

// Jelentkezés feldolgozása
app.post("/signup", (req, res) => {
  const { slot, name, email, phone } = req.body;

  if (!reservations[slot]) {
    reservations[slot] = { name, email, phone };
    fs.writeFileSync(DATA_FILE, JSON.stringify(reservations, null, 2));

    transporter.sendMail({
      from: "szentmihalyjelentkezes@gmail.com",
      to: "szentmihalyjelentkezes@gmail.com",
      subject: `Új jelentkező a virrasztásra: ${slot}`,
      text: `Idősáv: ${slot}\nNév: ${name}\nE-mail: ${email}\nTelefon: ${phone}`
    });

    transporter.sendMail({
      from: "szentmihalyjelentkezes@gmail.com",
      to: email,
      subject: "Visszaigazolás - Szent Mihály búcsú - Virrasztás",
      text: `Kedves ${name}!\n\nKöszönjük jelentkezésed a virrasztásra. Idősávod: ${slot}.\n\nÜdvözlettel: Szervezők`
    });

    res.send(`<div class="container py-5"><div class="alert alert-success">Köszönjük, ${name}! Sikeresen lefoglaltad a(z) ${slot} idősávot.</div><a href="/" class="btn btn-primary">Vissza a főoldalra</a></div>`);
  } else {
    res.send(`<div class="container py-5"><div class="alert alert-danger">Sajnáljuk, ez az idősáv már foglalt.</div><a href="/" class="btn btn-primary">Vissza</a></div>`);
  }
});

// Admin felület az összes jelentkezés megtekintésére
app.get("/admin", (req, res) => {
  let html = `
  <html lang="hu">
  <head>
    <meta charset="UTF-8">
    <title>Admin - Virrasztás jelentkezések</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  </head>
  <body class="bg-light">
    <div class="container py-5">
      <h1 class="text-center mb-4">Összes jelentkezés</h1>
      <table class="table table-striped">
        <thead><tr><th>Idősáv</th><th>Név</th><th>E-mail</th><th>Telefon</th></tr></thead>
        <tbody>`;

  for (const [slot, info] of Object.entries(reservations)) {
    html += `<tr><td>${slot}</td><td>${info.name}</td><td>${info.email}</td><td>${info.phone}</td></tr>`;
  }

  html += `</tbody></table></div></body></html>`;
  res.send(html);
});

app.listen(PORT, () => console.log(`Szerver fut: http://localhost:${PORT}`));
