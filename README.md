# Carnet MICI

Carnet de bord personnel pour les patients atteints de MICI (maladie de Crohn,
rectocolite hémorragique) : suivi des prises de médicaments, rappels
(pharmacie, rendez-vous médecin, prises de sang) et rangement des documents
médicaux (ordonnances, résumés, résultats d'analyses).

C'est une **PWA** (Progressive Web App) : elle s'installe sur l'écran
d'accueil d'un téléphone comme une app native, sans passer par un store.

## Modèle de sécurité

Les données de santé sont sensibles. Ce prototype adopte donc une approche
**local-first, sans serveur** :

- Toutes les données (prises, rappels, documents) sont stockées uniquement
  dans le navigateur de l'appareil (IndexedDB) — rien n'est envoyé sur
  Internet.
- Elles sont **chiffrées avec AES-256-GCM**. La clé de chiffrement est dérivée
  du code PIN de l'utilisateur via PBKDF2 (210 000 itérations, SHA-256) et
  n'est **jamais stockée** : elle n'existe qu'en mémoire tant que l'app est
  déverrouillée.
- Un écran de verrouillage par code PIN (6 chiffres) protège l'accès. L'app se
  reverrouille automatiquement après une période d'inactivité configurable
  (réglages).
- Sans le code PIN, les données stockées sont illisibles (bruit chiffré).
- **Anti brute-force** : après 5 codes PIN incorrects consécutifs, la saisie
  est bloquée un moment, avec un délai qui double à chaque nouvel échec (30 s,
  1 min, 2 min, … jusqu'à 30 min). Un essai correct réinitialise le compteur.
  Cela rend impraticable un brute-force via l'écran de verrouillage.

Limites à connaître pour un usage réel (au-delà du prototype) :
- Le code PIN est le seul facteur de protection ; s'il est deviné/observé, les
  données sont accessibles. Pas de biométrie dans ce prototype.
- Le blocage anti brute-force protège l'écran de verrouillage de l'app, mais
  pas une extraction directe du stockage du navigateur (IndexedDB) par un
  attaquant ayant un accès technique avancé à l'appareil déverrouillé (ex.
  outils de développement, appareil rooté/jailbreaké) : dans ce cas, la
  robustesse dépend uniquement de la force du code PIN et du coût du PBKDF2.
- Il n'y a pas de sauvegarde/synchronisation : désinstaller l'app ou vider les
  données du navigateur supprime définitivement le carnet.
- Les rappels utilisent l'API de notifications locale du navigateur ; leur
  fiabilité en arrière-plan dépend de l'OS/navigateur (particulièrement
  limité sur iOS). Pour une fiabilité totale, il faudrait un service de
  notifications push côté serveur — hors périmètre d'un prototype
  sans-serveur.

## Fonctionnalités

- **Carnet de prises** : date/heure, médicament, dose, commentaire libre.
- **Rappels** : pharmacie, rendez-vous médecin, prise de sang, autre — avec
  échéance, récurrence optionnelle et notifications locales.
- **Documents** : ajout de photos/PDF (ordonnances, résumés, résultats
  d'analyses) chiffrés, classés par catégorie.
- **Réglages** : changement du code PIN, délai de verrouillage automatique,
  suppression totale des données.

## Développement

```bash
npm install
npm run dev       # serveur de développement
npm run build     # build de production (+ manifeste PWA et service worker)
npm run preview   # tester le build de production localement
```

Pour régénérer les icônes de l'app à partir de `scripts/icon.svg` :

```bash
node scripts/gen-icons.mjs
```

## Tester sur mobile

1. Déployez `dist/` (après `npm run build`) sur un hébergement HTTPS
   (obligatoire pour les service workers et notifications).
2. Ouvrez l'URL sur le téléphone.
3. Android/Chrome : menu → « Ajouter à l'écran d'accueil ».
   iOS/Safari : bouton Partager → « Sur l'écran d'accueil ».
4. Au premier lancement, créez votre code PIN à 6 chiffres.
