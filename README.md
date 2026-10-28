# Portfolio — Théo Zanetti

Site portfolio personnel : développeur en formation à 42 Lausanne, ancien architecte reconverti via la géomatique et la 3D web.

Site en ligne : https://tznt.github.io/portfolio/

Site statique en HTML / CSS / JavaScript, sans étape de build ni dépendance à installer.

## Contenu

- **Hero** : un vrai relevé LiDAR du Cervin (swisstopo swissSURFACE3D), en fond permanent. Il tourne au scroll et la souris lit l'altitude sous le curseur.
- **Projets** : Krenolis, Opus 2, DronAge, projets du tronc commun 42, avec captures agrandissables.
- **Visites 3D** : le Mont-Saint-Michel et un jardin botanique, en gaussian splatting, lancées directement dans la page.
- **Parcours**, **Compétences**, **Contact** et téléchargement du CV.

## Structure

```
.
├── index.html      # page unique
├── style.css       # styles
├── script.js       # menu, visionneuse d'images, lancement des visites 3D
├── scene.js        # nuage de points du Cervin (Three.js)
├── assets/         # captures, CV (PDF) et cervin.bin (nuage de points réduit)
└── visites/        # visites 3D (build Vite) et leurs scènes .sog
```

Three.js (v0.160.0) est chargé depuis le CDN jsDelivr avec une vérification d'intégrité (SRI). Sans WebGL, le reste du site fonctionne normalement.

## Données et crédits

- **Cervin** : swisstopo, swissSURFACE3D (données ouvertes). 2 × 2 km réduits à une cellule de 4 m (`assets/cervin.bin`, 250 000 points).
- **Le Mont Saint Michel, France** : scan de [Mykhailo Moroz](https://superspl.at/user?id=misha_m), licence [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Botanical Garden - America v3** : scan de [Simon Bethke](https://superspl.at/user?id=simonbethke), licence [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/).

## Lancer en local

Les visites 3D et le nuage de points se chargent par `fetch`, il faut donc un serveur local (pas `file://`) :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Déploiement

GitHub Pages : **Settings → Pages → Source : branche `main`, dossier `/`**.

## Contact

[zanetti.theo@gmail.com](mailto:zanetti.theo@gmail.com) · [LinkedIn](https://www.linkedin.com/in/theo-zanetti) · [GitHub](https://github.com/TZnt)
