// Simulateur INAMI + mutualité — logique de calcul pure (aucune donnée stockée).
// Règles : article 30 de la nomenclature INAMI (version en vigueur depuis le 01/05/2024)
// et tarif opticiens du 01/01/2026. Les montants viennent des fichiers de données, pas du code.
// Les textes affichés existent en français (fr) et en néerlandais (nl).

const arrondi = (n) => Math.round(n * 100) / 100;

export function fmtD(v) {
  return v.toFixed(2).replace('.', ',') + ' D';
}

const TYPE = {
  fr: { unifocal: 'unifocal', bifocal: 'bifocal', progressif: 'progressif' },
  nl: { unifocal: 'enkelvoudig', bifocal: 'bifocaal', progressif: 'multifocaal' },
};

export const MESSAGES = {
  fr: {
    cat1: (A, s) => `Correction de ${fmtD(A)} : au moins ±${fmtD(s)}, remboursé à tout âge`,
    cat2: (age, max) => `Moins de ${age} ans : remboursé de 0,00 à ±${fmtD(max)}`,
    cat3: (age, type, A, min) => `${age} ans ou plus, verre ${TYPE.fr[type]}, correction de ${fmtD(A)} (au moins ±${fmtD(min)})`,
    sousSeuil: (A, s) => `Correction de ${fmtD(A)} : sous le seuil de ±${fmtD(s)} pour un adulte`,
    seniorUnifocal: (age, min) => `À ${age} ans ou plus, le seuil de ±${fmtD(min)} ne vaut que pour un bifocal ou un progressif`,
    sansPrescription: "Pas de prescription d'un ophtalmologue (annexe 15bis) : pas d'intervention INAMI pour les verres",
    prescriptionPerimee: (m) => `Prescription de plus de ${m} mois : elle n'est plus valable`,
    renouvellement: (ecoule, delai) => `Renouvellement trop tôt : ${ecoule} mois depuis la dernière paire remboursée, il en faut ${delai} (ou un changement d'au moins 0,5 D)`,
    reduction: "Réduction de 25 % appliquée : opticien non conventionné et patient non BIM.",
    materiauInconnu: "Matériau ou indice non précisé : le montant est celui du code le moins cher possible.",
    enfantIndice: (oeil, min) => `${oeil} : avant 18 ans, un code à indice élevé sous ${fmtD(min)} n'est accepté que si l'autre œil y a droit. Code standard appliqué.`,
    pasCodeMineralEnfant: "Pas de code INAMI pour des verres minéraux avant 18 ans : seuls les verres organiques sont remboursés",
    pasCodeIndiceBas65: "Entre ±4,25 et ±5,75 D après 65 ans, l'INAMI ne rembourse que les verres à indice élevé",
    pasCode: "Aucun code INAMI pour cette combinaison de verre",
    aVerifier: (nom, fiab) => `Montant ${nom} : source « ${fiab} », à vérifier sur le site de la mutualité.`,
    dixSept: "Le client a 17 ans : l'âge est calculé à la date de délivrance. Le passage à 18 ans pendant le délai de renouvellement n'a pas de règle claire.",
    doc15bis: "Prescription de l'ophtalmologue (annexe 15bis), moins de 6 mois",
    doc15: "Attestation de délivrance de l'opticien (annexe 15), signée par le client",
    docMut: (nom) => `Facture ou formulaire optique demandé par ${nom}`,
    mutInconnue: 'Mutualité inconnue',
    choisirMut: 'Choisis la mutualité du client pour ajouter son avantage',
    palier: (min, max) => ` (palier ${fmtD(min)} à ${fmtD(max)})`,
    avecPrescription: " (avec prescription d'ophtalmologue)",
    pasAvantage: "Pas d'avantage optique complémentaire",
    partenaire: (p) => `Avantage payé seulement chez ${p}`,
    prescriptionMut: "Cette mutualité demande une prescription d'ophtalmologue pour son avantage",
    dejaUtilise: (p) => `Avantage déjà utilisé il y a moins de ${p} mois`,
    avantage: (m, p, d) => `${m} € tous les ${p} mois${d}`,
    sansCumul: "Cette mutualité ne paie que si l'INAMI ne rembourse rien",
    siCumul: "Si l'avantage s'ajoute à l'INAMI",
    siPasCumul: "Si l'avantage ne s'ajoute pas",
    cumulInconnu: 'Règle de cumul inconnue pour cette mutualité',
  },
  nl: {
    cat1: (A, s) => `Correctie van ${fmtD(A)}: minstens ±${fmtD(s)}, terugbetaald op elke leeftijd`,
    cat2: (age, max) => `Jonger dan ${age} jaar: terugbetaald van 0,00 tot ±${fmtD(max)}`,
    cat3: (age, type, A, min) => `${age} jaar of ouder, ${TYPE.nl[type]} glas, correctie van ${fmtD(A)} (minstens ±${fmtD(min)})`,
    sousSeuil: (A, s) => `Correctie van ${fmtD(A)}: onder de drempel van ±${fmtD(s)} voor een volwassene`,
    seniorUnifocal: (age, min) => `Vanaf ${age} jaar geldt de drempel van ±${fmtD(min)} alleen voor bifocale of multifocale glazen`,
    sansPrescription: 'Geen voorschrift van een oogarts (bijlage 15bis): geen RIZIV-tegemoetkoming voor de glazen',
    prescriptionPerimee: (m) => `Voorschrift ouder dan ${m} maanden: het is niet meer geldig`,
    renouvellement: (ecoule, delai) => `Te vroeg voor hernieuwing: ${ecoule} maanden sinds de laatste terugbetaalde bril, er zijn er ${delai} nodig (of een wijziging van minstens 0,5 D)`,
    reduction: 'Vermindering van 25 % toegepast: opticien zonder conventie en patiënt zonder verhoogde tegemoetkoming.',
    materiauInconnu: 'Materiaal of index niet ingevuld: het bedrag is dat van de goedkoopst mogelijke code.',
    enfantIndice: (oeil, min) => `${oeil}: vóór 18 jaar wordt een code met hoge index onder ${fmtD(min)} alleen aanvaard als het andere oog er recht op heeft. Standaardcode toegepast.`,
    pasCodeMineralEnfant: 'Geen RIZIV-code voor minerale glazen vóór 18 jaar: alleen organische glazen worden terugbetaald',
    pasCodeIndiceBas65: 'Tussen ±4,25 en ±5,75 D na 65 jaar betaalt het RIZIV alleen glazen met hoge index terug',
    pasCode: 'Geen RIZIV-code voor deze combinatie van glas',
    aVerifier: (nom, fiab) => `Bedrag ${nom}: bron « ${fiab} », na te kijken op de website van het ziekenfonds.`,
    dixSept: 'De klant is 17 jaar: de leeftijd wordt berekend op de datum van aflevering. Voor de overgang naar 18 jaar tijdens de hernieuwingstermijn bestaat geen duidelijke regel.',
    doc15bis: 'Voorschrift van de oogarts (bijlage 15bis), minder dan 6 maanden oud',
    doc15: 'Afleveringsattest van de opticien (bijlage 15), ondertekend door de klant',
    docMut: (nom) => `Factuur of optiekformulier gevraagd door ${nom}`,
    mutInconnue: 'Ziekenfonds onbekend',
    choisirMut: 'Kies het ziekenfonds van de klant om het voordeel toe te voegen',
    palier: (min, max) => ` (schijf ${fmtD(min)} tot ${fmtD(max)})`,
    avecPrescription: ' (met voorschrift van een oogarts)',
    pasAvantage: 'Geen aanvullend optiekvoordeel',
    partenaire: (p) => `Voordeel alleen bij ${p}`,
    prescriptionMut: 'Dit ziekenfonds vraagt een voorschrift van een oogarts voor het voordeel',
    dejaUtilise: (p) => `Voordeel minder dan ${p} maanden geleden al gebruikt`,
    avantage: (m, p, d) => `${m} € om de ${p} maanden${d}`,
    sansCumul: 'Dit ziekenfonds betaalt alleen als het RIZIV niets terugbetaalt',
    siCumul: 'Als het voordeel bovenop het RIZIV komt',
    siPasCumul: 'Als het voordeel niet bovenop het RIZIV komt',
    cumulInconnu: 'Cumulregel onbekend voor dit ziekenfonds',
  },
};

/** Âge en années révolues à une date donnée. */
export function ageA(dateNaissance, date) {
  const n = new Date(dateNaissance);
  const d = new Date(date);
  let age = d.getFullYear() - n.getFullYear();
  const pasEncore =
    d.getMonth() < n.getMonth() ||
    (d.getMonth() === n.getMonth() && d.getDate() < n.getDate());
  if (pasEncore) age -= 1;
  return age;
}

/** Nombre de mois complets écoulés entre deux dates. */
export function moisEntre(debut, fin) {
  const a = new Date(debut);
  const b = new Date(fin);
  let mois = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) mois -= 1;
  return mois;
}

/** Amétropie maximale : méridien le plus fort, vision de loin. */
export function ametropieMax(sph, cyl = 0) {
  return Math.max(Math.abs(sph), Math.abs(sph + cyl));
}

/**
 * Catégorie INAMI d'un verre (article 30) :
 * 1 = tous âges dès ±6,00 D ; 2 = moins de 18 ans de 0,00 à ±5,75 D ;
 * 3 = 65 ans et plus, bifocal/progressif, de ±4,25 à ±5,75 D ; null = pas d'intervention.
 */
export function categorieVerre({ sph, cyl = 0 }, age, typeVerre, inami, lang = 'fr') {
  const T = MESSAGES[lang];
  const s = inami.seuils;
  const A = ametropieMax(sph, cyl);
  if (A >= s.tous_ages) return { categorie: 1, A, raison: T.cat1(A, s.tous_ages) };
  if (age < s.age_enfant_max) return { categorie: 2, A, raison: T.cat2(s.age_enfant_max, s.enfant_max) };
  if (age >= s.age_senior_min && typeVerre !== 'unifocal' && A >= s.senior_min) {
    return { categorie: 3, A, raison: T.cat3(s.age_senior_min, typeVerre, A, s.senior_min) };
  }
  let raison = T.sousSeuil(A, s.tous_ages);
  if (age >= s.age_senior_min && typeVerre === 'unifocal' && A >= s.senior_min) {
    raison = T.seniorUnifocal(s.age_senior_min, s.senior_min);
  }
  return { categorie: null, A, raison };
}

/** Indice « haut » ou « bas » au sens de l'article 30, ou null si on ne peut pas trancher. */
export function classeIndice(materiau, indice, categorie, typeVerre, inami) {
  if (indice == null) return null;
  const e = inami.indice_eleve;
  if (!materiau) {
    if (indice >= Math.max(e.organique, e.mineral)) return 'haut';
    if (indice < Math.min(e.organique, e.mineral_bifocal_65)) return 'bas';
    return null;
  }
  let seuil = materiau === 'mineral' ? e.mineral : e.organique;
  if (materiau === 'mineral' && categorie === 3 && typeVerre === 'bifocal') seuil = e.mineral_bifocal_65;
  return indice >= seuil ? 'haut' : 'bas';
}

/** Code INAMI le moins cher compatible avec la catégorie, le type, le matériau, l'indice et le cylindre. */
export function choisirCode(inami, categorie, typeVerre, materiau, classe, cyl) {
  const c = Math.min(Math.abs(cyl), inami.supplement_cylindre.seuil);
  const candidats = inami.codes.filter((k) => {
    if (k.categorie !== categorie || k.type !== typeVerre) return false;
    if (materiau && k.materiau !== materiau) return false;
    if (classe) {
      const strict = categorie === 2 && classe === 'haut';
      if (!(k.indice === classe || (k.indice === 'tous' && !strict))) return false;
    }
    const [lo, hi] = k.cyl;
    return c === 0 ? hi === 0 : lo > 0 && c >= lo && c <= hi;
  });
  if (!candidats.length) return null;
  return candidats.reduce((a, b) => (b.honoraire < a.honoraire ? b : a));
}

function raisonSansCode(categorie, materiau, classe, T) {
  if (categorie === 2 && materiau === 'mineral') return T.pasCodeMineralEnfant;
  if (categorie === 3 && classe === 'bas') return T.pasCodeIndiceBas65;
  return T.pasCode;
}

/**
 * Calcul complet. Entrée :
 * { dateNaissance, dateDelivrance, typeVerre, yeux: { od: {sph,cyl}|null, og: {sph,cyl}|null },
 *   prescriptionOphtalmo, datePrescription, derniereDelivrance, changement05,
 *   materiau ('organique'|'mineral'|null), indice (nombre|null), conventionne, bim, avecMonture, montureInterventions, mutualiteId, dernierAvantage,
 *   achatPartenaire, prixVerres, prixMonture }
 * lang : 'fr' ou 'nl' (langue des textes renvoyés).
 */
export function simuler(entree, inami, mutualites, lang = 'fr') {
  const T = MESSAGES[lang] || MESSAGES.fr;
  const avertissements = [];
  const age = ageA(entree.dateNaissance, entree.dateDelivrance);
  const enfant = age < inami.seuils.age_enfant_max;

  // 1. Conditions générales du droit INAMI
  const motifsSansInami = [];
  if (!entree.prescriptionOphtalmo) {
    motifsSansInami.push(T.sansPrescription);
  } else if (entree.datePrescription) {
    const m = moisEntre(entree.datePrescription, entree.dateDelivrance);
    if (m >= inami.prescription_validite_mois) motifsSansInami.push(T.prescriptionPerimee(inami.prescription_validite_mois));
  }
  if (entree.derniereDelivrance) {
    const delai = enfant ? inami.renouvellement.mois_enfant : inami.renouvellement.mois_adulte;
    const ecoule = moisEntre(entree.derniereDelivrance, entree.dateDelivrance);
    if (ecoule < delai && !entree.changement05) motifsSansInami.push(T.renouvellement(ecoule, delai));
  }

  // 2. Verres, œil par œil : catégorie puis code INAMI selon matériau, indice et cylindre
  const reduire = !entree.conventionne && !(inami.reduction_non_conventionne.exception_bim && entree.bim);
  const cats = {};
  let AMax = 0;
  for (const cote of ['od', 'og']) {
    const oeil = entree.yeux?.[cote];
    if (!oeil) continue;
    cats[cote] = categorieVerre(oeil, age, entree.typeVerre, inami, lang);
    AMax = Math.max(AMax, cats[cote].A);
  }
  if (!entree.materiau || entree.indice == null) avertissements.push(T.materiauInconnu);

  const yeux = {};
  let totalVerres = 0;
  let totalSupplements = 0;
  let reduction = 0;
  for (const cote of Object.keys(cats)) {
    const oeil = entree.yeux[cote];
    const cat = cats[cote];
    const res = { ...cat, eligible: false, montant: 0, supplement: 0, code: null, codeSupplement: null };
    if (cat.categorie && motifsSansInami.length === 0) {
      let classe = classeIndice(entree.materiau, entree.indice, cat.categorie, entree.typeVerre, inami);
      if (cat.categorie === 2 && classe === 'haut') {
        const autre = cats[cote === 'od' ? 'og' : 'od'];
        const min = inami.enfant_indice_eleve_min_dioptrie;
        const ok = cat.A >= min || (autre && (autre.A >= min || autre.categorie === 1));
        if (!ok) { classe = 'bas'; avertissements.push(T.enfantIndice(cote.toUpperCase(), min)); }
      }
      const code = choisirCode(inami, cat.categorie, entree.typeVerre, entree.materiau, classe, oeil.cyl || 0);
      if (code) {
        res.eligible = true;
        res.code = code.code;
        res.montant = code.honoraire;
        if (reduire) reduction += code.honoraire - code.reduit;
        if (Math.abs(oeil.cyl || 0) > inami.supplement_cylindre.seuil) {
          const sup = inami.supplement_cylindre.par_categorie[String(cat.categorie)];
          res.supplement = sup.honoraire;
          res.codeSupplement = sup.code;
          if (reduire) reduction += sup.honoraire - sup.reduit;
        }
      } else {
        res.raison = raisonSansCode(cat.categorie, entree.materiau, classe, T);
      }
    } else if (cat.categorie) {
      res.raison = motifsSansInami[0];
    }
    totalVerres += res.montant;
    totalSupplements += res.supplement;
    yeux[cote] = res;
  }

  // 3. Monture : seulement avant 18 ans, deux interventions au maximum,
  //    et la première seulement avec au moins un verre remboursé
  let monture = 0;
  const m = inami.monture_enfant;
  const dejaMontures = entree.montureInterventions || 0;
  const premiereOk = !(m.premiere_avec_verre && dejaMontures === 0 && totalVerres === 0);
  if (enfant && entree.avecMonture !== false && premiereOk && dejaMontures < m.max_interventions) {
    monture = m.honoraire;
    if (reduire) reduction += m.honoraire - m.reduit;
  }

  // 4. Opticien non conventionné et patient non BIM : colonne à 75 % du tarif
  const brut = totalVerres + totalSupplements + monture;
  reduction = arrondi(reduction);
  if (reduction > 0) avertissements.push(T.reduction);
  const totalInami = arrondi(brut - reduction);

  // 5. Mutualité
  const mut = mutualites.find((m) => m.id === entree.mutualiteId) || null;
  const mutualite = calculMutualite(mut, { enfant, AMax, totalInami, entree, T });
  if (mut && mut.fiabilite !== 'officiel' && !mut.fiabilite.startsWith('fiable')) {
    avertissements.push(T.aVerifier(mut.nom, mut.fiabilite));
  }
  if (enfant && age === inami.seuils.age_enfant_max - 1) avertissements.push(T.dixSept);

  // 6. Reste à charge
  const prix = (entree.prixVerres || 0) + (entree.prixMonture || 0);
  const scenarios = mutualite.scenarios.map((s) => {
    const montantMut = prix > 0 ? Math.min(s.montant, Math.max(0, prix - totalInami)) : s.montant;
    return {
      ...s,
      montant: arrondi(montantMut),
      totalRembourse: arrondi(totalInami + montantMut),
      reste: prix > 0 ? arrondi(Math.max(0, prix - totalInami - montantMut)) : null,
    };
  });

  const documents = [];
  if (totalInami > 0) documents.push(T.doc15bis, T.doc15);
  if (mut && scenarios.some((s) => s.montant > 0)) documents.push(T.docMut(mut.nom));

  return {
    age,
    motifsSansInami,
    yeux,
    inami: {
      verres: arrondi(totalVerres),
      supplements: arrondi(totalSupplements),
      monture,
      reduction,
      total: totalInami,
    },
    mutualite: { nom: mut?.nom ?? null, fiabilite: mut?.fiabilite ?? null, source: mut?.source_url ?? null, scenarios },
    prix: prix > 0 ? prix : null,
    avertissements,
    documents,
  };
}

function calculMutualite(mut, { enfant, AMax, totalInami, entree, T }) {
  if (!mut) return { scenarios: [{ label: T.mutInconnue, montant: 0, raison: T.choisirMut }] };

  let montant = enfant ? mut.montant_enfant : mut.montant_adulte;
  let periode = enfant && mut.periode_mois_enfant ? mut.periode_mois_enfant : mut.periode_mois;
  let detail = '';
  if (!enfant && mut.palier && AMax >= mut.palier.min && AMax <= mut.palier.max) {
    montant = mut.palier.montant_adulte;
    detail = T.palier(mut.palier.min, mut.palier.max);
  }
  if (mut.avec_prescription && entree.prescriptionOphtalmo) {
    montant = mut.avec_prescription.montant;
    periode = mut.avec_prescription.periode_mois;
    detail = T.avecPrescription;
  }

  if (montant === 0) return { scenarios: [{ label: mut.nom, montant: 0, raison: T.pasAvantage }] };
  if (mut.partenaire_requis && !entree.achatPartenaire) {
    return { scenarios: [{ label: mut.nom, montant: 0, raison: T.partenaire(mut.partenaire_requis) }] };
  }
  if (mut.prescription_requise && !entree.prescriptionOphtalmo) {
    return { scenarios: [{ label: mut.nom, montant: 0, raison: T.prescriptionMut }] };
  }
  if (entree.dernierAvantage && periode > 0 && moisEntre(entree.dernierAvantage, entree.dateDelivrance) < periode) {
    return { scenarios: [{ label: mut.nom, montant: 0, raison: T.dejaUtilise(periode) }] };
  }

  const raisonOk = T.avantage(montant, periode, detail);
  if (mut.cumul_inami === true || totalInami === 0) {
    return { scenarios: [{ label: mut.nom, montant, raison: raisonOk }] };
  }
  if (mut.cumul_inami === false) {
    return { scenarios: [{ label: mut.nom, montant: 0, raison: T.sansCumul }] };
  }
  return {
    scenarios: [
      { label: T.siCumul, montant, raison: raisonOk },
      { label: T.siPasCumul, montant: 0, raison: T.cumulInconnu },
    ],
  };
}
