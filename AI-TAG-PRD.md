# PRD - Sistema di Tagging Automatico per Immagini

**Versione:** 2.0  
**Data:** 4 Dicembre 2024  
**Autore:** Magno  
**Target:** Integrazione GitHub Actions

---

## 1. Panoramica del Progetto

### 1.1 Obiettivo
Integrare un sistema automatico di analisi e tagging delle immagini nel sito fotografico esistente basato su Jekyll e hostato su GitHub Pages. Il sistema utilizza le API di Anthropic (Claude) per estrarre metadati semantici dalle immagini e organizzarli in formato JSON strutturato.

### 1.2 Caso d'Uso Principale
Il sistema permetterà di:
- Analizzare automaticamente le fotografie caricate nel repository GitHub
- Estrarre metadati fotografici professionali (tipo di scatto, composizione, lighting)
- Rilevare oggetti, persone, colori e scene
- Mantenere un database JSON centralizzato per cartella di immagini
- Processing incrementale: analizza solo nuove immagini

### 1.3 Contesto Tecnico
- **Hosting:** GitHub Pages
- **Repository:** https://github.com/your-username/photos
- **CMS:** Jekyll (generatore di siti statici)
- **Automation:** GitHub Actions (workflow automatico)
- **AI Provider:** Anthropic Claude API
- **Modello:** claude-haiku-4-5-20251001 (veloce ed economico)
- **Volume iniziale:** ~150-200 immagini già presenti
- **Volume incrementale:** 20-30 immagini per batch
- **Struttura cartelle:** `/img/YYYY-MM-Descrizione/` (es. `/img/2024-08-Sardegna/`)

### 1.4 Script Esistente
È già disponibile uno script Python funzionante (`tag_photos.py`) che:
- ✅ Si connette alle API Anthropic
- ✅ Analizza immagini JPG, JPEG, PNG, WebP
- ✅ Genera JSON con metadati fotografici professionali
- ✅ Salva incrementalmente (non ri-processa foto esistenti)
- ✅ Gestisce errori API e rate limiting
- ✅ Usa variabili d'ambiente per API key

**Obiettivo di questo PRD:** Integrare questo script in un workflow GitHub Actions automatico.

---

## 2. Strategia di Implementazione

### 2.1 Branch Strategy - CONSIGLIATA ✅

**Usa un branch dedicato: `feature/ai-tagging`**

#### Vantaggi:
✅ **Test sicuro** - testi senza toccare production (main)  
✅ **Rollback facile** - se qualcosa va storto, main è intatto  
✅ **Review del codice** - puoi fare PR e verificare prima del merge  
✅ **GitHub Actions funziona** - actions possono girare su branch specifici  
✅ **Costi sotto controllo** - testi prima con poche cartelle  
✅ **Zero breaking changes** - il sito continua a funzionare

#### Workflow Raccomandato:
```bash
# 1. Crea branch dal main attuale
git checkout main
git pull origin main
git checkout -b feature/ai-tagging

# 2. Aggiungi i file necessari (vedi sezione 4)
mkdir -p .github/workflows scripts
# Crea i file workflow e script

# 3. Aggiungi API key a GitHub Secrets
# Settings → Secrets → New repository secret
# Name: ANTHROPIC_API_KEY
# Value: sk-ant-api03-...

# 4. Commit e push del setup
git add .github/ scripts/
git commit -m "Add AI tagging workflow and script"
git push origin feature/ai-tagging

# 5. Test con una cartella specifica
# Il workflow NON parte automaticamente ancora
# Triggera manualmente da GitHub → Actions → Run workflow

# 6. Verifica risultati
# Controlla che metadata.json venga creato correttamente

# 7. Quando sei sicuro, merge in main
git checkout main
git merge feature/ai-tagging
git push origin main
```

### 2.2 Comportamento Post-Merge

**Dopo il merge in main:**
- Il workflow si attiverà SOLO quando pusherai nuove immagini
- Script analizzerà SOLO cartelle senza metadata.json
- Nessun re-processing di foto già analizzate
- Commit automatico dei nuovi metadata.json

### 2.3 File da Creare

Dovrai creare questi file nella repo:

```
your-photo-site/
├── .github/
│   └── workflows/
│       └── tag-photos.yml          # ← NUOVO: GitHub Action workflow
├── scripts/
│   ├── tag_photos.py               # ← NUOVO: Il tuo script (già funzionante)
│   └── requirements.txt            # ← NUOVO: Dipendenze Python
├── .env.example                     # ← NUOVO: Template per variabili ambiente
├── img/                             # ← ESISTENTE
├── _config.yml                      # ← ESISTENTE
└── index.html                       # ← ESISTENTE
```

---

## 3. Requisiti Funzionali

### 3.1 GitHub Actions Workflow

**RF-001: Trigger Automatico**
- Il workflow si attiva automaticamente quando vengono pushate nuove immagini
- Path trigger: `img/**/*.{jpg,jpeg,JPG,JPEG,png,PNG,webp,WEBP}`
- Branch: `main` (dopo il merge)
- Opzione di trigger manuale (`workflow_dispatch`)

**RF-002: Analisi Incrementale Intelligente**
- Lo script controlla se ogni immagine è già presente nel `metadata.json`
- Analizza SOLO le nuove immagini non ancora processate
- Salva incrementalmente dopo ogni immagine (non perde dati in caso di errore)
- Preserva metadata esistenti

**RF-003: Gestione API Anthropic**
- API Key memorizzata nei GitHub Secrets
- Model: `claude-haiku-4-5-20251001` (veloce ed economico: ~$0.001 per immagine)
- Timeout per chiamata: 30 secondi
- Rate limiting: sleep di 1 secondo tra chiamate
- Gestione errori con try/catch

**RF-004: Output JSON Strutturato**

Il sistema genera un file `metadata.json` per ogni cartella con questa struttura:

```json
{
  "foto1.jpg": {
    "photography": {
      "shot_type": "wide shot",
      "orientation": "landscape",
      "lighting": "golden hour",
      "composition": "rule of thirds",
      "subject_focus": "scenery",
      "style": "landscape"
    },
    "objects": [
      {
        "name": "sea",
        "confidence": 95,
        "position": "foreground"
      },
      {
        "name": "sky",
        "confidence": 98,
        "position": "background"
      },
      {
        "name": "rocks",
        "confidence": 87,
        "position": "middle ground"
      }
    ],
    "people": {
      "count": 0,
      "attributes": []
    },
    "colors": [
      {
        "hex": "#FF6B35",
        "percentage": 35
      },
      {
        "hex": "#004E89",
        "percentage": 45
      },
      {
        "hex": "#F7931E",
        "percentage": 20
      }
    ],
    "scene": {
      "type": "outdoor",
      "description": "Sunset beach scene with rocky coastline"
    }
  },
  "foto2.jpg": {
    ...
  }
}
```

**Caratteristiche del JSON:**
- **photography**: Metadati fotografici professionali
  - `shot_type`: close-up, medium shot, wide shot, macro, aerial, etc.
  - `orientation`: landscape, portrait, square
  - `lighting`: natural, artificial, golden hour, backlit, etc.
  - `composition`: rule of thirds, centered, symmetry, leading lines
  - `subject_focus`: single subject, group, crowd, scenery, object
  - `style`: portrait, landscape, street, architectural, abstract, documentary

- **objects**: Array di oggetti rilevati con confidence 0-100
- **people**: Conteggio generico (NO identificazione facciale)
- **colors**: 3-5 colori dominanti in HEX con percentuale
- **scene**: Tipo e descrizione della scena

**RF-005: Commit Automatico**
- Il workflow committa automaticamente i file `metadata.json` aggiornati
- Commit message: `🤖 Auto-generated photo metadata`
- User: `github-actions[bot]`
- Push automatico su branch corrente

**RF-006: Formati Immagine Supportati**
- JPG / JPEG
- PNG
- WebP
- Case-insensitive (jpg, JPG, Jpg tutti supportati)

---

## 4. Architettura Tecnica

### 4.1 Struttura File della Repository

```
your-photo-site/
├── .github/
│   └── workflows/
│       └── tag-photos.yml          # ← NUOVO: GitHub Action workflow
├── scripts/
│   ├── tag_photos.py               # ← NUOVO: Script Python (quello che hai già)
│   └── requirements.txt            # ← NUOVO: Dipendenze
├── img/                             # ← ESISTENTE
│   ├── 2024-08-Sardegna/
│   │   ├── R0000270.JPG
│   │   ├── R0000245.PNG
│   │   └── metadata.json           # ← Generato automaticamente
│   ├── 2025-06-Milano/
│   │   ├── R0002013.JPG
│   │   └── metadata.json
│   └── ...
├── .env.example                     # ← NUOVO: Template variabili ambiente
├── .gitignore                       # ← ESISTENTE (aggiornare)
├── _config.yml                      # ← ESISTENTE
├── index.html                       # ← ESISTENTE
└── README.md                        # ← ESISTENTE (aggiornare)
```

### 4.2 GitHub Actions Workflow

**File: `.github/workflows/tag-photos.yml`**

```yaml
name: Auto Tag Photos with AI

on:
  push:
    branches:
      - main
    paths:
      - 'img/**/*.jpg'
      - 'img/**/*.jpeg'
      - 'img/**/*.JPG'
      - 'img/**/*.JPEG'
      - 'img/**/*.png'
      - 'img/**/*.PNG'
      - 'img/**/*.webp'
      - 'img/**/*.WEBP'
  
  workflow_dispatch:  # Permette trigger manuale da GitHub UI

jobs:
  tag-photos:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          pip install --upgrade pip
          pip install -r scripts/requirements.txt
      
      - name: Run photo tagging script
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          ANTHROPIC_MODEL: claude-haiku-4-5-20251001
        run: |
          python scripts/tag_photos.py
      
      - name: Check for changes
        id: verify_diff
        run: |
          git diff --quiet . || echo "changed=true" >> $GITHUB_OUTPUT
      
      - name: Commit and push metadata
        if: steps.verify_diff.outputs.changed == 'true'
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add img/**/metadata.json
          git commit -m "🤖 Auto-generated photo metadata"
          git push
      
      - name: Summary
        if: always()
        run: |
          echo "### AI Tagging Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **Branch:** \`${{ github.ref_name }}\`" >> $GITHUB_STEP_SUMMARY
          echo "- **Commit:** \`${{ github.sha }}\`" >> $GITHUB_STEP_SUMMARY
          echo "- **Changes:** ${{ steps.verify_diff.outputs.changed || 'No new images processed' }}" >> $GITHUB_STEP_SUMMARY
```

### 4.3 Script Python (Già Funzionante)

**File: `scripts/tag_photos.py`**

Il tuo script attuale è già ottimale. Non serve modificarlo. Ecco cosa fa:

```python
# Funzionalità chiave:
# 1. Carica API key da variabile d'ambiente
# 2. Scansiona ricorsivamente la cartella img/
# 3. Per ogni cartella:
#    - Legge metadata.json esistente (se c'è)
#    - Identifica immagini non ancora processate
#    - Analizza solo le nuove immagini
#    - Aggiorna metadata.json incrementalmente
# 4. Salva dopo ogni immagine (non perde dati)
# 5. Progress bar con tqdm
# 6. Gestione errori robusta
```

**Unica modifica necessaria:** Nessuna! Lo script è perfetto così.

### 4.4 File di Dipendenze

**File: `scripts/requirements.txt`**

```txt
anthropic==0.39.0
python-dotenv==1.0.0
tqdm==4.66.1
```

**Note:**
- `anthropic`: SDK ufficiale Anthropic
- `python-dotenv`: Per caricare variabili da .env (opzionale, ma comodo per test locali)
- `tqdm`: Progress bar (già nel tuo script)

### 4.5 Template Variabili d'Ambiente

**File: `.env.example`**

```bash
# Anthropic API Configuration
ANTHROPIC_API_KEY=your-api-key-here
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# Note: Never commit the actual .env file!
# Copy this file to .env and add your real API key for local testing
```

### 4.6 Aggiornamento .gitignore

**Aggiungi a `.gitignore`:**

```gitignore
# Environment variables
.env

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python

# Virtual environments
venv/
env/
ENV/

# IDE
.vscode/
.idea/
```

---

## 5. Guida all'Implementazione Step-by-Step

### 5.1 Setup Iniziale (Una Tantum)

#### Step 1: Aggiungi API Key a GitHub Secrets ✅

1. Vai su GitHub → La tua repository
2. Click su **Settings** (in alto a destra)
3. Nel menu laterale: **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Compila:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Secret:** `sk-ant-api03-...` (la tua API key)
6. Click **Add secret**

**✓ Verifica:** Dovresti vedere `ANTHROPIC_API_KEY` nella lista dei secrets

---

#### Step 2: Crea Branch Feature ✅

```bash
# Assicurati di essere su main aggiornato
git checkout main
git pull origin main

# Crea e switcha sul nuovo branch
git checkout -b feature/ai-tagging
```

---

#### Step 3: Crea Struttura File ✅

```bash
# Crea le directory necessarie
mkdir -p .github/workflows
mkdir -p scripts

# Verifica struttura
tree -L 2 .github scripts
```

Dovresti vedere:
```
.github/
└── workflows/
scripts/
```

---

#### Step 4: Crea i File Necessari ✅

**A. File `.github/workflows/tag-photos.yml`**

Crea questo file con il contenuto della sezione 4.2 del PRD.

**B. File `scripts/tag_photos.py`**

Copia il TUO script esistente (quello che già funziona) in questo file.

**C. File `scripts/requirements.txt`**

```txt
anthropic==0.39.0
python-dotenv==1.0.0
tqdm==4.66.1
```

**D. File `.env.example`** (opzionale, ma consigliato)

```bash
ANTHROPIC_API_KEY=your-api-key-here
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

**E. Aggiorna `.gitignore`**

Aggiungi queste righe:
```gitignore
# Environment variables
.env

# Python
__pycache__/
*.pyc
venv/
```

---

#### Step 5: Commit e Push Setup ✅

```bash
# Verifica i file creati
git status

# Aggiungi tutto
git add .github/ scripts/ .env.example .gitignore

# Commit
git commit -m "Setup AI tagging infrastructure

- Add GitHub Actions workflow
- Add tag_photos.py script
- Add Python dependencies
- Configure environment variables"

# Push del branch
git push origin feature/ai-tagging
```

---

### 5.2 Test del Workflow (Prima di Merge)

#### Test 1: Trigger Manuale su Branch Feature ✅

1. Vai su GitHub → La tua repo
2. Click su **Actions** (tab in alto)
3. Nella sidebar sinistra: click su **Auto Tag Photos with AI**
4. Click sul pulsante **Run workflow** (in alto a destra)
5. Seleziona branch: `feature/ai-tagging`
6. Click **Run workflow** (verde)

**Cosa succede:**
- Il workflow parte immediatamente
- Analizza TUTTE le cartelle in `img/` che non hanno `metadata.json`
- Genera i file `metadata.json`
- Committa automaticamente

**✓ Verifica:**
- Vai su **Actions** → Seleziona il run appena partito
- Osserva i logs in tempo reale
- Quando finisce, torna su **Code** → branch `feature/ai-tagging`
- Dovresti vedere un nuovo commit: `🤖 Auto-generated photo metadata`
- Entra in una cartella tipo `img/2024-08-Sardegna/`
- Dovresti vedere il file `metadata.json`

#### Test 2: Test Incrementale ✅

Per verificare che analizzi solo nuove foto:

```bash
# Sul tuo computer, sul branch feature/ai-tagging
git pull origin feature/ai-tagging

# Aggiungi UNA nuova foto in una cartella esistente
cp ~/Downloads/test-foto.jpg img/2024-08-Sardegna/nuova-foto.jpg

# Commit e push
git add img/2024-08-Sardegna/nuova-foto.jpg
git commit -m "Add test photo"
git push origin feature/ai-tagging
```

**Cosa succede:**
- Il workflow parte automaticamente (trigger su push di immagini)
- Analizza SOLO `nuova-foto.jpg` (skippa le altre già nel metadata.json)
- Aggiorna il `metadata.json` esistente aggiungendo la nuova foto

**✓ Verifica:**
- Vai su **Actions** → Dovresti vedere un nuovo run partito automaticamente
- Quando finisce, pull i cambiamenti:
  ```bash
  git pull origin feature/ai-tagging
  ```
- Apri `img/2024-08-Sardegna/metadata.json`
- Dovresti vedere `nuova-foto.jpg` aggiunta al JSON

---

### 5.3 Merge in Main (Quando Sei Soddisfatto) ✅

```bash
# Switcha su main
git checkout main
git pull origin main

# Merge del branch feature
git merge feature/ai-tagging

# Push su main
git push origin main
```

**Cosa succede dopo il merge:**
- Il workflow è ora attivo su `main`
- Ogni volta che pushes nuove foto, il workflow parte automaticamente
- I metadata.json vengono generati e committati automaticamente

---

### 5.4 Workflow Quotidiano (Post-Merge)

Da ora in poi, il tuo workflow sarà:

```bash
# 1. Aggiungi nuove foto
mkdir img/2025-01-Roma
cp ~/Photos/Roma/*.jpg img/2025-01-Roma/

# 2. Commit e push
git add img/2025-01-Roma/
git commit -m "Add Rome photos Jan 2025"
git push origin main

# 3. Aspetta 2-3 minuti
# GitHub Action analizza automaticamente le foto

# 4. Pull i metadata generati
git pull origin main

# 5. Fine! 🎉
```

---

### 5.5 Checklist di Validazione Pre-Merge

Prima di fare merge in `main`, verifica che:

- [ ] **GitHub Action si attiva correttamente**
  - Su push di immagini
  - Trigger manuale funziona

- [ ] **API key funziona**
  - Nei logs vedi `ANTHROPIC_API_KEY: ***` (asterischi = OK)
  - Nessun errore di autenticazione

- [ ] **Script processa correttamente**
  - Analizza solo cartelle/immagini nuove
  - Non riprocessa foto già analizzate
  - Salva `metadata.json` con struttura corretta

- [ ] **Commit automatico funziona**
  - Vedi commit `🤖 Auto-generated photo metadata`
  - User è `github-actions[bot]`

- [ ] **Jekyll non ha problemi**
  - Il sito si builda correttamente
  - I file JSON non causano errori
  - Il sito è visibile su GitHub Pages

- [ ] **Costi sotto controllo**
  - Verifica quante foto hai processato
  - Calcola costo stimato: ~$0.001 × numero_foto
  - Esempio: 200 foto = ~$0.20

---

### 5.6 Test Locale (Opzionale)

Se vuoi testare lo script localmente prima di pushare:

```bash
# Crea virtual environment
python3 -m venv venv
source venv/bin/activate  # Su Windows: venv\Scripts\activate

# Installa dipendenze
pip install -r scripts/requirements.txt

# Crea file .env (copia da .env.example)
cp .env.example .env

# Edita .env e aggiungi la tua API key
nano .env  # o usa il tuo editor preferito

# Esegui script in locale
python scripts/tag_photos.py

# Verifica risultati
cat img/2024-08-Sardegna/metadata.json
```

**Vantaggi del test locale:**
- Vedi errori subito
- Non consumi minuti di GitHub Actions
- Puoi debuggare facilmente

**Svantaggi:**
- Devi installare Python e dipendenze
- Devi gestire .env manualmente

---

## 6. Gestione Costi e Performance

### 6.1 Pricing Model Utilizzato

**Claude Haiku 4.5 (claude-haiku-4-5-20251001):**
- **Input:** $1.00 per 1M tokens (~$0.001 per 1K tokens)
- **Output:** $5.00 per 1M tokens (~$0.005 per 1K tokens)
- **Velocità:** ~3-5 secondi per immagine
- **Qualità:** Alta accuratezza per photo tagging

**Stima Token per Immagine:**
- Input: ~1500-2000 tokens (immagine) + ~500 tokens (prompt)
- Output: ~300-500 tokens (JSON response)

**Costo Stimato per Immagine:**
- Input: (2000 tokens × $0.001) = $0.002
- Output: (400 tokens × $0.005) = $0.002
- **Totale: ~$0.004 per immagine**

### 6.2 Scenari di Costo

| Scenario | Numero Foto | Costo Stimato | Tempo Stimato |
|----------|-------------|---------------|---------------|
| **Setup iniziale** | 150-200 | $0.60-0.80 | 10-15 min |
| **Batch settimanale** | 20-30 | $0.08-0.12 | 2-3 min |
| **Batch mensile** | 80-100 | $0.32-0.40 | 7-10 min |
| **Album grande** | 500 | $2.00 | 30-40 min |

### 6.3 Controllo Costi Implementato

**Nel Script:**
- ✅ Processing incrementale (solo nuove foto)
- ✅ Skip automatico di foto già analizzate
- ✅ Nessun re-processing
- ✅ Rate limiting (1 secondo tra chiamate)
- ✅ Salvataggio incrementale (non perde dati)

**Best Practices:**
1. **Non eliminare mai metadata.json** - altrimenti riprocessa tutto
2. **Organizza per cartelle** - 20-50 foto per cartella è ottimale
3. **Testa con poche foto prima** - usa trigger manuale su branch feature
4. **Monitora GitHub Actions** - vedi quante foto vengono processate

### 6.4 Confronto Modelli

| Modello | Costo/Immagine | Velocità | Qualità |
|---------|----------------|----------|---------|
| **Haiku 4.5** | **~$0.004** | **Veloce** | **Alta** ✅ |
| Sonnet 3.5 | ~$0.015 | Medio | Molto Alta |
| Opus 4 | ~$0.075 | Lento | Massima |

**Raccomandazione:** Haiku 4.5 è perfetto per questo use case.

### 6.5 Ottimizzazioni Future

**Già Implementate:**
- ✅ Caching implicito (non riprocessa)
- ✅ Batch processing efficiente
- ✅ Error handling robusto

**Possibili Miglioramenti:**
- [ ] Compressione immagini prima dell'upload (riduce token input)
- [ ] Batch API calls (più foto in una chiamata)
- [ ] Cache esplicita per foto duplicate (hash MD5)
- [ ] Parallel processing (più cartelle in parallelo)

### 6.6 Monitoring

**Monitorare Questi Parametri:**

1. **GitHub Actions Usage**
   - Settings → Billing → Actions minutes used
   - Free tier: 2000 minuti/mese (più che sufficiente)

2. **Anthropic API Usage**
   - Dashboard Anthropic → Usage
   - Monitor token consumption e costi

3. **Repository Size**
   - I file metadata.json sono piccoli (~2-5 KB ciascuno)
   - 1000 foto = ~2-5 MB di JSON (trascurabile)

---

## 7. Integrazione Futura con Jekyll (Opzionale)

### 7.1 Fase Attuale ✅

**Status Quo:**
- ✅ File `metadata.json` generati e presenti nella repo
- ✅ Jekyll ignora i file JSON (non interferiscono)
- ✅ Sito funziona esattamente come prima
- ✅ Metadata pronti per uso futuro

**Nessuna modifica richiesta al sito.**

### 7.2 Fase 2: Integrazione Base (Futura)

Quando vorrai usare i metadata nel sito, ecco come procedere.

#### A. Leggere Metadata in Jekyll

Jekyll può leggere file JSON come data files. Copia i metadata.json in `_data/`:

```bash
# Script per copiare metadata in _data/
mkdir -p _data/photos
find img -name "metadata.json" -exec cp {} _data/photos/{}-metadata.json \;
```

Oppure, leggi direttamente con plugin Jekyll:

```liquid
{% raw %}
{% comment %} In _plugins/metadata_reader.rb {% endcomment %}
module Jekyll
  class MetadataReader < Generator
    def generate(site)
      # Leggi tutti i metadata.json e caricali in site.data
    end
  end
end
{% endraw %}
```

#### B. Mostrare Tag nelle Card delle Foto

**Modifica a `index.html`:**

```liquid
{% raw %}
{% for image_data in final_images %}
  {% assign image_parts = image_data | split: '|' %}
  {% assign image_path = image_parts[0] %}
  {% assign folder_name = image_parts[1] %}
  
  {% comment %} Carica metadata se esiste {% endcomment %}
  {% assign metadata_path = 'img/' | append: folder_name | append: '/metadata.json' %}
  {% assign metadata_file = site.static_files | where: "path", metadata_path | first %}
  
  <div class="gallery-item" data-category="{{ folder_name }}">
    <img src="{{ image_path | relative_url }}" alt="{{ folder_name }}">
    
    {% if metadata_file %}
      <div class="image-metadata">
        {% comment %} Mostra photography style {% endcomment %}
        <span class="photo-style">{{ metadata.photography.style }}</span>
        
        {% comment %} Mostra scene type {% endcomment %}
        <span class="scene-type">{{ metadata.scene.type }}</span>
      </div>
    {% endif %}
  </div>
{% endfor %}
{% endraw %}
```

#### C. Filtri Avanzati per Tag

**Aggiungi filtri oltre alle location:**

```html
<div class="filters-container">
  <!-- Location filters (già esistenti) -->
  <div class="location-filters">
    <button class="filter active" data-filter="all">All</button>
    <button class="filter" data-filter="Sardegna">Sardegna</button>
    <!-- ... -->
  </div>
  
  <!-- NEW: Photography style filters -->
  <div class="style-filters">
    <button class="filter" data-style="landscape">Landscape</button>
    <button class="filter" data-style="portrait">Portrait</button>
    <button class="filter" data-style="street">Street</button>
    <button class="filter" data-style="architectural">Architectural</button>
  </div>
  
  <!-- NEW: Scene filters -->
  <div class="scene-filters">
    <button class="filter" data-scene="outdoor">Outdoor</button>
    <button class="filter" data-scene="indoor">Indoor</button>
    <button class="filter" data-scene="urban">Urban</button>
    <button class="filter" data-scene="nature">Nature</button>
  </div>
</div>
```

**JavaScript per filtering:**

```javascript
// In assets/js/main.js
function filterByStyle(style) {
  allImagesData.forEach(img => {
    const metadata = img.metadata; // Assume metadata loaded
    
    if (style === 'all' || metadata.photography.style === style) {
      img.element.style.display = '';
    } else {
      img.element.style.display = 'none';
    }
  });
  
  layoutAllGrids();
}

// Attach to buttons
document.querySelectorAll('[data-style]').forEach(btn => {
  btn.addEventListener('click', () => {
    filterByStyle(btn.dataset.style);
  });
});
```

### 7.3 Funzionalità Avanzate (Future)

#### A. Search Semantica

```html
<input type="text" id="photoSearch" placeholder="Search photos...">

<script>
// Search in objects, scene descriptions, photography style
function searchPhotos(query) {
  query = query.toLowerCase();
  
  allImagesData.forEach(img => {
    const meta = img.metadata;
    const searchableText = [
      meta.photography.style,
      meta.photography.lighting,
      meta.scene.description,
      ...meta.objects.map(o => o.name)
    ].join(' ').toLowerCase();
    
    if (searchableText.includes(query)) {
      img.element.style.display = '';
    } else {
      img.element.style.display = 'none';
    }
  });
}
</script>
```

#### B. Color Palette Visualization

```html
<div class="image-card">
  <img src="photo.jpg">
  
  <!-- Color palette from metadata -->
  <div class="color-palette">
{% raw %}
    {% for color in metadata.colors %}
      <div class="color-swatch" 
           style="background: {{ color.hex }}; 
                  width: {{ color.percentage }}%">
      </div>
    {% endfor %}
{% endraw %}
  </div>
</div>
```

#### C. "Similar Photos" Widget

```javascript
function findSimilarPhotos(currentPhoto) {
  const currentMeta = currentPhoto.metadata;
  
  // Match by photography style
  const sameSt yle = allImagesData.filter(img => 
    img.metadata.photography.style === currentMeta.photography.style
  );
  
  // Match by dominant color
  const sameColor = allImagesData.filter(img => {
    const colors1 = currentMeta.colors.map(c => c.hex);
    const colors2 = img.metadata.colors.map(c => c.hex);
    return colors1.some(c => colors2.includes(c));
  });
  
  // Combine and rank
  return [...sameSt yle, ...sameColor].slice(0, 6);
}
```

#### D. Gallerie Tematiche Automatiche

```liquid
{% raw %}
{% comment %} Automatic "Sunset" gallery {% endcomment %}
{% for image in site.data.photos %}
  {% if image.metadata.photography.lighting == "golden hour" %}
    <div class="sunset-gallery-item">
      <img src="{{ image.path }}">
    </div>
  {% endif %}
{% endfor %}
{% endraw %}
```

### 7.4 Esempio Completo: Page "All Landscapes"

**File: `landscapes.html`**

```liquid
---
layout: default
title: Landscape Photography
---

<div class="page-header">
  <h1>Landscape Photography</h1>
  <p>A curated collection of landscape shots</p>
</div>

<div class="masonry-grid">
{% raw %}
  {% for folder in site.static_files %}
    {% if folder.path contains '/img/' and folder.path contains 'metadata.json' %}
      {% comment %} Load and parse metadata {% endcomment %}
      {% assign metadata = folder.content | jsonify %}
      
      {% for filename, meta in metadata %}
        {% if meta.photography.style == "landscape" %}
          <div class="gallery-item">
            <img src="/img/{{ folder.parent }}/{{ filename }}" 
                 alt="{{ meta.scene.description }}">
            
            <div class="photo-info">
              <span class="lighting">{{ meta.photography.lighting }}</span>
              <span class="scene">{{ meta.scene.description }}</span>
            </div>
          </div>
        {% endif %}
      {% endfor %}
    {% endif %}
  {% endfor %}
{% endraw %}
</div>
```

### 7.5 Performance Considerations

**Loading Metadata:**
- Metadata.json files sono piccoli (2-5 KB ciascuno)
- Jekyll può leggerli al build time (no impact su runtime)
- Per siti molto grandi (1000+ foto), considera lazy loading

**Best Practices:**
1. Carica metadata solo per foto visibili
2. Cache metadata parsed in JavaScript
3. Usa JSON.parse() invece di eval()
4. Minifica metadata se necessario

### 7.6 Priorità di Implementazione

**Quick Wins (1-2 ore):**
1. Mostra photography style nei hover delle card
2. Aggiungi scene type come sottotitolo
3. Color palette visualization

**Medium Effort (1 giorno):**
4. Filtri per photography style
5. Filtri per scene type
6. Search bar semantica

**Advanced (2-3 giorni):**
7. Similar photos widget
8. Automatic themed galleries
9. Stats dashboard (most common styles, colors, etc.)

---

## 8. Troubleshooting

### 8.1 Problemi Comuni e Soluzioni

#### Problema 1: GitHub Action Non Parte

**Sintomo:**
Push di nuove foto ma l'Action non si attiva.

**Possibili Cause & Soluzioni:**

1. **Path non corrisponde**
   ```yaml
   # Verifica che l'estensione sia inclusa nei trigger
   on:
     push:
       paths:
         - 'img/**/*.jpg'   # Case sensitive!
         - 'img/**/*.JPG'   # Aggiungi entrambe le varianti
   ```

2. **Branch non configurato**
   ```yaml
   # Assicurati che il branch sia elencato
   on:
     push:
       branches:
         - main  # o il nome del tuo branch
   ```

3. **Workflow disabilitato**
   - Vai su Actions → Seleziona il workflow
   - Verifica che non sia disabilitato
   - Click "Enable workflow" se necessario

**✓ Come Verificare:**
```bash
# Forza trigger manuale
# GitHub → Actions → Auto Tag Photos → Run workflow
```

---

#### Problema 2: API Key Non Funziona

**Sintomo:**
Errore nei logs: `ANTHROPIC_API_KEY environment variable not set` o `Authentication error`

**Soluzioni:**

1. **Verifica che il Secret esista**
   - Settings → Secrets and variables → Actions
   - Deve esserci `ANTHROPIC_API_KEY` nella lista

2. **Formato Secret errato**
   - Il nome deve essere ESATTAMENTE `ANTHROPIC_API_KEY`
   - Il value deve iniziare con `sk-ant-api03-`
   - NON aggiungere spazi o virgolette

3. **Verifica nel workflow**
   ```yaml
   env:
     ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
   ```

**✓ Come Verificare:**
Nei logs di GitHub Actions dovresti vedere:
```
Run python scripts/tag_photos.py
  env:
    ANTHROPIC_API_KEY: ***  # Asterischi = OK!
```

---

#### Problema 3: Script Fallisce con JSON Error

**Sintomo:**
```
JSON Error for image.jpg: Could not parse response
Response was: ```json {... }```
```

**Causa:**
Claude risponde con markdown code blocks invece di JSON puro.

**Soluzione:**
Il tuo script già gestisce questo caso:
```python
# Pulizia automatica dei backticks
if "```json" in response_text:
    response_text = response_text.split("```json")[1].split("```")[0].strip()
```

Se continua a dare errore:
1. Verifica che il prompt sia quello corretto (sezione 4.3)
2. Aggiungi più esempi nel prompt
3. Aumenta `temperature` da 0 a 0.1

---

#### Problema 4: Metadata.json Non Viene Committato

**Sintomo:**
Lo script gira ma non vedi il commit automatico.

**Possibili Cause:**

1. **Nessun metadata generato**
   - Verifica nei logs se le analisi hanno successo
   - Cerca errori API nelle righe precedenti

2. **Step "Check for changes" fallisce**
   ```yaml
   # Verifica questo step nei logs
   - name: Check for changes
     id: verify_diff
     run: |
       git diff --quiet . || echo "changed=true" >> $GITHUB_OUTPUT
   ```

3. **Git config non corretto**
   ```yaml
   - name: Commit and push metadata
     run: |
       git config --local user.email "github-actions[bot]@users.noreply.github.com"
       git config --local user.name "github-actions[bot]"
       git add img/**/metadata.json
       git commit -m "🤖 Auto-generated photo metadata"
       git push
   ```

**✓ Come Verificare:**
Nei logs, cerca la sezione "Commit and push metadata". Dovresti vedere:
```
[feature/ai-tagging abc1234] 🤖 Auto-generated photo metadata
 1 file changed, 50 insertions(+)
```

---

#### Problema 5: Script Riprocessa Foto Già Analizzate

**Sintomo:**
Ogni run analizza tutte le foto, non solo le nuove.

**Causa:**
Il file `metadata.json` non viene letto correttamente o ha formato errato.

**Soluzione:**

1. **Verifica formato JSON**
   ```bash
   # Il metadata.json deve essere un oggetto con filename come chiavi
   cat img/2024-08-Sardegna/metadata.json
   ```
   
   Deve essere così:
   ```json
   {
     "foto1.jpg": { ... },
     "foto2.jpg": { ... }
   }
   ```
   
   NON così:
   ```json
   {
     "folder": "...",
     "images": [ ... ]  # ← Formato errato!
   }
   ```

2. **Se hai metadata in formato vecchio:**
   Converti con questo script:
   ```python
   import json
   
   # Leggi vecchio formato
   with open('metadata.json', 'r') as f:
       old = json.load(f)
   
   # Converti a nuovo formato
   new = {}
   for img in old['images']:
       filename = img.pop('filename')
       new[filename] = img
   
   # Salva
   with open('metadata.json', 'w') as f:
       json.dump(new, f, indent=2)
   ```

---

#### Problema 6: Timeout dell'Action

**Sintomo:**
Action viene cancellata dopo 6 ore o va in timeout.

**Causa:**
Troppe foto da processare in un singolo run.

**Soluzione:**

1. **Limita foto per cartella**
   Il tuo script non ha un limite hard-coded. Aggiungilo se necessario:
   ```python
   images_to_process = images_to_process[:50]  # Max 50 per run
   ```

2. **Aumenta timeout del job** (se necessario)
   ```yaml
   jobs:
     tag-photos:
       timeout-minutes: 60  # Default è 360 (6 ore)
   ```

3. **Processa cartelle in batch**
   Invece di tutte insieme, processa 2-3 cartelle per volta.

---

#### Problema 7: Rate Limiting di Anthropic

**Sintomo:**
```
APIError: rate_limit_error: Too many requests
```

**Soluzione:**

Il tuo script già ha `time.sleep(1)` dopo ogni immagine. Se necessario:

1. **Aumenta il delay**
   ```python
   time.sleep(2)  # Invece di 1
   ```

2. **Implementa exponential backoff**
   ```python
   import time
   
   def analyze_with_retry(image_path, max_retries=3):
       for i in range(max_retries):
           try:
               return analyze_image(client, image_path)
           except APIError as e:
               if 'rate_limit' in str(e):
                   wait = 2 ** i  # 1s, 2s, 4s
                   print(f"Rate limited. Waiting {wait}s...")
                   time.sleep(wait)
               else:
                   raise
       return None
   ```

---

#### Problema 8: Jekyll Build Fallisce

**Sintomo:**
GitHub Pages build fallisce dopo aver aggiunto metadata.json.

**Causa:**
Jekyll prova a processare i file JSON come template.

**Soluzione:**

Aggiungi a `_config.yml`:
```yaml
exclude:
  - img/**/metadata.json
  
# Oppure più generale:
keep_files:
  - img/
```

---

### 8.2 Debug Checklist

Quando qualcosa non funziona, segui questa checklist:

1. [ ] **Verifica GitHub Actions logs**
   - Actions → Seleziona il run → Espandi ogni step
   - Cerca errori in rosso

2. [ ] **Verifica API key**
   - Settings → Secrets → ANTHROPIC_API_KEY esiste?
   - Nei logs vedi `ANTHROPIC_API_KEY: ***`?

3. [ ] **Verifica file structure**
   ```bash
   ls -la .github/workflows/
   ls -la scripts/
   ```

4. [ ] **Test locale**
   ```bash
   python scripts/tag_photos.py
   ```

5. [ ] **Verifica format metadata.json**
   ```bash
   cat img/folder/metadata.json | python -m json.tool
   ```

6. [ ] **Verifica permessi GitHub**
   - Settings → Actions → General
   - "Workflow permissions" deve essere "Read and write"

---

### 8.3 Comandi Utili per Debug

```bash
# Vedi status git
git status

# Vedi diff dei metadata
git diff img/**/metadata.json

# Verifica JSON valido
python -m json.tool < img/folder/metadata.json

# Test script locale con verbose
python scripts/tag_photos.py --verbose

# Vedi logs GitHub Actions in tempo reale
# (usa GitHub CLI)
gh run view --log

# Lista tutti i metadata.json
find img -name "metadata.json"

# Conta immagini senza metadata
find img -type f \( -iname "*.jpg" -o -iname "*.png" \) | wc -l
find img -name "metadata.json" | wc -l
```

---

## 9. Roadmap e Next Steps

### 9.1 Immediate (Questa Settimana)

**Setup Branch e Test** ✅
- [ ] Crea branch `feature/ai-tagging`
- [ ] Aggiungi API key a GitHub Secrets
- [ ] Crea file workflow, script, requirements
- [ ] Commit e push setup
- [ ] Trigger manuale per testare
- [ ] Verifica metadata.json generati
- [ ] Test con foto incrementali

**Stima tempo:** 2-3 ore

---

### 9.2 Short Term (Prossime 2 Settimane)

**Merge in Main e Production** ✅
- [ ] Review finale del branch feature
- [ ] Merge in main
- [ ] Monitoring primi giorni
- [ ] Aggiunta foto nuove per testare workflow automatico
- [ ] Validazione costi effettivi

**Fase di Ottimizzazione** 🔧
- [ ] Analisi della qualità dei tag generati
- [ ] Tweaking del prompt se necessario
- [ ] Aggiustamenti rate limiting
- [ ] Documentazione workflow per te stesso

**Stima tempo:** 1-2 ore + monitoring passivo

---

### 9.3 Medium Term (Prossimi 1-2 Mesi)

**Integrazione Base con Jekyll** 🎨
- [ ] Mostra photography style nelle card
- [ ] Aggiungi color palette visualization
- [ ] Implementa filtri per style/scene
- [ ] Test su utenti (te stesso) per UX

**Stima tempo:** 1 giorno di sviluppo

---

### 9.4 Long Term (3-6 Mesi)

**Funzionalità Avanzate** 🚀
- [ ] Search semantica
- [ ] "Similar photos" widget
- [ ] Gallerie tematiche automatiche
- [ ] Stats dashboard
- [ ] Export metadata per analytics

**Stima tempo:** 2-3 giorni distribuiti

---

## 10. Conclusioni

### 10.1 Riepilogo Soluzione

**Cosa Hai:**
- ✅ Script Python funzionante che analizza foto con Claude API
- ✅ Genera metadata professionali (photography, objects, colors, scene)
- ✅ Processing incrementale (solo nuove foto)
- ✅ Gestione errori robusta

**Cosa Implementerai:**
- ✅ GitHub Actions workflow automatico
- ✅ Trigger su push di nuove immagini
- ✅ Commit automatico dei metadata
- ✅ Zero breaking changes al sito esistente

**Risultato Finale:**
Un workflow completamente automatico dove:
1. Aggiungi foto → push su GitHub
2. GitHub Action analizza automaticamente
3. Metadata vengono committati automaticamente
4. Pronti per uso futuro in Jekyll

### 10.2 Vantaggi di Questa Soluzione

✅ **Completamente Automatico**  
Dopo il setup iniziale, non devi fare nulla. Push foto → metadata generati.

✅ **Zero Breaking Changes**  
Il sito continua a funzionare esattamente come ora.

✅ **Economico**  
~$0.004 per foto con Haiku 4.5. Batch di 20 foto = $0.08.

✅ **Incrementale**  
Non riprocessa mai foto già analizzate. Risparmio tempo e denaro.

✅ **Sicuro**  
API key nei GitHub Secrets. Mai esposta nel codice.

✅ **Scalabile**  
Funziona con 10 foto o 10,000 foto.

✅ **Future-Proof**  
Metadata pronti per integrazione Jekyll quando vorrai.

### 10.3 Prossimi Passi Immediati

**Azione #1:** Setup Branch
```bash
git checkout -b feature/ai-tagging
mkdir -p .github/workflows scripts
# Crea i file dalla sezione 4
```

**Azione #2:** Aggiungi API Key
- Settings → Secrets → New secret
- Name: `ANTHROPIC_API_KEY`
- Value: tua API key

**Azione #3:** Test
- Commit e push setup files
- GitHub → Actions → Run workflow manualmente
- Verifica risultati

**Azione #4:** Merge quando funziona
```bash
git checkout main
git merge feature/ai-tagging
git push origin main
```

### 10.4 Supporto e Risorse

**Documentazione:**
- [Anthropic API Docs](https://docs.anthropic.com/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Jekyll Data Files](https://jekyllrb.com/docs/datafiles/)

**Monitoring:**
- GitHub Actions: `https://github.com/your-username/your-repo/actions`
- Anthropic Dashboard: `https://console.anthropic.com/`
- GitHub Billing: Settings → Billing

**Troubleshooting:**
- Vedi sezione 8 di questo PRD
- GitHub Actions logs per debug
- Test locale con `python scripts/tag_photos.py`

---

## Appendice A: Quick Start Command Reference

### Setup Iniziale
```bash
# Clone e setup
git clone https://github.com/your-username/photos.git
cd photos
git checkout -b feature/ai-tagging

# Crea struttura
mkdir -p .github/workflows scripts

# Aggiungi files (vedi sezione 4.2-4.4)
# ...

# Commit
git add .github/ scripts/
git commit -m "Add AI tagging infrastructure"
git push origin feature/ai-tagging
```

### Test Locale
```bash
# Virtual environment
python3 -m venv venv
source venv/bin/activate

# Install
pip install -r scripts/requirements.txt

# Configure
cp .env.example .env
# Edit .env with your API key

# Run
python scripts/tag_photos.py

# Deactivate
deactivate
```

### Workflow Post-Merge
```bash
# Aggiungi nuove foto
mkdir img/2025-01-NewLocation
cp ~/Photos/*.jpg img/2025-01-NewLocation/

# Commit
git add img/2025-01-NewLocation/
git commit -m "Add new photos"
git push origin main

# Aspetta 2-3 minuti per GitHub Action

# Pull metadata generati
git pull origin main
```

---

## Appendice B: File Templates

### B.1 Workflow File Template

Vedi sezione 4.2 per il contenuto completo di `.github/workflows/tag-photos.yml`

### B.2 Script File

Il TUO script `tag_photos.py` esistente è già perfetto. Usalo così com'è.

### B.3 Requirements File

```txt
anthropic==0.39.0
python-dotenv==1.0.0
tqdm==4.66.1
```

### B.4 Environment Variables Template

```bash
# .env.example
ANTHROPIC_API_KEY=your-api-key-here
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

### B.5 .gitignore Additions

```gitignore
# Environment variables
.env

# Python
__pycache__/
*.pyc
*.pyo
venv/
env/

# OS
.DS_Store
Thumbs.db
```

---

## Appendice C: Metadata Schema Reference

```typescript
// TypeScript interface per il formato metadata.json
interface Metadata {
  [filename: string]: {
    photography: {
      shot_type: string;          // "close-up" | "wide shot" | "macro" | etc.
      orientation: string;         // "landscape" | "portrait" | "square"
      lighting: string;            // "natural" | "golden hour" | "backlit" | etc.
      composition: string;         // "rule of thirds" | "centered" | etc.
      subject_focus: string;       // "single subject" | "scenery" | etc.
      style: string;               // "landscape" | "portrait" | "street" | etc.
    };
    objects: Array<{
      name: string;                // Nome oggetto in inglese
      confidence: number;          // 0-100
      position?: string;           // Posizione opzionale
    }>;
    people: {
      count: number;               // Numero di persone
      attributes: string[];        // Attributi generici, NO nomi
    };
    colors: Array<{
      hex: string;                 // "#RRGGBB"
      percentage: number;          // 0-100
    }>;
    scene: {
      type: string;                // "indoor" | "outdoor" | "urban" | "nature"
      description: string;         // Descrizione in inglese
    };
  };
}
```

---

**Fine del PRD** 🎉

**Versione:** 2.0  
**Ultima Modifica:** 4 Dicembre 2024  
**Status:** Ready for Implementation  
**Next Action:** Create feature branch and start setup