# Portfolio — Théo Zanetti

Site statique (HTML/CSS/JS, sans build). Aucune dépendance à installer.

## Voir le site en local

Ouvre `index.html` dans un navigateur, ou lance un petit serveur local :

```bash
cd portfolio
python3 -m http.server 8000
# puis ouvre http://localhost:8000
```

## À compléter avant publication

- [ ] Vérifier que `assets/CV_Theo_Zanetti.pdf` est bien la dernière version du CV

Tout le reste (Krenolis, DronAge, GitHub, LinkedIn) est renseigné avec des informations réelles.

## Déploiement sur GitHub Pages (recommandé, gratuit)

1. Crée un repo GitHub, par exemple `portfolio` (public).
2. Depuis ce dossier :
   ```bash
   git init
   git add .
   git commit -m "Site portfolio v1"
   git branch -M main
   git remote add origin git@github.com:TON-USERNAME/portfolio.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Source : branche `main`, dossier `/`**.
4. Le site est en ligne sous `https://TON-USERNAME.github.io/portfolio` en quelques minutes.

### Nom de domaine personnalisé (optionnel, ~12 €/an)

1. Achète un domaine (ex. Namecheap, Infomaniak si tu veux un registrar suisse).
2. Chez le registrar, ajoute un enregistrement CNAME pointant vers `TON-USERNAME.github.io`.
3. Dans le repo GitHub : **Settings → Pages → Custom domain**, renseigne le domaine.
4. Crée un fichier `CNAME` à la racine du repo contenant juste le nom de domaine.

## Alternative : Vercel

```bash
npm i -g vercel
cd portfolio
vercel
```
Suis les instructions ; Vercel détecte un site statique automatiquement.

## Mettre à jour le contenu

Tout le texte est dans `index.html` (pas de CMS, pas de base de données). Les couleurs et
la mise en page sont dans `style.css` — les variables en haut du fichier (`:root`) contrôlent
toute la palette, y compris le mode sombre automatique.
