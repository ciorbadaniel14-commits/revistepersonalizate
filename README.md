# AlbumArt — versiune reală

## Ce funcționează
- încărcare de până la 80 fotografii, max. 15 MB/fotografie
- alegere model/copertă, material, culoare, dimensiune și pagini
- calcul automat al prețului
- formular real de comandă
- comenzile sunt salvate în SQLite
- fotografiile sunt salvate pe server
- panou de comenzi la `/admin`
- status comandă: Nouă, Confirmată, În lucru, Expediată, Finalizată, Anulată
- notificare email către administrator dacă SMTP este configurat

## Pornire locală
Ai nevoie de Node.js 18+.

```bash
npm install
cp .env.example .env
npm start
```

Deschide `http://localhost:3000`.
Panoul de comenzi este `http://localhost:3000/admin`.

## IMPORTANT înainte de publicare
1. Schimbă numărul de telefon și WhatsApp în `public/index.html`.
2. Completează `.env` cu emailul și datele SMTP.
3. Pentru producție, protejează `/admin` cu autentificare.
4. Pentru plată online cu cardul trebuie conectat un procesator de plăți disponibil în Moldova; versiunea de față înregistrează comanda și permite stabilirea plății la confirmare/livrare.
5. Configurează backup pentru `data/` și `uploads/`.
6. Activează HTTPS pe domeniul final.

## Structura
- `server.js` — backend API
- `public/index.html` — magazinul
- `public/app.js` — configurator + trimitere comandă
- `public/style.css` — design responsive
- `public/admin.html` — administrarea comenzilor
- `uploads/` — fotografiile încărcate
- `data/albumart.db` — baza de date creată la prima pornire
