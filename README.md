# A. Magno Photography Portfolio

This repository hosts the source code for a static photography portfolio website. The system relies on Jekyll for static site generation and utilizes a client-side architecture to implement advanced search and metadata visualization features powered by AI analysis.

## System Architecture

The project is built on the GitHub Pages infrastructure, employing the following stack:

-   **Core:** Jekyll (Static Site Generator).
-   **Templating:** Liquid.
-   **Styling:** SCSS/CSS3 with CSS Variables for theming.
-   **Scripting:** Vanilla JavaScript (ES6+) for DOM manipulation and data handling.
-   **Data Storage:** Distributed JSON files for image metadata.

## Design System

The visual interface adheres to a minimalist design philosophy, prioritizing content visibility over decorative elements.

### Layout Logic
The core display mechanism is a responsive masonry grid. The layout algorithm dynamically adjusts the number of columns based on the viewport width:
-   **> 1400px:** 4 Columns.
-   **< 1400px:** 3 Columns.
-   **< 900px:** 2 Columns.
-   **< 600px:** 1 Column.

### Typography and Color
-   **Font Family:** Inter (Google Fonts) is used for its neutrality and readability.
-   **Color Palette:** A strict monochromatic scale is applied.
    -   Background: `#ffffff` (White)
    -   Text: `#1a1a1a` (Dark Grey/Black)
    -   Overlays: High-transparency white for backdrop filtering.

## Functional Overview

### Navigation and Organization
Images are physically organized in directories by date and location (e.g., `img/2024-10-Milano/`). The frontend groups these images chronologically by year. A sticky horizontal bar provides filtering capabilities based on the location extracted from the directory structure.

### Lightbox and Inspection
Clicking an image activates a modal lightbox. This view provides:
1.  **Navigation:** Linear traversal through the current filtered dataset.
2.  **Metadata Widget:** A toggleable side panel displaying technical and semantic details of the photograph.

### Search System
The search functionality is entirely client-side. It operates by:
1.  Indexing all available `metadata.json` files upon page load.
2.  Performing real-time filtering against the indexed dataset.
3.  Supporting structured queries (e.g., `style:street`, `lighting:golden hour`) and unstructured free-text search.

## AI Implementation

The distinguishing feature of this repository is the integration of Artificial Intelligence for metadata generation and retrieval.

### Data Generation Pipeline
Metadata is not manually entered. A Python automation script (`scripts/tag_photos.py`) processes the image library. This script utilizes Vision AI models to analyze each image and generate a structured JSON output.

The analysis extracts the following taxonomies:
-   **Photography:** Technical style (e.g., documentary, architectural), shot type, subject focus, and lighting conditions.
-   **Scene:** Contextual environment (indoor/outdoor), time of day, and weather.
-   **Objects:** Detection of physical elements within the frame, accompanied by confidence scores.
-   **Colors:** Extraction of the dominant color palette, represented as HEX codes and coverage percentages.
-   **Description:** A synthesized textual description of the scene.

### Data Structure
Metadata is stored alongside the images. For a folder `img/Location-A/`, a corresponding `metadata.json` is generated containing key-value pairs where the key is the filename and the value is the metadata object.

Example schema:
```json
{
  "R0000370.jpg": {
    "photography": {
      "style": "architectural",
      "lighting": "artificial"
    },
    "objects": [
      { "name": "wooden shelves", "confidence": 0.9 }
    ],
    "colors": [
      { "hex": "#C4A860", "percentage": 25 }
    ]
  }
}
```

### Frontend Integration
To minimize server latency and avoid database requirements:
1.  The JavaScript client identifies all unique image directories loaded in the DOM.
2.  It performs asynchronous `fetch` requests to retrieve the `metadata.json` for each directory.
3.  The JSON data is merged into a global state object, linked to the specific image DOM elements.
4.  Search queries iterate through this local dataset to update the CSS `display` properties of the grid items.

## Local Development

To run the project locally:

1.  **Prerequisites:** Ruby and Bundler must be installed.
2.  **Install Dependencies:**
    ```bash
    bundle install
    ```
3.  **Run Server:**
    ```bash
    bundle exec jekyll serve
    ```
4.  **Access:** The site will be available at `http://localhost:4000/photos/`.

## Deployment

The project is configured for GitHub Pages.
-   The `_config.yml` defines the `baseurl` (e.g., `/photos`).
-   A frontend configuration script injects `window.siteBaseUrl` to ensure asynchronous resource fetching (metadata) resolves correctly regardless of the hosting path.
