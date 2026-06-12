/* Camper Compagnon — onderweg-benodigdheden per land.
   Vaste, uitbreidbare tabel: per land een korte vignet/tol-typering en een
   lijst afvinkbare benodigdheden. Bewust GEEN prijzen of tarieven — en altijd
   met de kanttekening in de UI: richtlijn, controleer actuele eisen zelf. */

// Keuzelijst voor de dropdown (Europese landen, NL-namen).
export const EU_LANDEN = [
  'Albanië', 'Andorra', 'België', 'Bosnië en Herzegovina', 'Bulgarije',
  'Denemarken', 'Duitsland', 'Estland', 'Finland', 'Frankrijk', 'Griekenland',
  'Hongarije', 'Ierland', 'IJsland', 'Italië', 'Kroatië', 'Letland',
  'Liechtenstein', 'Litouwen', 'Luxemburg', 'Malta', 'Monaco', 'Montenegro',
  'Nederland', 'Noord-Macedonië', 'Noorwegen', 'Oostenrijk', 'Polen',
  'Portugal', 'Roemenië', 'San Marino', 'Servië', 'Slovenië', 'Slowakije',
  'Spanje', 'Tsjechië', 'Turkije', 'Verenigd Koninkrijk', 'Zweden', 'Zwitserland',
];

// Per land: vignet = korte typering tol/vignet-situatie (info-regel),
// items = afvinkbare benodigdheden [{ label, info }].
export const LAND_INFO = {
  'Duitsland': {
    vignet: 'Geen vignet; snelwegen tolvrij voor campers t/m 3,5 t.',
    items: [
      { label: 'Umweltplakette (milieusticker)', info: 'Verplicht in veel binnensteden (groene milieuzones); vooraf te bestellen.' },
      { label: 'Gevarendriehoek, verbanddoos en hesje', info: 'Verplichte uitrusting aan boord.' },
    ],
  },
  'Frankrijk': {
    vignet: 'Geen vignet; tolwegen betalen per traject (péage), télépéage-badge optioneel.',
    items: [
      { label: 'Crit’Air-vignet (milieusticker)', info: 'Verplicht in milieuzones (o.a. Parijs, Lyon, Grenoble); vooraf online bestellen.' },
      { label: 'Veiligheidsvest + gevarendriehoek', info: 'Vest binnen handbereik, verplicht bij pech.' },
      { label: 'Alcoholtester (éthylotest)', info: 'Bekende Franse eis; handhaving vervallen — controleer actueel.' },
    ],
  },
  'Oostenrijk': {
    vignet: 'Vignet verplicht t/m 3,5 t (sticker of digitaal); boven 3,5 t GO-Box.',
    items: [
      { label: 'Vignet (sticker of digitaal)', info: 'Digitaal vignet is kentekengebonden; let op activatietermijn bij online kopen.' },
      { label: 'Trajecttol ingepland (Brenner, tunnels)', info: 'Sommige trajecten vallen buiten het vignet en betalen apart.' },
      { label: 'Winteruitrusting (nov–apr)', info: 'Winterbanden/sneeuwkettingen bij winterse omstandigheden.' },
    ],
  },
  'Zwitserland': {
    vignet: 'Vignet verplicht t/m 3,5 t (jaarvignet, sticker of e-vignet); daarboven zware-verkeersheffing.',
    items: [
      { label: 'Vignet (jaar, sticker of e-vignet)', info: 'E-vignet is kentekengebonden.' },
      { label: 'Apart vignet voor aanhanger', info: 'Aanhanger of caravan heeft een eigen vignet nodig.' },
    ],
  },
  'Italië': {
    vignet: 'Geen vignet; tolwegen betalen per traject, Telepass optioneel.',
    items: [
      { label: 'ZTL-zones gecheckt voor de route', info: 'Verkeersbeperkte binnensteden (camera-handhaving); camping bereikbaar zonder ZTL?' },
      { label: 'Veiligheidsvest + gevarendriehoek', info: 'Vest verplicht bij verlaten voertuig op de vluchtstrook.' },
    ],
  },
  'Slovenië': {
    vignet: 'E-vignet verplicht t/m 3,5 t (digitaal, kentekengebonden).',
    items: [
      { label: 'E-vignet (digitaal)', info: 'Alleen online; controleer de juiste tariefklasse voor camperhoogte.' },
    ],
  },
  'België': {
    vignet: 'Geen vignet voor campers t/m 3,5 t.',
    items: [
      { label: 'LEZ-registratie (Antwerpen, Brussel, Gent)', info: 'Buitenlandse kentekens vooraf gratis registreren, anders boete.' },
      { label: 'Gevarendriehoek, verbanddoos, brandblusser en hesje', info: 'Verplichte uitrusting in België.' },
    ],
  },
  'Luxemburg': {
    vignet: 'Geen vignet, geen tolwegen.',
    items: [
      { label: 'Veiligheidsvest', info: 'Verplicht bij pech buiten de bebouwde kom.' },
    ],
  },
  'Denemarken': {
    vignet: 'Geen vignet t/m 3,5 t; brugtol per passage (Storebælt, Øresund).',
    items: [
      { label: 'Brugtol ingepland (Storebælt/Øresund)', info: 'Betalen per passage; online vooraf vaak handiger.' },
      { label: 'Milieuzone-registratie (diesel)', info: 'Diesels in grote steden vooraf registreren — controleer of dit voor jouw camper geldt.' },
    ],
  },
  'Spanje': {
    vignet: 'Geen vignet; tolwegen betalen per traject.',
    items: [
      { label: 'ZBE-milieuzone gecheckt (Madrid, Barcelona e.a.)', info: 'Lage-emissiezones; buitenlandse voertuigen soms vooraf registreren.' },
      { label: 'Veiligheidsvest + gevarendriehoek/V-16-lamp', info: 'Spanje stapt over op de V-16-noodlamp — controleer actueel.' },
    ],
  },
  'Kroatië': {
    vignet: 'Geen vignet; tolwegen betalen per traject, ENC-badge optioneel.',
    items: [
      { label: 'Veiligheidsvest per inzittende', info: 'Vest dragen verplicht bij verlaten voertuig langs de weg.' },
      { label: 'Reservelampenset', info: 'Verplicht voor voertuigen met halogeenverlichting.' },
    ],
  },
};
