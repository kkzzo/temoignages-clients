# 🎥 Témoignages clients

Page publique Next.js pour afficher 200-300 vidéos témoignages hébergées sur Bunny Stream, avec pagination, filtres multi-tags et mode présentation plein écran.

---

## ✨ Fonctionnalités

- **Grille responsive** de vignettes avec thumbnails lazy-loadés
- **Recherche** par nom de client, entreprise ou rôle
- **Filtres multi-tags** : secteur + année + tags custom (sélection combinée)
- **Pagination** (24 vidéos par page)
- **Modal player** avec navigation clavier (← → pour prev/next, Esc pour fermer)
- **Mode présentation** plein écran avec enchaînement automatique — idéal pour showroom, réunions client, événements
- **Deux scripts** : téléchargement depuis Frame.io + upload vers Bunny

---

## 🏁 Pipeline complet — 3 étapes

1. **Télécharger** les vidéos de Frame.io → `npm run download`
2. **Uploader** sur Bunny Stream → `npm run upload`
3. **Déployer** la page → Vercel en 1 clic

Durée totale pour 300 vidéos : **½ journée de manipulation + 2-4h de transfert** selon ta bande passante.

---

## 📦 Étape 1 — Créer un compte Bunny Stream

1. Va sur [bunny.net](https://bunny.net) et crée un compte (14 jours gratuits, pas de CB)
2. Dashboard → **Stream** → **Add Video Library**
3. Nomme-la (ex. `temoignages-clients`), choisis les régions (Europe suffit en France)
4. Note ces 3 valeurs depuis la page de la library :
   - **Library ID** (ex. `12345`)
   - **API Key** (onglet *API*)
   - **CDN Hostname** (ex. `vz-xxxxx-xxx.b-cdn.net`)

---

## 🔑 Étape 2 — Authentification Frame.io

Frame.io V4 utilise OAuth 2.0 via Adobe IMS. Le plus simple pour un script perso :

**Méthode recommandée — via Postman (10 min)**

1. Va sur [developer.adobe.com/frameio](https://developer.adobe.com/frameio/guides/) et suis le guide "Getting Started"
2. Importe leur collection Postman officielle
3. Dans Postman → Authorization → clique sur **Get New Access Token**
4. Authentifie-toi avec ton compte Adobe/Frame.io
5. Copie le **Bearer token** généré — c'est ta valeur `FRAMEIO_TOKEN`

**Récupérer les IDs de ton compte :**

Dans Postman, lance la requête `GET /v4/me` → tu verras ta liste de comptes (`accounts`). Note le **ID du compte** qui contient tes vidéos.

Pour trouver le **project_id** :
- Soit via Postman : `GET /v4/accounts/{account_id}/workspaces` puis `GET /v4/accounts/{account_id}/workspaces/{workspace_id}/projects`
- Soit dans l'URL Frame.io quand tu es sur ton projet : `frame.io/projects/XXXXX` → XXXXX est le project_id

💡 **Alternative sans code** : l'app desktop [Frame.io Transfer](https://frame.io/apps) permet de télécharger un projet complet d'un clic. Si t'as pas envie de te prendre la tête avec l'OAuth, fais ça et saute à l'étape 4.

---

## 💾 Étape 3 — Installer + télécharger

```bash
# Installer les dépendances
npm install

# Copier et remplir le fichier d'environnement
cp .env.example .env
# Édite .env avec tes tokens Frame.io + credentials Bunny

# Télécharger les vidéos depuis Frame.io (dans ./videos/)
npm run download
```

Le script `download-from-frameio.mjs` :
- Parcourt récursivement tous les dossiers/sous-dossiers de ton projet
- Filtre uniquement les vidéos (mp4, mov, etc.)
- Télécharge 3 fichiers en parallèle avec reprise automatique si interrompu
- Skip les fichiers déjà téléchargés (même taille)
- Génère `frameio-metadata.json` avec toutes les infos (utile pour construire ton CSV)

---

## 📤 Étape 4 — Upload bulk vers Bunny

1. **(Recommandé)** Crée `videos.csv` à partir de `videos.csv.example` pour enrichir les métadonnées :

   ```csv
   filename,clientName,role,company,sector,year,tags
   sophie-lambert.mp4,Sophie Lambert,Fondatrice,Maison Laurent,E-commerce,2025,Success story|PME
   ```

   💡 Les tags peuvent être séparés par `|` ou `,`. Si tu ne mets pas de CSV, le script utilise le nom du fichier comme nom de client.

2. Lance l'upload :
   ```bash
   npm run upload
   ```

   Le script upload **4 vidéos en parallèle**, attend que chaque vidéo soit encodée par Bunny, et génère `data/manifest.json`. Pour 300 vidéos, compter 1-3h.

   ⚠️  **Si l'upload est interrompu**, relance simplement `npm run upload` : il skip les vidéos déjà dans le manifest.

---

## 👀 Étape 5 — Tester en local

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000). Tu dois voir :
- La grille de vidéos paginée
- Les filtres par secteur / année / tags en haut
- Un bouton **Mode présentation** qui bascule en plein écran
- Le modal player avec navigation clavier (← →)

---

## 🌍 Étape 6 — Déployer sur Vercel (gratuit)

1. Crée un compte sur [vercel.com](https://vercel.com) (lie-le à GitHub)
2. Push ce projet sur un repo (privé ou public)
3. Sur Vercel → **New Project** → importe ton repo
4. **Environment Variables** : ajoute uniquement les deux côté client :
   - `NEXT_PUBLIC_BUNNY_LIBRARY_ID`
   - `NEXT_PUBLIC_BUNNY_CDN_HOSTNAME`
   *(les tokens Frame.io et la clé Bunny côté serveur ne servent qu'aux scripts locaux)*
5. Deploy → URL type `temoignages-clients.vercel.app`
6. (Optionnel) Branche ton domaine perso dans **Settings → Domains**

---

## 🎬 Mode présentation — raccourcis clavier

| Touche | Action |
|--------|--------|
| **← →** | Vidéo précédente / suivante |
| **Espace** | Activer/désactiver l'enchaînement auto |
| **Esc** | Quitter le mode présentation |

L'enchaînement auto détecte la fin de chaque vidéo (via postMessage de l'iframe Bunny) et passe à la suivante. Parfait pour un showroom ou un écran en loop à ton stand.

💡 **Astuce** : filtre d'abord par tag (ex. "Success story" + "E-commerce") puis lance le mode présentation → seuls les témoignages filtrés seront enchaînés.

---

## ♻️ Ajouter de nouvelles vidéos plus tard

1. Pose les nouveaux fichiers dans `videos/` (ou relance `npm run download` si elles viennent de Frame.io)
2. Ajoute leurs lignes dans `videos.csv`
3. `npm run upload` (skip les anciennes, upload juste les nouvelles)
4. `git commit && git push` → Vercel redéploie automatiquement

---

## 💰 Coût réel

Pour 300 vidéos de ~2-3 min en 1080p :
- **Stockage Bunny** : ~20-30 GB → ~0,15 €/mois
- **Delivery** : ~0,01 $/GB. Si chaque vidéo est vue 100 fois/mois → 5-15 €/mois
- **Vercel** : gratuit (tier suffisant)

**Total réaliste : 5-20 €/mois.**

---

## 🔧 Structure du projet

```
temoignages-clients/
├── app/
│   ├── components/
│   │   ├── FilterBar.jsx          # Recherche + tags multi-select
│   │   ├── VideoGrid.jsx          # Grille de vignettes
│   │   ├── VideoModal.jsx         # Player modal avec nav clavier
│   │   ├── PresentationMode.jsx   # Plein écran + enchaînement auto
│   │   └── Pagination.jsx         # Pagination numérotée
│   ├── layout.jsx
│   ├── page.jsx                   # Page principale
│   └── globals.css
├── data/
│   └── manifest.json              # Généré par npm run upload
├── scripts/
│   ├── download-from-frameio.mjs  # Frame.io API → ./videos/
│   └── bulk-upload.mjs            # ./videos/ → Bunny Stream
├── videos/                        # Tes fichiers .mp4 (gitignored)
├── videos.csv                     # Métadonnées (gitignored)
└── .env                           # Variables d'env (gitignored)
```

---

## 🐛 Problèmes courants

**"Frame.io API returns 401 Unauthorized"**
→ Ton bearer token a expiré (durée de vie ~24h). Regénère-le via Postman.

**"Les thumbnails ne s'affichent pas"**
→ Bunny met 1-2 min à les générer après l'upload. Patiente, ou relance `npm run upload` pour refresh les durées.

**"Le mode présentation ne passe pas automatiquement à la vidéo suivante"**
→ L'autoplay de la prochaine vidéo dépend du navigateur. Certains navigateurs bloquent l'autoplay sans interaction utilisateur. Clique une fois sur la page avant de lancer le mode présentation. Sinon, utilise les flèches du clavier.

**"L'upload plante à mi-chemin"**
→ Relance `npm run upload`, il reprend là où il s'est arrêté.

**"Je veux changer le nombre de vidéos par page"**
→ Modifie `PAGE_SIZE` en haut de `app/page.jsx` (défaut : 24).

**"Je veux ajouter un 4ème type de filtre (ex. langue)"**
→ Dans `app/page.jsx`, ajoute la nouvelle catégorie dans `tagCatalog` (useMemo) et dans la fonction de filtrage. Puis passe-la à `<FilterBar>` via `tagCatalog.language`.

---

Besoin d'aide à une étape ? Dis-moi où tu bloques.
