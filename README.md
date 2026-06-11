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

## AI-reisadvies (optioneel)

De sectie "Advies & POI" per reis kan met websearch actueel advies ophalen
(weer, meeneemtips, camperregels zoals milieuzones en vignetten, plus
adressen van supermarkten, LPG, camperservice en camperplaatsen).

Daarvoor is een Anthropic API-key nodig:

1. Maak een account op https://console.anthropic.com
2. Maak onder **API Keys** een nieuwe key aan (en zet er een klein
   bestedingslimiet op)
3. Plak de key in de app onder ⚙ Instellingen → AI-advies

De key wordt alleen in `localStorage` op je toestel bewaard en wordt
uitsluitend rechtstreeks naar de Anthropic-API gestuurd.

## Techniek

- `index.html` + `app.js` + `style.css` — vanilla, geen frameworks
- `manifest.json` + `sw.js` — installeerbaar en offline (cache-first);
  alle paden zijn relatief omdat de app op een subpad van GitHub Pages draait
- Iconen gegenereerd met `tools/gen_icons.py` (pure Python, geen dependencies)
