# Photography Portfolio

Un photo portfolio moderno e responsivo che si aggiorna automaticamente quando aggiungi nuove immagini.

## Caratteristiche

✨ **Aggiornamento Automatico**: Basta aggiungere cartelle di immagini in `img/` e il sito si aggiorna da solo  
🎨 **Design Moderno**: Layout masonry ispirato ai migliori portfolio fotografici  
📱 **Completamente Responsivo**: Ottimizzato per desktop, tablet e mobile  
🔍 **Lightbox Avanzato**: Visualizzazione full-screen con navigazione  
🏷️ **Filtri per Categoria**: Filtra le foto per cartella/progetto  
⚡ **Performance Ottimizzate**: Lazy loading e transizioni fluide  

## Come Aggiungere Nuove Foto

1. Crea una nuova cartella in `img/` con il nome del progetto
   ```
   img/2025-05-Roma/
   img/2025-06-Wedding-Milano/
   ```

2. Aggiungi le tue immagini nella cartella (formati supportati: JPG, PNG, GIF, WebP)

3. Fai commit e push su GitHub - il sito si aggiornerà automaticamente!

## Struttura delle Cartelle

```
img/
├── 2025-04-Milano Design week/
├── 2025-03-Venezia/
├── 2025-03-Svizzera/
├── 2024-12-Svizzera/
└── ... altre cartelle
```

## Tecnologie

- **Jekyll** - Generatore di siti statici
- **GitHub Pages** - Hosting automatico
- **CSS Grid + Flexbox** - Layout responsivo
- **Vanilla JavaScript** - Interazioni senza dipendenze

## Deploy

Il sito viene deployato automaticamente su GitHub Pages ad ogni push sul branch `main`.

## Personalizzazione

### Cambiare il Nome
Modifica il nome in `_layouts/default.html`:
```html
<div class="logo">
    <h1>A.<br>MAGNO</h1>
</div>
```

### Modificare i Colori
I colori sono definiti in `assets/css/main.css`:
```css
:root {
    --bg-color: #000;
    --text-color: #fff;
    --accent-color: #fff;
}
```

### Aggiungere Pagine
Crea nuovi file `.html` o `.md` nella root del progetto.

## Sviluppo Locale

```bash
# Installa Jekyll
gem install bundler jekyll

# Installa dipendenze
bundle install

# Avvia server locale
bundle exec jekyll serve

# Visita http://localhost:4000
``` 