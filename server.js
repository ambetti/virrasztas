// server.js
import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// Adatok tárolása JSON fájlban
const RES_FILE = path.join(__dirname, "reservations.json");

// Foglalt idősávok betöltése
function loadReservations() {
  if (!fs.existsSync(RES_FILE)) return [];
  return JSON.parse(fs.readFileSync(RES_FILE, "utf-8"));
}

// Mentés
function saveReservations(reservations) {
  fs.writeFileSync(RES_FILE, JSON.stringify(reservations, null, 2));
}

// Idősávok generálása
function generateTimeSlots() {
  const slots = [];
  let start = new Date("2025-10-04T22:00:00");
  let end = new Date("2025-10-05T09:00:00");

  while (start < end) {
    let next = new Date(start.getTime() + 60 * 60 * 1000);
    slots.push({
      start: start.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }),
      end: next.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }),
    });
    start = next;
  }
  return slots;
}

// E-mail beállítás
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "szentmihalyjelentkezes@gmail.com",
    pass: "szpdkzrhrwmtyydu"
},
tls: {
    rejectUnauthorized: false
}
});

// Főoldal
app.get("/", (req, res) => {
  const reservations = loadReservations();
  const reservedTimes = reservations.map(r => r.time);

  const slots = generateTimeSlots();
  let slotHtml = "";

  slots.forEach(s => {
    const label = `${s.start} - ${s.end}`;
    if (!reservedTimes.includes(label)) {
      slotHtml += `
        <div class="card shadow">
          <h5>${label}</h5>
          <button class="btn btn-slot" onclick="openForm('${label}')">Jelentkezem</button>
        </div>
      `;
    }
  });

  res.send(`
  <html lang="hu">
  <head>
    <meta charset="UTF-8">
    <title>Szent Mihály búcsú - Virrasztás</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Candal&family=Sanchez&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Wellfleet', serif; background: #f9f9f9; }
      h1 { font-family: 'City Lights', sans-serif; }
      .btn-slot { 
        background-color: #b29660; 
        border-color: #527351; 
        color: white; 
        margin: 10px; 
        width: 100%;
        max-width: 200px; 
      }
      .slots-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px; 
      }
      .card {
        flex: 1 1 220px;
        max-width: 220px;
        text-align: center;
        padding: 15px;
        margin: 10px;
      }
      @media (max-width: 576px) {
        .card { flex: 1 1 90%; max-width: 90%; }
        .btn-slot { max-width: 100%; }
      }
    </style>
  </head>
  <body class="container py-4">
    <h1 class="text-center mb-4">Szent Mihály búcsú - Virrasztás</h1>
    <div class="slots-container">
      ${slotHtml || "<p class='text-center'>Minden idősáv foglalt.</p>"}
    </div>

    <!-- Modal űrlap -->
    <div class="modal fade" id="formModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <form id="signupForm">
            <div class="modal-header">
              <h5 class="modal-title">Jelentkezés</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <input type="hidden" name="time" id="selectedTime">
              <div class="mb-3">
                <label>Név:</label>
                <input class="form-control" name="name" required>
              </div>
              <div class="mb-3">
                <label>E-mail:</label>
                <input class="form-control" type="email" name="email" required>
              </div>
              <div class="mb-3">
                <label>Telefonszám:</label>
                <input class="form-control" name="phone" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-slot">Jelentkezem</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script>
      function openForm(time) {
        document.getElementById("selectedTime").value = time;
        var myModal = new bootstrap.Modal(document.getElementById('formModal'));
        myModal.show();
      }

      document.getElementById("signupForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const formData = Object.fromEntries(new FormData(this).entries());
        const response = await fetch("/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        if (response.ok) {
          alert("Köszönjük, hogy jelentkeztél a virrasztásra!");
          location.reload();
        } else {
          alert("Hiba történt a jelentkezésnél.");
        }
      });
    </script>
  </body>
  </html>
  `);
});

// Foglalás kezelése
app.post("/signup", (req, res) => {
  const { name, email, phone, time } = req.body;
  if (!name || !email || !phone || !time) return res.sendStatus(400);

  let reservations = loadReservations();
  reservations.push({ name, email, phone, time });
  saveReservations(reservations);

  // E-mail szervezőnek
  transporter.sendMail({
    from: "szentmihalyjelentkezes@gmail.com",
    to: "szentmihalyjelentkezes@gmail.com",
    subject: "Új jelentkezés virrasztásra",
    text: `Időpont: ${time}\nNév: ${name}\nE-mail: ${email}\nTelefon: ${phone}`
  });

  // Visszaigazolás a jelentkezőnek
  transporter.sendMail({
    from: "szentmihalyjelentkezes@gmail.com",
    to: email,
    subject: "Visszaigazolás - Virrasztás",
    text: `transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: email,
  subject: "Visszaigazolás - Virrasztás",
  html: `
    <div style="font-family: Georgia, serif; color: #333; line-height: 1.6; font-size: 16px;">
      <h2 style="color:#b29660;">Köszönjük a virrasztásra való jelentkezést!</h2>
      <p>Az időpont, melyre jelentkeztél: <b>${time}</b></p>
      <p>Kérjük, pontosan érkezz, mert az ajtókat csak minden egész órában nyitjuk ki!</p>
      <p>Ha valami miatt úgy alakulna, hogy mégsem tudsz megjelenni az elvállalt időpontban, 
      kérjük, minél hamarabb jelezd a 
      <a href="mailto:szentmihalyjelentkezes@gmail.com">szentmihalyjelentkezes@gmail.com</a> e-mail címre!</p>
      <p style="margin-top:20px;">Krisztusban szeretettel,<br><i>a Szervezők</i></p>
    </div>
  `
});

  res.sendStatus(200);
});

// Admin felület
app.get("/admin", (req, res) => {
  const reservations = loadReservations();
  let rows = reservations.map((r, i) => `
    <tr>
      <td>${r.time}</td>
      <td>${r.name}</td>
      <td>${r.email}</td>
      <td>${r.phone}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteReservation(${i})">Törlés</button></td>
    </tr>
  `).join("");

  res.send(`
  <html lang="hu">
  <head>
    <meta charset="UTF-8">
    <title>Admin - Virrasztás</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  </head>
  <body class="container py-4">
    <h1 class="mb-4">Admin - Jelentkezések</h1>
    <table class="table table-bordered">
      <tr><th>Időpont</th><th>Név</th><th>E-mail</th><th>Telefon</th><th>Művelet</th></tr>
      ${rows || "<tr><td colspan='5'>Nincs jelentkező</td></tr>"}
    </table>
    <script>
      async function deleteReservation(index) {
        if (confirm("Biztos törölni akarod ezt a foglalást?")) {
          const response = await fetch("/delete/" + index, { method: "DELETE" });
          if (response.ok) location.reload();
          else alert("Hiba történt törlés közben.");
        }
      }
    </script>
  </body>
  </html>
  `);
});

app.delete("/delete/:index", (req, res) => {
  let reservations = loadReservations();
  const index = parseInt(req.params.index);
  if (index >= 0 && index < reservations.length) {
    reservations.splice(index, 1);
    saveReservations(reservations);
    res.sendStatus(200);
  } else {
    res.sendStatus(400);
  }
});

app.listen(PORT, () => {
  console.log(`Szerver fut: http://localhost:${PORT}`);
});
