# Simulateur INAMI optique

Outil web qui calcule au comptoir le remboursement d'une paire de lunettes en Belgique : intervention INAMI, avantage de la mutualité et reste à payer. Il ne stocke aucune donnée : tout est calculé dans le navigateur.

## Pourquoi

Les règles INAMI (article 30 de la nomenclature) et les avantages des mutualités se combinent mal de tête. Exemple : une correction de −5,00 (−1,25) a un méridien le plus fort de −6,25 et donne droit à l'INAMI chez un adulte, alors que la sphère seule est sous le seuil de ±6,00. Certaines mutualités (CM, Helan, VNZ) ne paient que si l'INAMI ne rembourse rien. Aucun simulateur belge interactif et à jour n'existait.

## Ce que fait la v1

- Éligibilité INAMI œil par œil (catégories 1°, 2°, 3°), avec la raison affichée
- Validité de la prescription (6 mois) et délai de renouvellement (2 ou 5 ans, ou changement ≥ 0,5 D)
- Code INAMI exact de chaque verre selon le matériau (organique ou minéral), l'indice et le cylindre, parmi les 48 codes du tarif 2026
- Supplément cylindre > 6 D et monture enfant (2 interventions max), montants selon la catégorie
- Réduction de 25 % chez un opticien non conventionné, sauf patient BIM, avec les montants arrondis du tarif officiel
- Avantage de 12 mutualités avec deux règles : cumul avec l'INAMI, magasin partenaire obligatoire
- Deux scénarios quand la règle de cumul d'une mutualité est inconnue
- Reste à payer, documents à remettre, niveau de fiabilité de chaque source
- Interface et explications en français et en néerlandais

Hors v1 : lentilles de contact, verres lenticulaires, filtres médicaux, prismes, basse vision.

## Structure

- `data/inami-2026.json` : seuils, délais et les 48 codes du tarif opticiens du 01/01/2026 (montant plein et montant à 75 %), avec la source
- `data/mutualites.json` : avantages des mutualités, avec source, date de vérification et fiabilité
- `src/calcul.js` : la logique de calcul, une fonction pure sans dépendance
- `src/page.html` : l'interface
- `tests/calcul.test.js` : 47 tests sur les cas limites de l'article 30 et des mutualités
- `build.js` : assemble une page HTML autonome dans `dist/`

Les montants sont dans les fichiers de données, pas dans le code : une indexation INAMI se met à jour en changeant un fichier.

## Lancer

```
npm test        # lance les tests (Node 20 ou plus, aucune installation)
npm run build   # génère dist/simulateur.html
```

## Avant une mise en ligne publique

- Montants INAMI vérifiés le 27/10/2026 sur le [tarif officiel du 01/01/2026](https://www.inami.fgov.be/SiteCollectionDocuments/tarif_opticiens_20260101.pdf) ; surveiller l'index de 2,72 % annoncé
- Règle de cumul avec l'INAMI encore inconnue pour Solidaris, Mutualia et la Mutualité libérale (le simulateur affiche deux scénarios)
- Faire relire l'interface néerlandaise par un locuteur natif

## Avertissement

Estimation indicative, non contractuelle. Le remboursement final est décidé par la mutualité. Outil indépendant, non affilié à l'INAMI, à une mutualité ou à une enseigne.

## Fait avec

Construit avec Claude Code, à partir de mon expérience de conseiller en optique. Les règles ont été vérifiées sur les textes INAMI et chaque cas limite a un test.
