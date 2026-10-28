# Portfolio — Théo Zanetti

Site portfolio personnel : développeur en formation à 42 Lausanne, ancien architecte reconverti via la géomatique et la 3D web.

Site en ligne : https://tznt.github.io/portfolio/

Site statique en HTML / CSS / JavaScript, sans étape de build ni dépendance à installer.

## Contenu

- **Hero** : un fond animé en shader (domain warping de bruit fractal), qui réagit à la souris et glisse au scroll.
- **Projets** : Krenolis, Opus 2, DronAge, projets du tronc commun 42, avec captures agrandissables.
- **Visites 3D** : le Mont-Saint-Michel et un jardin botanique, en gaussian splatting, lancées directement dans la page.
- **Parcours**, **Compétences**, **Contact** et téléchargement du CV.

## Structure

```
.
├── index.html      # page unique
├── style.css       # styles
├── script.js       # menu, visionneuse d'images, lancement des visites 3D
├── hero.js         # shader WebGL du fond animé
├── assets/         # captures et CV (PDF)
└── visites/        # visites 3D (build Vite) et leurs scènes .sog
```

Le fond animé est du WebGL natif, sans dépendance. Sans WebGL, le reste du site fonctionne normalement.

## Données et crédits

- **Shader du hero** : d'après [Patricio Gonzalez Vivo](http://patriciogonzalezvivo.com) (2015, The Book of Shaders) et [Morgan McGuire](https://www.shadertoy.com/view/4dS3Wd), palette et interactions adaptées.
- **Le Mont Saint Michel, France** : scan de [Mykhailo Moroz](https://superspl.at/user?id=misha_m), licence [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Botanical Garden - America v3** : scan de [Simon Bethke](https://superspl.at/user?id=simonbethke), licence [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/).

## Lancer en local

Les visites 3D se chargent par `fetch`, il faut donc un serveur local (pas `file://`) :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Déploiement

GitHub Pages : **Settings → Pages → Source : branche `main`, dossier `/`**.

## Contact

[zanetti.theo@gmail.com](mailto:zanetti.theo@gmail.com) · [LinkedIn](https://www.linkedin.com/in/theo-zanetti) · [GitHub](https://github.com/TZnt)
