// Mobile Menu Toggle
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');

if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });
}

// Global State
let allImagesData = [];
let allMetadata = {};
let availableTags = {};
let currentFilter = 'all';
let lightbox;
let lightboxImages = [];
let lightboxCurrentIndex = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeGallery();
    initializeLightbox();
});

function initializeGallery() {
    const galleryContainer = document.querySelector('.gallery-container');
    const loader = document.getElementById('galleryLoader');

    // 1. Parse all images
    const initialGrid = document.querySelector('.masonry-grid');
    if (!initialGrid) {
        if (loader) loader.style.display = 'none';
        return;
    }

    const items = Array.from(initialGrid.querySelectorAll('.gallery-item'));

    allImagesData = items.map(item => {
        const img = item.querySelector('img');
        const category = item.getAttribute('data-category') || '';
        const year = category.substring(0, 4) || 'Unknown';
        const parts = category.split('-');
        let location = 'Unknown';
        if (parts.length > 2) {
            location = parts.slice(2).join('-');
        }

        return {
            element: item,
            src: img.src || img.getAttribute('data-src'),
            alt: img.alt,
            year: year,
            location: location,
            category: category
        };
    });

    // 2. Extract Locations
    const locations = new Set(allImagesData.map(img => img.location).filter(l => l !== 'Unknown'));
    renderLocationsBar(Array.from(locations).sort());

    // 3. Render Gallery
    renderGallery();

    // 4. Load Metadata & Initialize Search
    loadAllMetadata().then(() => {
        attachMetadataToImages();
        availableTags = generateTagList();
        initializeSearch();
    }).catch(err => {
        console.error('Error initializing metadata system:', err);
    });

    // 5. Hide loader function
    const hideLoader = () => {
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.style.display = 'none', 500);
        }
        layoutAllGrids();
        if (galleryContainer) galleryContainer.classList.add('loaded');
    };

    if (document.readyState === 'complete') {
        hideLoader();
    } else {
        window.addEventListener('load', hideLoader);
        setTimeout(hideLoader, 5000); // Fallback timeout
    }

    // Resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(layoutAllGrids, 200);
    });
}

function renderLocationsBar(locations) {
    const bar = document.getElementById('locationsBar');
    if (!bar) return;

    bar.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = 'location-filter active';
    allBtn.textContent = 'All';
    allBtn.onclick = () => filterGallery('all', allBtn);
    bar.appendChild(allBtn);

    locations.forEach(loc => {
        const btn = document.createElement('button');
        btn.className = 'location-filter';
        btn.textContent = loc;
        btn.onclick = () => filterGallery(loc, btn);
        bar.appendChild(btn);
    });
}

function renderGallery() {
    const container = document.querySelector('.gallery-container');
    if (!container) return;
    container.innerHTML = '';

    const years = [...new Set(allImagesData.map(img => img.year))].sort().reverse();

    years.forEach(year => {
        const section = document.createElement('div');
        section.className = 'year-section';
        section.setAttribute('data-year', year);

        const header = document.createElement('h2');
        header.className = 'year-header';
        header.textContent = year;
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'masonry-grid';
        section.appendChild(grid);

        const yearImages = allImagesData.filter(img => img.year === year);
        yearImages.forEach(imgData => {
            const item = imgData.element;
            item.style.display = '';
            grid.appendChild(item);
        });

        container.appendChild(section);
    });

    initializeLazyLoading();
}

function filterGallery(location, btn) {
    currentFilter = location;

    document.querySelectorAll('.location-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    allImagesData.forEach(img => {
        if (location === 'all' || img.location === location) {
            img.element.style.display = '';
        } else {
            img.element.style.display = 'none';
        }
    });

    document.querySelectorAll('.year-section').forEach(section => {
        const grid = section.querySelector('.masonry-grid');
        const visibleItems = Array.from(grid.children).filter(item => item.style.display !== 'none');
        section.style.display = visibleItems.length === 0 ? 'none' : '';
    });

    layoutAllGrids();
}

function layoutAllGrids() {
    document.querySelectorAll('.masonry-grid').forEach(grid => {
        if (grid.offsetParent !== null) {
            layoutMasonry(grid);
        }
    });
}

function layoutMasonry(container) {
    const items = Array.from(container.querySelectorAll('.gallery-item')).filter(item => {
        return item.style.display !== 'none';
    });

    if (items.length === 0) {
        container.style.height = '0px';
        return;
    }

    const containerWidth = container.offsetWidth;
    let columns = 4;
    if (window.innerWidth <= 1400) columns = 3;
    if (window.innerWidth <= 900) columns = 2;
    if (window.innerWidth <= 600) columns = 1;

    container.className = container.className.replace(/columns-\d+/g, '') + ` columns-${columns}`;

    const columnHeights = new Array(columns).fill(0);
    const itemWidth = containerWidth / columns;

    items.forEach(item => {
        const img = item.querySelector('img');
        let itemHeight = item.offsetHeight;
        if (itemHeight === 0 && img) itemHeight = 250;
        itemHeight += 8;

        const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
        const left = shortestColumn * itemWidth;
        const top = columnHeights[shortestColumn];

        item.style.position = 'absolute';
        item.style.left = left + 'px';
        item.style.top = top + 'px';

        columnHeights[shortestColumn] += itemHeight;
    });

    container.style.height = Math.max(...columnHeights) + 'px';
}

function initializeLazyLoading() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.onload = () => {
                        img.classList.remove('lazy');
                        img.classList.add('loaded');
                        const grid = img.closest('.masonry-grid');
                        if (grid) layoutMasonry(grid);
                    };
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    }, { rootMargin: '200px' });

    document.querySelectorAll('img[data-src]').forEach(img => {
        img.classList.add('lazy');
        observer.observe(img);
    });
}

// Lightbox
function initializeLightbox() {
    lightbox = document.getElementById('lightbox');
    const closeBtn = document.getElementById('lightboxClose');
    const prevBtn = document.getElementById('lightboxPrev');
    const nextBtn = document.getElementById('lightboxNext');

    document.querySelector('.gallery-container')?.addEventListener('click', (e) => {
        const item = e.target.closest('.gallery-item');
        if (item) {
            const img = item.querySelector('img');
            const src = img.src || img.getAttribute('data-src');
            openLightbox(src, img.alt);
        }
    });

    if (closeBtn) closeBtn.onclick = closeLightbox;
    if (prevBtn) prevBtn.onclick = prevImage;
    if (nextBtn) nextBtn.onclick = nextImage;

    if (lightbox) {
        lightbox.onclick = (e) => {
            if (e.target === lightbox) closeLightbox();
        };
    }

    document.addEventListener('keydown', (e) => {
        if (!lightbox || !lightbox.classList.contains('show')) return;
        
        if (e.key === 'Escape') {
            const widget = document.getElementById('metadataWidget');
            if (widget && widget.classList.contains('show')) {
                widget.classList.remove('show');
                const img = document.getElementById('lightboxImg');
                if(img) img.style.maxWidth = '90vw';
            } else {
                closeLightbox();
            }
        }
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'ArrowRight') nextImage();
    });

    initializeLightboxInfo();
}

function openLightbox(src, caption) {
    lightboxImages = allImagesData.filter(img => img.element.style.display !== 'none');
    lightboxCurrentIndex = lightboxImages.findIndex(img => img.src === src || img.src.endsWith(src.split('/').pop()));
    if (lightboxCurrentIndex === -1) lightboxCurrentIndex = 0;

    updateLightboxContent();

    lightbox.style.display = 'block';
    setTimeout(() => lightbox.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';

    const imgData = lightboxImages[lightboxCurrentIndex];
    if (imgData && imgData.metadata) {
        populateMetadataWidget(imgData.metadata);
    } else {
        const infoBtn = document.getElementById('lightboxInfoBtn');
        if (infoBtn) infoBtn.style.display = 'none';
    }
}

function closeLightbox() {
    if(!lightbox) return;
    lightbox.classList.remove('show');
    
    const widget = document.getElementById('metadataWidget');
    if (widget) widget.classList.remove('show');
    
    const lightboxImg = document.getElementById('lightboxImg');
    if (lightboxImg) lightboxImg.style.maxWidth = '90vw';

    setTimeout(() => {
        lightbox.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
}

function updateLightboxContent() {
    const imgData = lightboxImages[lightboxCurrentIndex];
    const img = document.getElementById('lightboxImg');
    const caption = document.getElementById('lightboxCaption');

    if(img) img.src = imgData.src;
    if(caption) caption.textContent = imgData.alt;
}

function nextImage() {
    if (lightboxImages.length <= 1) return;
    lightboxCurrentIndex = (lightboxCurrentIndex + 1) % lightboxImages.length;
    updateLightboxContent();
    
    // Refresh metadata widget for new image
    const imgData = lightboxImages[lightboxCurrentIndex];
    if (imgData && imgData.metadata) {
        populateMetadataWidget(imgData.metadata);
    } else {
        const widget = document.getElementById('metadataWidget');
        if (widget) widget.classList.remove('show');
        const infoBtn = document.getElementById('lightboxInfoBtn');
        if (infoBtn) infoBtn.style.display = 'none';
    }
}

function prevImage() {
    if (lightboxImages.length <= 1) return;
    lightboxCurrentIndex = (lightboxCurrentIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightboxContent();
    
    const imgData = lightboxImages[lightboxCurrentIndex];
    if (imgData && imgData.metadata) {
        populateMetadataWidget(imgData.metadata);
    } else {
         const widget = document.getElementById('metadataWidget');
        if (widget) widget.classList.remove('show');
        const infoBtn = document.getElementById('lightboxInfoBtn');
        if (infoBtn) infoBtn.style.display = 'none';
    }
}

/* ==========================================================================
   METADATA & TAGGING SYSTEM
   ========================================================================== */

async function loadAllMetadata() {
    const folders = [...new Set(allImagesData.map(img => img.category))];
    
    const promises = folders.map(async folder => {
        try {
            // Handle folders with spaces or special chars
            const encodedFolder = encodeURIComponent(folder).replace(/%2F/g, '/'); 
            const baseUrl = window.siteBaseUrl || '';
            const response = await fetch(`${baseUrl}/img/${encodedFolder}/metadata.json`);
            if (response.ok) {
                const data = await response.json();
                return { folder, data };
            }
        } catch (e) {
            console.warn(`No metadata for ${folder}`, e);
        }
        return null;
    });
    
    const results = await Promise.all(promises);
    
    results.forEach(result => {
        if (result) {
            allMetadata[result.folder] = result.data;
        }
    });
    
    console.log('Metadata loaded:', Object.keys(allMetadata).length, 'folders');
}

function attachMetadataToImages() {
    allImagesData.forEach(img => {
        if (allMetadata[img.category]) {
            // Filename matching
            let filename = img.src.split('/').pop().split('?')[0];
            try {
                filename = decodeURIComponent(filename);
            } catch (e) {}
            
            const folderMeta = allMetadata[img.category];
            let meta = folderMeta[filename];
            
            if (!meta) {
                const key = Object.keys(folderMeta).find(k => k.toLowerCase() === filename.toLowerCase());
                if (key) meta = folderMeta[key];
            }
            
            if (meta) {
                img.metadata = meta;
            }
        }
    });
}

function generateTagList() {
    const tags = {
        styles: new Set(),
        scenes: new Set(),
        lighting: new Set(),
        shotTypes: new Set(),
        objects: {}
    };
    
    Object.values(allMetadata).forEach(folderMeta => {
        Object.values(folderMeta).forEach(imageMeta => {
            if (imageMeta.photography?.style) {
                imageMeta.photography.style.split(',').forEach(s => {
                    tags.styles.add(s.trim().toLowerCase());
                });
            }
            if (imageMeta.scene?.type) {
                tags.scenes.add(imageMeta.scene.type.toLowerCase());
            }
            if (imageMeta.photography?.lighting) {
                tags.lighting.add(imageMeta.photography.lighting.toLowerCase());
            }
            if (imageMeta.photography?.shot_type) {
                tags.shotTypes.add(imageMeta.photography.shot_type.toLowerCase());
            }
            if (imageMeta.objects) {
                imageMeta.objects.forEach(obj => {
                    const name = obj.name.toLowerCase();
                    tags.objects[name] = (tags.objects[name] || 0) + 1;
                });
            }
        });
    });
    
    const topObjects = Object.entries(tags.objects)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name]) => name);

    return {
        styles: Array.from(tags.styles).sort(),
        scenes: Array.from(tags.scenes).sort(),
        lighting: Array.from(tags.lighting).sort(),
        shotTypes: Array.from(tags.shotTypes).sort(),
        objects: topObjects
    };
}

/* ==========================================================================
   SEARCH SYSTEM
   ========================================================================== */

function initializeSearch() {
    const input = document.getElementById('searchInput');
    const dropdown = document.getElementById('searchDropdown');
    
    if (!input || !dropdown) return;
    
    renderTagDropdown();
    
    input.addEventListener('focus', () => {
        dropdown.classList.add('show');
    });
    
    input.addEventListener('blur', () => {
        setTimeout(() => {
            dropdown.classList.remove('show');
        }, 200);
    });
    
    input.addEventListener('input', (e) => {
        searchPhotos(e.target.value);
    });
    
    input.addEventListener('keydown', handleSearchKeydown);
}

function renderTagDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    if (!dropdown || !availableTags) return;
    
    const categories = [
        { title: 'PHOTOGRAPHY STYLES', items: availableTags.styles, prefix: 'style' },
        { title: 'SCENE TYPES', items: availableTags.scenes, prefix: 'scene' },
        { title: 'LIGHTING', items: availableTags.lighting, prefix: 'lighting' },
        { title: 'SHOT TYPES', items: availableTags.shotTypes, prefix: 'shot' },
        { title: 'COMMON OBJECTS', items: availableTags.objects, prefix: 'object' }
    ];
    
    const html = categories.map(cat => {
        if (!cat.items || cat.items.length === 0) return '';
        
        const items = cat.items.map(item => 
            `<div class="tag-item" data-tag="${cat.prefix}:${item}">${item}</div>`
        ).join('');
        
        return `
            <div class="tag-category">
                <div class="tag-category-title">${cat.title}</div>
                ${items}
            </div>
        `;
    }).join('');
    
    dropdown.innerHTML = html;
    
    dropdown.querySelectorAll('.tag-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tag = item.getAttribute('data-tag');
            insertTag(tag);
        });
    });
}

function insertTag(tag) {
    const input = document.getElementById('searchInput');
    const currentValue = input.value.trim();
    
    if (!currentValue) {
        input.value = tag;
    } else {
        input.value = currentValue + ' ' + tag;
    }
    
    searchPhotos(input.value);
    input.focus();
}

let selectedTagIndex = -1;

function handleSearchKeydown(e) {
    const dropdown = document.getElementById('searchDropdown');
    if (!dropdown.classList.contains('show')) return;
    
    const tagItems = Array.from(dropdown.querySelectorAll('.tag-item'));
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedTagIndex = Math.min(selectedTagIndex + 1, tagItems.length - 1);
        highlightTag(tagItems, selectedTagIndex);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedTagIndex = Math.max(selectedTagIndex - 1, -1);
        highlightTag(tagItems, selectedTagIndex);
    } else if (e.key === 'Enter' && selectedTagIndex >= 0) {
        e.preventDefault();
        const tag = tagItems[selectedTagIndex].getAttribute('data-tag');
        insertTag(tag);
        selectedTagIndex = -1;
    } else if (e.key === 'Escape') {
        dropdown.classList.remove('show');
        selectedTagIndex = -1;
    }
}

function highlightTag(tagItems, index) {
    tagItems.forEach((item, i) => {
        if (i === index) {
            item.classList.add('highlighted');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('highlighted');
        }
    });
}

function searchPhotos(query) {
    if (!query || query.length < 2) {
        const activeBtn = document.querySelector('.location-filter.active');
        if (activeBtn) {
            filterGallery(currentFilter, activeBtn);
        } else {
             document.querySelectorAll('.gallery-item').forEach(item => {
                item.style.display = '';
            });
            layoutAllGrids();
        }
        
        const countDisplay = document.getElementById('searchResultsCount');
        if (countDisplay) countDisplay.classList.remove('show');
        
        return;
    }
    
    query = query.toLowerCase().trim();
    
    const tags = [];
    let freeTextQuery = query;
    
    const parts = query.split(' ');
    const remainingParts = [];
    
    parts.forEach(part => {
        if (part.includes(':')) {
            const [type, val] = part.split(':');
            if (type && val) {
                tags.push({ type, value: val });
            } else {
                remainingParts.push(part);
            }
        } else {
            remainingParts.push(part);
        }
    });
    
    freeTextQuery = remainingParts.join(' ');
    
    const results = allImagesData.filter(img => {
        const meta = img.metadata || {};
        
        if (tags.length > 0 && !img.metadata) return false;

        for (const tag of tags) {
            if (tag.type === 'style') {
                if (!meta.photography?.style?.toLowerCase().includes(tag.value)) {
                    return false;
                }
            } else if (tag.type === 'scene') {
                if (meta.scene?.type?.toLowerCase() !== tag.value) {
                    return false;
                }
            } else if (tag.type === 'lighting') {
                if (!meta.photography?.lighting?.toLowerCase().includes(tag.value)) {
                    return false;
                }
            } else if (tag.type === 'shot') {
                if (!meta.photography?.shot_type?.toLowerCase().includes(tag.value)) {
                    return false;
                }
            } else if (tag.type === 'object') {
                const hasObject = meta.objects?.some(obj => 
                    obj.name.toLowerCase().includes(tag.value)
                );
                if (!hasObject) return false;
            }
        }
        
        if (freeTextQuery) {
            const searchableFields = [
                img.location || '',
                img.year || '',
                img.category || '',
                meta.scene?.description || '',
                meta.scene?.type || '',
                meta.photography?.style || '',
                meta.photography?.subject_focus || '',
                ...(meta.objects?.map(o => o.name) || []),
                ...(meta.people?.attributes || [])
            ];
            
            const searchText = searchableFields.join(' ').toLowerCase();
            
            if (!searchText.includes(freeTextQuery)) {
                return false;
            }
        }
        
        return true;
    });
    
    displaySearchResults(results, query);
}

function displaySearchResults(results, query) {
    allImagesData.forEach(img => {
        if (results.includes(img)) {
            img.element.style.display = '';
        } else {
            img.element.style.display = 'none';
        }
    });

    document.querySelectorAll('.year-section').forEach(section => {
        const grid = section.querySelector('.masonry-grid');
        const visibleItems = Array.from(grid.children).filter(item => item.style.display !== 'none');

        if (visibleItems.length === 0) {
            section.style.display = 'none';
        } else {
            section.style.display = '';
        }
    });

    layoutAllGrids();
    
    const countDisplay = document.getElementById('searchResultsCount');
    if (countDisplay) {
        countDisplay.textContent = `${results.length} photos found`;
        countDisplay.classList.add('show');
        
        setTimeout(() => {
            countDisplay.classList.remove('show');
        }, 3000);
    }
}


/* ==========================================================================
   LIGHTBOX INFO WIDGET
   ========================================================================== */

function initializeLightboxInfo() {
    const infoBtn = document.getElementById('lightboxInfoBtn');
    const widget = document.getElementById('metadataWidget');
    
    if (!infoBtn || !widget) return;
    
    infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        widget.classList.toggle('show');
        
        const lightboxImg = document.getElementById('lightboxImg');
        if (widget.classList.contains('show')) {
            lightboxImg.style.maxWidth = 'calc(100vw - 320px)';
        } else {
            lightboxImg.style.maxWidth = '90vw';
        }
    });

    document.getElementById('lightbox')?.addEventListener('click', (e) => {
        const widget = document.getElementById('metadataWidget');
        const infoBtn = document.getElementById('lightboxInfoBtn');
        
        if (e.target.id === 'lightbox' && widget.classList.contains('show')) {
            widget.classList.remove('show');
            document.getElementById('lightboxImg').style.maxWidth = '90vw';
        }
    });
}

function populateMetadataWidget(meta) {
    const widget = document.getElementById('metadataWidget');
    const infoBtn = document.getElementById('lightboxInfoBtn');
    
    if (!widget) return;
    
    if (infoBtn) infoBtn.style.display = 'flex';
    
    widget.innerHTML = `
        ${renderPhotographySection(meta.photography)}
        ${renderSceneSection(meta.scene)}
        ${renderObjectsSection(meta.objects)}
        ${renderPeopleSection(meta.people)}
        ${renderColorsWidgetSection(meta.colors)}
    `;
}

function renderPhotographySection(photo) {
    if (!photo) return '';
    return `
        <div class="metadata-widget-section">
            <h3>Photography</h3>
            <ul>
                <li><strong>Style:</strong> ${photo.style || 'N/A'}</li>
                <li><strong>Shot:</strong> ${photo.shot_type || 'N/A'}</li>
                <li><strong>Lighting:</strong> ${photo.lighting || 'N/A'}</li>
                <li><strong>Focus:</strong> ${photo.subject_focus || 'N/A'}</li>
            </ul>
        </div>
    `;
}

function renderSceneSection(scene) {
    if (!scene) return '';
    return `
        <div class="metadata-widget-section">
            <h3>Scene</h3>
            <ul>
                <li><strong>Type:</strong> ${scene.type || 'N/A'}</li>
                <li><strong>Time:</strong> ${scene.time_of_day || 'N/A'}</li>
                <li><strong>Weather:</strong> ${scene.weather || 'N/A'}</li>
            </ul>
            <p class="scene-description">${scene.description || ''}</p>
        </div>
    `;
}

function renderObjectsSection(objects) {
    if (!objects || objects.length === 0) return '';
    const items = objects.map(obj => 
        `<li>${obj.name} <span class="confidence">(${(obj.confidence * 100).toFixed(0)}%)</span></li>`
    ).join('');
    return `
        <div class="metadata-widget-section">
            <h3>Objects</h3>
            <ul>${items}</ul>
        </div>
    `;
}

function renderPeopleSection(people) {
    if (!people || (!people.count && (!people.attributes || people.attributes.length === 0))) return '';
    return `
        <div class="metadata-widget-section">
            <h3>People</h3>
            <ul>
                <li><strong>Count:</strong> ${people.count || 0}</li>
                ${people.attributes ? people.attributes.map(attr => `<li>${attr}</li>`).join('') : ''}
            </ul>
        </div>
    `;
}

function renderColorsWidgetSection(colors) {
    if (!colors || colors.length === 0) return '';
    
    const items = colors.map(color => `
        <div class="color-widget-item">
            <div class="color-widget-swatch" style="background: ${color.hex}"></div>
            <span class="color-widget-hex">${color.hex}</span>
            <span class="color-widget-percentage">${color.percentage}%</span>
        </div>
    `).join('');
    
    return `
        <div class="metadata-widget-section">
            <h3>Colors</h3>
            ${items}
        </div>
    `;
}
