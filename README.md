# Ghost Cup — Tournoi Call of Duty

Ce projet a été importé depuis Bolt.new et est maintenant installé localement à la racine du dossier `GhostCup`.

## Architecture & Stack Technique
- **Frontend** : React 18, Vite, TypeScript, TailwindCSS, Lucide React (Icônes).
- **Backend / Database** : Supabase (PostgreSQL hébergé sur le Cloud). 
- Les identifiants de connexion Supabase sont définis dans le fichier `.env` à la racine et pointent vers un projet en ligne actif.

## Modifications effectuées
1. **Nettoyage et Importation** : Suppression des anciens fichiers statiques du dossier, extraction de l'archive `project-bolt-sb1-tcqjg7em.zip` (le vrai projet Ghost Cup), et déplacement des fichiers à la racine de la zone de travail.
2. **Installation** : Lancement de `npm install` pour installer toutes les dépendances.
3. **Image de fond d'accueil** : Déplacement de l'image `bacgroungimg.jpg` fournie dans le dossier `/public` et modification de la page `src/pages/Home.tsx` pour l'utiliser en tant qu'illustration de personnage sur le côté droit avec une opacité de 80% et des contrastes optimisés, reproduisant fidèlement le style du panel 1 de la maquette.
4. **Serveur de développement** : Démarré avec succès.

## Comment lancer le projet localement
1. Assurez-vous d'être à la racine de `c:\MAMP\htdocs\GhostCup`
2. Lancez la commande suivante pour démarrer le serveur de développement Vite :
   ```bash
   npm run dev
   ```
3. Ouvrez votre navigateur sur : **http://localhost:5175/**

## État des pages
Toutes les pages de la maquette (1v1, 5v5, Bracket dynamique connecté à Supabase, Espace Joueur, Dashboard Admin, Preuve de score) sont fonctionnelles et intégrées dans ce template Bolt.
