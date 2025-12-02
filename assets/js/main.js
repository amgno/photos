// Mobile Menu Toggle (if needed in future)
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
let currentFilter = 'all';
let lightbox;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeGallery();
    initializeLightbox();
});

function initializeGallery() {
    const galleryContainer = document.querySelector('.gallery-container');
    const loader = document.getElementById('galleryLoader');

    // 1. Parse all images from the DOM (assuming Jekyll rendered them flat initially)
    // We expect the HTML to contain a flat list of .gallery-item elements inside .gallery-container
    // But since we want to group them, we'll extract them and re-render.

    // However, looking at index.html, it renders a .masonry-grid with items.
    // We need to grab them, parse their data, and then clear the container to re-build it with Year sections.

    const initialGrid = document.querySelector('.masonry-grid');
    if (!initialGrid) return;

    const items = Array.from(initialGrid.querySelectorAll('.gallery-item'));

    allImagesData = items.map(item => {
        const img = item.querySelector('img');
        const category = item.getAttribute('data-category') || '';
        // Parse date/location from category string format: YYYY-MM-Location
        const year = category.substring(0, 4) || 'Unknown';
        const parts = category.split('-');
        let location = 'Unknown';
        if (parts.length > 2) {
            location = parts.slice(2).join('-');
        }

        return {
            element: item, // Keep the original element
            src: img.src || img.getAttribute('data-src'),
            alt: img.alt,
            year: year,
            location: location,
            category: category
        };
    });

    // 2. Extract Locations for the top bar
    const locations = new Set(allImagesData.map(img => img.location).filter(l => l !== 'Unknown'));
    renderLocationsBar(Array.from(locations).sort());

    // 3. Render the Gallery grouped by Year
    renderGallery();

    // 4. Hide loader
    window.addEventListener('load', () => {
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.style.display = 'none', 500);
        }
        // Trigger initial layout
        layoutAllGrids();

        // Show container
        galleryContainer.classList.add('loaded');
    });

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

    // "All" button
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
    container.innerHTML = ''; // Clear existing flat grid

    // Group by Year
    const years = [...new Set(allImagesData.map(img => img.year))].sort().reverse();

    years.forEach(year => {
        // Create Section
        const section = document.createElement('div');
        section.className = 'year-section';
        section.setAttribute('data-year', year);

        // Header
        const header = document.createElement('h2');
        header.className = 'year-header';
        header.textContent = year;
        section.appendChild(header);

        // Grid
        const grid = document.createElement('div');
        grid.className = 'masonry-grid';
        section.appendChild(grid);

        // Add items
        const yearImages = allImagesData.filter(img => img.year === year);
        yearImages.forEach(imgData => {
            // Clone the element to avoid reference issues if we re-render
            // Actually, better to just append the original element so lazy loading attributes are preserved
            // But we need to make sure we don't lose event listeners if any (though we delegate)

            // We'll re-use the element but ensure it's visible
            const item = imgData.element;
            item.style.display = ''; // Reset display
            grid.appendChild(item);

            // Re-attach click listener for lightbox (since we cleared container)
            // Actually, better to use delegation on the main container
        });

        container.appendChild(section);
    });

    // Initialize Lazy Loading for the new DOM structure
    initializeLazyLoading();
}

function filterGallery(location, btn) {
    currentFilter = location;

    // Update buttons
    document.querySelectorAll('.location-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Filter items
    allImagesData.forEach(img => {
        if (location === 'all' || img.location === location) {
            img.element.style.display = '';
        } else {
            img.element.style.display = 'none';
        }
    });

    // Hide empty year sections
    document.querySelectorAll('.year-section').forEach(section => {
        const grid = section.querySelector('.masonry-grid');
        const visibleItems = Array.from(grid.children).filter(item => item.style.display !== 'none');

        if (visibleItems.length === 0) {
            section.style.display = 'none';
        } else {
            section.style.display = '';
        }
    });

    // Re-layout
    layoutAllGrids();
}

function layoutAllGrids() {
    document.querySelectorAll('.masonry-grid').forEach(grid => {
        if (grid.offsetParent !== null) { // Only if visible
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
    // Columns logic matching CSS
    let columns = 4;
    if (window.innerWidth <= 1400) columns = 3;
    if (window.innerWidth <= 900) columns = 2;
    if (window.innerWidth <= 600) columns = 1;

    container.className = container.className.replace(/columns-\d+/g, '') + ` columns-${columns}`;

    const columnHeights = new Array(columns).fill(0);
    const itemWidth = containerWidth / columns;

    items.forEach(item => {
        const img = item.querySelector('img');

        // Estimate height if not loaded
        let itemHeight = item.offsetHeight;
        if (itemHeight === 0 && img) {
            // Fallback
            // Try to use aspect ratio if known, or default
            itemHeight = 250;
        }

        // Add margin bottom (8px from CSS)
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

// Lazy Loading
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
                        // Re-layout the specific grid this image belongs to
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
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');

    // Event Delegation for opening lightbox
    document.querySelector('.gallery-container').addEventListener('click', (e) => {
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
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'ArrowRight') nextImage();
    });
}

let lightboxCurrentIndex = 0;
let lightboxImages = [];

function openLightbox(src, caption) {
    // Get currently visible images for navigation
    lightboxImages = allImagesData.filter(img => img.element.style.display !== 'none');

    lightboxCurrentIndex = lightboxImages.findIndex(img => img.src === src || img.src.endsWith(src.split('/').pop()));
    if (lightboxCurrentIndex === -1) lightboxCurrentIndex = 0;

    updateLightboxContent();

    lightbox.style.display = 'block';
    // Small delay for transition
    setTimeout(() => lightbox.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('show');
    setTimeout(() => {
        lightbox.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
}

function updateLightboxContent() {
    const imgData = lightboxImages[lightboxCurrentIndex];
    const img = document.getElementById('lightboxImg');
    const caption = document.getElementById('lightboxCaption');

    img.src = imgData.src;
    caption.textContent = imgData.alt;
}

function nextImage() {
    if (lightboxImages.length <= 1) return;
    lightboxCurrentIndex = (lightboxCurrentIndex + 1) % lightboxImages.length;
    updateLightboxContent();
}

function prevImage() {
    if (lightboxImages.length <= 1) return;
    lightboxCurrentIndex = (lightboxCurrentIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightboxContent();
}