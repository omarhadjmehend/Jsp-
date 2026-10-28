import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simuler, categorieVerre, ametropieMax, ageA, classeIndice, choisirCode } from '../src/calcul.js';

const inami = JSON.parse(readFileSync(new URL('../data/inami-2026.json', import.meta.url)));
const { mutualites } = JSON.parse(readFileSync(new URL('../data/mutualites.json', import.meta.url)));

const base = (surcharges = {}) => ({
  dateNaissance: '1990-03-15',
  dateDelivrance: '2026-10-27',
  typeVerre: 'unifocal',
  yeux: { od: { sph: -6.5, cyl: 0 }, og: { sph: -6.5, cyl: 0 } },
  prescriptionOphtalmo: true,
  datePrescription: '2026-09-01',
  derniereDelivrance: null,
  changement05: false,
  conventionne: true,
  bim: false,
  montureInterventions: 0,
  mutualiteId: null,
  dernierAvantage: null,
  achatPartenaire: false,
  prixVerres: 0,
  prixMonture: 0,
  ...surcharges,
});

// --- Seuils de l'article 30 ---
test('adulte à −5,75 : pas d\'intervention', () => {
  assert.equal(categorieVerre({ sph: -5.75 }, 36, 'unifocal', inami).categorie, null);
});

test('adulte −5,00 (−1,25) : méridien le plus fort −6,25, éligible', () => {
  assert.equal(ametropieMax(-5, -1.25), 6.25);
  assert.equal(categorieVerre({ sph: -5, cyl: -1.25 }, 36, 'unifocal', inami).categorie, 1);
});

test('hypermétrope +5,00 (−2,00) : méridien le plus fort 5,00, pas éligible', () => {
  assert.equal(categorieVerre({ sph: 5, cyl: -2 }, 40, 'unifocal', inami).categorie, null);
});

test('exactement ±6,00 : éligible', () => {
  assert.equal(categorieVerre({ sph: 6 }, 40, 'progressif', inami).categorie, 1);
});

test('65+ progressif à +4,25 : catégorie 3', () => {
  assert.equal(categorieVerre({ sph: 4.25 }, 70, 'progressif', inami).categorie, 3);
});

test('65+ unifocal à +4,25 : pas éligible', () => {
  assert.equal(categorieVerre({ sph: 4.25 }, 70, 'unifocal', inami).categorie, null);
});

test('64 ans progressif à +4,25 : pas encore catégorie 3', () => {
  assert.equal(categorieVerre({ sph: 4.25 }, 64, 'progressif', inami).categorie, null);
});

test('enfant correction plane : catégorie 2', () => {
  assert.equal(categorieVerre({ sph: 0 }, 10, 'unifocal', inami).categorie, 2);
});

test('âge calculé à la date de délivrance', () => {
  assert.equal(ageA('2008-10-28', '2026-10-27'), 17);
  assert.equal(ageA('2008-10-27', '2026-10-27'), 18);
});

// --- Montants ---
test('adulte −6,50 unifocal deux yeux : 2 × 82,22 €', () => {
  const r = simuler(base(), inami, mutualites);
  assert.equal(r.inami.total, 164.44);
});

test('enfant progressif : 2 × 197,40 € + monture 29,51 €', () => {
  const r = simuler(
    base({ dateNaissance: '2014-05-01', typeVerre: 'progressif', yeux: { od: { sph: -1 }, og: { sph: -1 } } }),
    inami, mutualites
  );
  assert.equal(r.inami.verres, 394.8);
  assert.equal(r.inami.monture, 29.51);
  assert.equal(r.inami.total, 424.31);
});

test('enfant ayant déjà eu 2 montures : plus de monture', () => {
  const r = simuler(base({ dateNaissance: '2014-05-01', yeux: { od: { sph: -1 }, og: null }, montureInterventions: 2 }), inami, mutualites);
  assert.equal(r.inami.monture, 0);
  assert.equal(r.inami.total, 45.88);
});

test('cylindre au-dessus de 6,00 D : supplément de 95,92 €', () => {
  const r = simuler(base({ yeux: { od: { sph: -1, cyl: -6.5 }, og: null } }), inami, mutualites);
  assert.equal(r.inami.supplements, 95.92);
  assert.equal(r.inami.total, 82.22 + 95.92);
});

// --- Conditions générales ---
test('sans prescription d\'ophtalmologue : 0 € INAMI', () => {
  const r = simuler(base({ prescriptionOphtalmo: false }), inami, mutualites);
  assert.equal(r.inami.total, 0);
  assert.equal(r.motifsSansInami.length, 1);
});

test('prescription de plus de 6 mois : 0 € INAMI', () => {
  const r = simuler(base({ datePrescription: '2026-03-01' }), inami, mutualites);
  assert.equal(r.inami.total, 0);
});

test('renouvellement adulte après 3 ans sans changement : refusé', () => {
  const r = simuler(base({ derniereDelivrance: '2023-10-01' }), inami, mutualites);
  assert.equal(r.inami.total, 0);
});

test('renouvellement adulte après 3 ans avec changement ≥ 0,5 D : accepté', () => {
  const r = simuler(base({ derniereDelivrance: '2023-10-01', changement05: true }), inami, mutualites);
  assert.equal(r.inami.total, 164.44);
});

test('renouvellement enfant après 2 ans : accepté', () => {
  const r = simuler(base({ dateNaissance: '2014-05-01', yeux: { od: { sph: -1 }, og: null }, derniereDelivrance: '2024-10-01' }), inami, mutualites);
  assert.ok(r.inami.verres > 0);
});

test('non conventionné non BIM : −25 %', () => {
  const r = simuler(base({ conventionne: false }), inami, mutualites);
  assert.equal(r.inami.total, 123.34); // 2 × 61,67 € (colonne à 75 % du tarif)
  assert.ok(r.avertissements.some((a) => a.includes('25 %')));
});

test('non conventionné mais BIM : pas de réduction', () => {
  const r = simuler(base({ conventionne: false, bim: true }), inami, mutualites);
  assert.equal(r.inami.total, 164.44);
});

// --- Mutualités ---
test('MC s\'ajoute à l\'INAMI', () => {
  const r = simuler(base({ mutualiteId: 'mc' }), inami, mutualites);
  assert.equal(r.mutualite.scenarios[0].montant, 120);
  assert.equal(r.mutualite.scenarios[0].totalRembourse, 284.44);
});

test('CM : rien si l\'INAMI paie (adulte −6,50)', () => {
  const r = simuler(base({ mutualiteId: 'cm' }), inami, mutualites);
  assert.equal(r.mutualite.scenarios[0].montant, 0);
});

test('CM : 40 € si l\'INAMI ne paie rien (adulte −4,00)', () => {
  const r = simuler(base({ mutualiteId: 'cm', yeux: { od: { sph: -4 }, og: { sph: -4 } } }), inami, mutualites);
  assert.equal(r.inami.total, 0);
  assert.equal(r.mutualite.scenarios[0].montant, 40);
});

test('Helan : palier 60 € entre 4,50 et 5,75 D', () => {
  const r = simuler(base({ mutualiteId: 'helan', yeux: { od: { sph: -5 }, og: { sph: -4 } } }), inami, mutualites);
  assert.equal(r.mutualite.scenarios[0].montant, 60);
});

test('Solidaris Wallonie hors magasin partenaire : 0 €', () => {
  const r = simuler(base({ mutualiteId: 'solidaris-wallonie' }), inami, mutualites);
  assert.equal(r.mutualite.scenarios[0].montant, 0);
});

test('cumul inconnu et INAMI payé : deux scénarios', () => {
  const r = simuler(base({ mutualiteId: 'mutualia' }), inami, mutualites);
  assert.equal(r.mutualite.scenarios.length, 2);
  assert.equal(r.mutualite.scenarios[0].montant, 200);
  assert.equal(r.mutualite.scenarios[1].montant, 0);
});

test('avantage déjà utilisé dans la période : 0 €', () => {
  const r = simuler(base({ mutualiteId: 'partenamut', dernierAvantage: '2025-06-01' }), inami, mutualites);
  assert.equal(r.mutualite.scenarios[0].montant, 0);
});

test('avantage mutualité plafonné au reste à payer', () => {
  const r = simuler(base({ mutualiteId: 'mc', prixVerres: 200 }), inami, mutualites);
  assert.equal(r.mutualite.scenarios[0].montant, 35.56);
  assert.equal(r.mutualite.scenarios[0].reste, 0);
});

test('reste à charge = prix − INAMI − mutualité', () => {
  const r = simuler(base({ mutualiteId: 'partenamut', prixVerres: 400, prixMonture: 150 }), inami, mutualites);
  assert.equal(r.mutualite.scenarios[0].reste, 550 - 164.44 - 75);
});

// --- Langues ---
test('néerlandais : mêmes montants, textes traduits', () => {
  const e = base({ mutualiteId: 'cm', yeux: { od: { sph: -4 }, og: { sph: -4 } }, conventionne: false });
  const fr = simuler(e, inami, mutualites, 'fr');
  const nl = simuler(e, inami, mutualites, 'nl');
  assert.equal(nl.inami.total, fr.inami.total);
  assert.equal(nl.mutualite.scenarios[0].montant, fr.mutualite.scenarios[0].montant);
  assert.match(nl.yeux.od.raison, /drempel/);
});

test('chaque message existe dans les deux langues', async () => {
  const { MESSAGES } = await import('../src/calcul.js');
  assert.deepEqual(Object.keys(MESSAGES.nl).sort(), Object.keys(MESSAGES.fr).sort());
});

test('Mutualia sans prescription : pas d\'avantage', () => {
  const r = simuler(base({ mutualiteId: 'mutualia', prescriptionOphtalmo: false }), inami, mutualites);
  assert.equal(r.mutualite.scenarios[0].montant, 0);
});

test('Mutualité Neutre : rien si l\'INAMI paie', () => {
  const r = simuler(base({ mutualiteId: 'neutre' }), inami, mutualites);
  assert.equal(r.mutualite.scenarios[0].montant, 0);
});

test('supplément cylindre enfant : 26,68 €', () => {
  const r = simuler(base({ dateNaissance: '2014-05-01', avecMonture: false, yeux: { od: { sph: 3, cyl: -6.5 }, og: null } }), inami, mutualites);
  assert.equal(r.inami.supplements, 26.68);
});

test('première monture enfant sans verre remboursé : pas de monture', () => {
  const r = simuler(base({ dateNaissance: '2014-05-01', prescriptionOphtalmo: false, yeux: { od: { sph: -1 }, og: null } }), inami, mutualites);
  assert.equal(r.inami.monture, 0);
});

test('deuxième monture enfant sans verre remboursé : monture payée', () => {
  const r = simuler(base({ dateNaissance: '2014-05-01', prescriptionOphtalmo: false, montureInterventions: 1, yeux: { od: { sph: -1 }, og: null } }), inami, mutualites);
  assert.equal(r.inami.monture, 29.51);
});

// --- Matériau, indice et code INAMI ---
test('indice élevé : organique dès 1,6, minéral dès 1,7', () => {
  assert.equal(classeIndice('organique', 1.6, 1, 'unifocal', inami), 'haut');
  assert.equal(classeIndice('organique', 1.56, 1, 'unifocal', inami), 'bas');
  assert.equal(classeIndice('mineral', 1.6, 1, 'unifocal', inami), 'bas');
  assert.equal(classeIndice('mineral', 1.7, 1, 'unifocal', inami), 'haut');
  assert.equal(classeIndice('mineral', 1.6, 3, 'bifocal', inami), 'haut');
  assert.equal(classeIndice(null, 1.67, 1, 'unifocal', inami), null);
});

test('adulte unifocal organique 1,67 sphérique : code 741134, 114,89 €', () => {
  const r = simuler(base({ materiau: 'organique', indice: 1.67 }), inami, mutualites);
  assert.equal(r.yeux.od.code, '741134');
  assert.equal(r.inami.total, 229.78);
});

test('adulte unifocal minéral 1,5 torique : code 741031', () => {
  const r = simuler(base({ materiau: 'mineral', indice: 1.5, yeux: { od: { sph: -6, cyl: -1 }, og: null } }), inami, mutualites);
  assert.equal(r.yeux.od.code, '741031');
  assert.equal(r.inami.total, 82.22);
});

test('progressif organique indice élevé torique : 332,03 €', () => {
  const r = simuler(base({ typeVerre: 'progressif', materiau: 'organique', indice: 1.6, yeux: { od: { sph: -5, cyl: -1.25 }, og: null } }), inami, mutualites);
  assert.equal(r.yeux.od.code, '741613');
  assert.equal(r.inami.total, 332.03);
});

test('bifocal organique haut : bande de cylindre 4,25–6,00', () => {
  const k = choisirCode(inami, 1, 'bifocal', 'organique', 'haut', -5);
  assert.equal(k.code, '741370');
});

test('matériau inconnu : code le moins cher et avertissement', () => {
  const r = simuler(base({ typeVerre: 'progressif', yeux: { od: { sph: -6.5 }, og: null } }), inami, mutualites);
  assert.equal(r.yeux.od.code, '741510');
  assert.equal(r.inami.total, 216.08);
  assert.ok(r.avertissements.some((a) => a.includes('Matériau')));
});

test('enfant verres minéraux : pas de code INAMI', () => {
  const r = simuler(base({ dateNaissance: '2014-05-01', materiau: 'mineral', indice: 1.5, avecMonture: false, yeux: { od: { sph: -1 }, og: null } }), inami, mutualites);
  assert.equal(r.yeux.od.eligible, false);
  assert.equal(r.inami.total, 0);
});

test('enfant indice élevé sous 3,75 D des deux côtés : code standard', () => {
  const r = simuler(base({ dateNaissance: '2014-05-01', materiau: 'organique', indice: 1.6, avecMonture: false, yeux: { od: { sph: -2 }, og: { sph: -1.5 } } }), inami, mutualites);
  assert.equal(r.yeux.od.code, '741694');
  assert.equal(r.inami.verres, 91.76);
});

test('enfant indice élevé, un œil à −4,00 : code indice élevé des deux côtés', () => {
  const r = simuler(base({ dateNaissance: '2014-05-01', materiau: 'organique', indice: 1.6, avecMonture: false, yeux: { od: { sph: -4 }, og: { sph: -1.5 } } }), inami, mutualites);
  assert.equal(r.yeux.og.code, '743514 / 741753');
  assert.equal(r.inami.verres, 232.6);
});

test('65+ progressif à +4,50 indice bas : pas de code', () => {
  const r = simuler(base({ dateNaissance: '1955-01-01', typeVerre: 'progressif', materiau: 'organique', indice: 1.5, yeux: { od: { sph: 4.5 }, og: null } }), inami, mutualites);
  assert.equal(r.yeux.od.eligible, false);
});

test('non conventionné : supplément et monture enfant aussi à 75 %', () => {
  const r = simuler(base({ dateNaissance: '2014-05-01', conventionne: false, materiau: 'organique', indice: 1.5, yeux: { od: { sph: 3, cyl: -6.5 }, og: null } }), inami, mutualites);
  // verre 741731 (cyl 3,25–6,00) 48,02 + supplément 20,01 + monture 22,14
  assert.equal(r.inami.total, 90.17);
});
