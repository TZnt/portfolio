# Portfolio — Théo Zanetti

Site portfolio personnel : développeur en formation à 42 Lausanne, ancien architecte reconverti via la géomatique et la 3D web.

Site statique en HTML / CSS / JavaScript, sans étape de build ni dépendance à installer.

Site en ligne : https://tznt.github.io/portfolio/

## Contenu

- **Projets** : Krenolis, Opus 2 (visualiseur 3D), DronAge (planification de vols de drone), projets du tronc commun 42
- **Parcours** : frise chronologique de la formation et des expériences
- **Compétences** : langages, outils, géomatique et 3D, langues
- **Contact** : email, LinkedIn, GitHub, et téléchargement du CV

## Structure

```
.
├── index.html      # page unique
├── style.css       # styles
├── script.js       # petits utilitaires (année du pied de page)
├── agenda.js       # animation canvas 2D « agenda » (hero)
├── scene.js        # scène 3D Three.js (hero)
└── assets/         # captures d'écran des projets et CV (PDF)
```

Three.js (v0.160.0) est chargé depuis le CDN jsDelivr avec une vérification d'intégrité (SRI). Si la scène 3D est indisponible, le reste du site fonctionne normalement.

## Lancer en local

Ouvrir `index.html` dans un navigateur, ou démarrer un serveur local :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Déploiement

Le site est publié avec GitHub Pages : **Settings → Pages → Source : branche `main`, dossier `/`**.

## Contact

[zanetti.theo@gmail.com](mailto:zanetti.theo@gmail.com) · [LinkedIn](https://www.linkedin.com/in/theo-zanetti) · [GitHub](https://github.com/TZnt)
