# Camper Compagnon

Een puur statische PWA voor het beheren van camper-voorraad, paklijsten,
reizen en vertrek-/aankomstchecklists. Geen backend, geen build-tooling —
alle data staat in `localStorage` op je eigen toestel.

**Live:** https://roudeelferink-cloud.github.io/camper-app/

## Installeren op iPhone

1. Open Safari en ga naar https://roudeelferink-cloud.github.io/camper-app/
2. Tik op de deelknop (vierkantje met pijl omhoog)
3. Kies **"Zet op beginscherm"**
4. De app opent voortaan fullscreen vanaf je beginscherm en werkt volledig offline

## Je data

- Alle gegevens (voorraad, reizen, checklists, instellingen) staan **lokaal
  op het toestel** in `localStorage`. Er is geen server en geen account.
- **Export/import is je back-up.** Ga naar ⚙ Instellingen → "Exporteer alle
  data (JSON)" om een reservekopie te downloaden. Op een ander toestel (of na
  een schone installatie) plak je die JSON in het importveld.
- Verwijder je de app of wis je websitedata in Safari, dan is de data weg —
  exporteer dus af en toe.

## Omgeving per reis

Per reis haalt het tabblad "Omgeving" via Geoapify (OpenStreetMap-data) de
locatie van de camping op plus POI's in de buurt: eten & drinken, strand &
natuur, supermarkten en bezienswaardigheden. De resultaten worden bij de
reis opgeslagen, dus eenmaal opgehaald werkt het ook offline.

## Techniek

- `index.html` + `app.js` + `style.css` — vanilla, geen frameworks
- `manifest.json` + `sw.js` — installeerbaar en offline (cache-first);
  alle paden zijn relatief omdat de app op een subpad van GitHub Pages draait
- Iconen gegenereerd met `tools/gen_icons.py` (pure Python, geen dependencies)
