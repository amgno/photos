// Mobile Menu Toggle
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    mobileMenu.classList.toggle('active');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        menuToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
    }
});

// Gallery Filter
let currentImages = [];
let currentIndex = 0;

// Initialize gallery
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting initialization...');
    initializeImageLoader();
});

function initializeImageLoader() {
    console.log('initializeImageLoader called');
    
    const galleryContainer = document.querySelector('.gallery-container');
    const loader = document.getElementById('galleryLoader');
    const loaderPercentage = document.getElementById('loaderPercentage');
    const loaderProgressBar = document.getElementById('loaderProgressBar');
    const images = document.querySelectorAll('.gallery-item img');
    
    console.log('Found elements:', {
        galleryContainer: !!galleryContainer,
        loader: !!loader,
        loaderPercentage: !!loaderPercentage,
        loaderProgressBar: !!loaderProgressBar,
        imagesCount: images.length
    });
    
    let loadedCount = 0;
    const totalImages = images.length;
    
    // Inizializza la galleria come nascosta
    galleryContainer.classList.remove('loaded');
    
    // Se non ci sono immagini, nascondi il loader immediatamente
    if (totalImages === 0) {
        console.log('No images found, hiding loader and showing gallery anyway...');
        hideLoader();
        showGallery();
        return;
    }
    
    // Funzione per aggiornare il progresso
    function updateProgress() {
        const percentage = Math.round((loadedCount / totalImages) * 100);
        console.log(`Progress: ${loadedCount}/${totalImages} (${percentage}%)`);
        
        if (loaderPercentage) loaderPercentage.textContent = percentage + '%';
        if (loaderProgressBar) loaderProgressBar.style.width = percentage + '%';
        
        // Quando tutte le immagini sono caricate
        if (loadedCount === totalImages) {
            console.log('All images loaded, showing gallery...');
            setTimeout(() => {
                hideLoader();
                showGallery();
            }, 500); // Piccolo delay per far vedere il 100%
        }
    }
    
    // Funzione per nascondere il loader
    function hideLoader() {
        loader.classList.add('hidden');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
    
    // Funzione per mostrare la galleria
    function showGallery() {
        console.log('Showing gallery...');
        galleryContainer.classList.add('loaded');
        initializeGallery();
        initializeFilters();
        initializeFloatingMenu();
        initializeAdvancedFilters();
        initializeMasonry();
        initializeLightbox();
        
        // Aggiunge event listener direttamente alle immagini come backup
        const images = document.querySelectorAll('.gallery-item img');
        console.log('Adding direct event listeners to', images.length, 'images');
        images.forEach((img, index) => {
            img.addEventListener('click', (e) => {
                console.log('Direct click on image', index, img.src);
                openLightbox(img.src, img.alt);
            });
            img.style.cursor = 'pointer';
        });
        
        console.log('Gallery initialized successfully');
    }
    
    // Gestisci il caricamento di ogni immagine
    images.forEach((img, index) => {
        if (img.complete && img.naturalHeight !== 0) {
            // Immagine già caricata
            loadedCount++;
            updateProgress();
        } else {
            // Immagine non ancora caricata
            img.addEventListener('load', () => {
                loadedCount++;
                updateProgress();
            });
            
            img.addEventListener('error', () => {
                // Anche in caso di errore, conta come "caricata" per il progresso
                loadedCount++;
                updateProgress();
            });
        }
    });
    
    // Aggiorna il progresso iniziale nel caso alcune immagini siano già caricate
    updateProgress();
}

// Make openLightbox available globally for HTML onclick
window.openLightbox = openLightbox;

function initializeGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item img');
    currentImages = Array.from(galleryItems).map(img => ({
        src: img.src,
        caption: img.alt
    }));
}

function initializeFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            galleryItems.forEach(item => {
                if (filterValue === '*') {
                    item.style.display = '';
                } else {
                    const category = item.getAttribute('data-category');
                    if (category === filterValue) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                }
            });

            // Re-layout masonry after filter change
            setTimeout(() => {
                layoutMasonry();
            }, 50);

            // Update current images array for lightbox
            updateCurrentImages(filterValue);
        });
    });
}

function updateCurrentImages(filter) {
    const visibleItems = document.querySelectorAll(
        filter === '*' ? '.gallery-item img' : `.gallery-item[data-category="${filter}"] img`
    );
    
    currentImages = Array.from(visibleItems).map(img => ({
        src: img.src,
        caption: img.alt
    }));
}

// Lightbox functionality - variables will be initialized after DOM loads
let lightbox, lightboxImg, lightboxCaption, lightboxClose, lightboxPrev, lightboxNext;

function openLightbox(imageSrc, caption) {
    console.log('openLightbox called with:', imageSrc, caption);
    
    // Check if lightbox is initialized
    if (!lightbox) {
        console.log('Lightbox not initialized yet');
        return;
    }
    
    console.log('Lightbox found, opening...');
    
    // Find the index of the clicked image
    currentIndex = currentImages.findIndex(img => img.src === imageSrc);
    console.log('Image index:', currentIndex, 'Total images:', currentImages.length);
    
    if (currentIndex === -1) currentIndex = 0;
    
    // Show lightbox with animation
    lightbox.style.display = 'block';
    document.body.classList.add('lightbox-open');
    document.body.style.overflow = 'hidden';
    
    console.log('Lightbox display set, starting animation...');
    
    // Trigger animation after display is set
    setTimeout(() => {
        lightbox.classList.add('show');
        showLightboxImage();
        console.log('Animation started');
    }, 10);
}

function closeLightbox() {
    // Start closing animation
    lightbox.classList.remove('show');
    document.body.classList.remove('lightbox-open');
    
    // Hide lightbox after animation completes
    setTimeout(() => {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
    }, 400);
}

function showLightboxImage() {
    if (currentImages.length > 0) {
        lightboxImg.src = currentImages[currentIndex].src;
        lightboxCaption.textContent = currentImages[currentIndex].caption;
        
        // Show/hide navigation buttons
        lightboxPrev.style.display = currentImages.length > 1 ? 'block' : 'none';
        lightboxNext.style.display = currentImages.length > 1 ? 'block' : 'none';
    }
}

function previousImage() {
    if (currentImages.length > 1) {
        currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
        showLightboxImage();
    }
}

function nextImage() {
    if (currentImages.length > 1) {
        currentIndex = (currentIndex + 1) % currentImages.length;
        showLightboxImage();
    }
}

function initializeLightbox() {
    // Initialize lightbox elements
    lightbox = document.getElementById('lightbox');
    lightboxImg = document.getElementById('lightboxImg');
    lightboxCaption = document.getElementById('lightboxCaption');
    lightboxClose = document.getElementById('lightboxClose');
    lightboxPrev = document.getElementById('lightboxPrev');
    lightboxNext = document.getElementById('lightboxNext');
    
    console.log('Lightbox initialized:', lightbox ? 'Found' : 'Not found');
    
    // Test click detection
    document.addEventListener('click', (e) => {
        console.log('Click detected on:', e.target.tagName, e.target.className);
    });
    
    // Event delegation for gallery images - più affidabile degli onclick inline
    const galleryContainer = document.querySelector('.gallery-container');
    if (galleryContainer) {
        galleryContainer.addEventListener('click', (e) => {
            console.log('Gallery container clicked:', e.target);
            
            // Check if clicked element is a gallery image or overlay
            const galleryItem = e.target.closest('.gallery-item');
            if (galleryItem) {
                const img = galleryItem.querySelector('img');
                if (img) {
                    const imageSrc = img.src;
                    const caption = img.alt;
                    console.log('Gallery item clicked:', imageSrc);
                    openLightbox(imageSrc, caption);
                }
            }
        });
        console.log('Event listener attached to gallery container');
    } else {
        console.log('Gallery container not found!');
    }
    
    // Event listeners for lightbox controls
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', previousImage);
    if (lightboxNext) lightboxNext.addEventListener('click', nextImage);

    // Close lightbox when clicking outside the image
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (lightbox.style.display === 'block') {
        switch(e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                previousImage();
                break;
            case 'ArrowRight':
                nextImage();
                break;
        }
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Performance optimization: debounced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Re-initialize masonry layout if needed
        layoutMasonry();
    }, 250);
});

// Floating Menu Functionality
function initializeFloatingMenu() {
    const viewButtons = document.querySelectorAll('.floating-btn[data-view]');
    const galleryContainer = document.querySelector('.gallery-container');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all view buttons
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Apply view mode
            const viewMode = btn.getAttribute('data-view');
            galleryContainer.className = `gallery-container ${viewMode}-view`;
            
            // Re-layout masonry if switching to masonry view
            if (viewMode === 'masonry') {
                setTimeout(layoutMasonry, 100);
            }
        });
    });
}

// Advanced Filters
function initializeAdvancedFilters() {
    const filterButtons = document.querySelectorAll('.floating-btn[data-filter]');
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    // Extract years, months, and locations from gallery items
    const years = new Set();
    const months = new Set();
    const locations = new Set();
    
    galleryItems.forEach(item => {
        const category = item.getAttribute('data-category');
        if (category) {
            // Extract year (first 4 characters)
            const year = category.substring(0, 4);
            years.add(year);
            
            // Extract month (characters 5-6)
            const month = category.substring(5, 7);
            const monthName = getMonthName(month);
            months.add(`${month}-${monthName}`);
            
            // Extract location (after second dash)
            const parts = category.split('-');
            if (parts.length > 2) {
                const location = parts.slice(2).join('-');
                locations.add(location);
            }
        }
    });
    
    // Populate filter options
    populateFilterOptions('yearOptions', Array.from(years).sort().reverse());
    populateFilterOptions('monthOptions', Array.from(months).sort().reverse());
    populateFilterOptions('locationOptions', Array.from(locations).sort());
    
    // Setup filter button events
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filterType = btn.getAttribute('data-filter');
            const dropdown = document.getElementById(`${filterType}Dropdown`);
            
            // Close other dropdowns
            document.querySelectorAll('.filter-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('show');
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('show');
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.floating-btn')) {
            document.querySelectorAll('.filter-dropdown').forEach(d => {
                d.classList.remove('show');
            });
        }
    });
}

function populateFilterOptions(containerId, options) {
    const container = document.getElementById(containerId);
    
    // Add "All" option
    const allOption = document.createElement('button');
    allOption.className = 'filter-option active';
    allOption.textContent = 'Tutti';
    allOption.addEventListener('click', () => {
        applyAdvancedFilter(containerId.replace('Options', ''), null);
        updateActiveFilterOption(container, allOption);
    });
    container.appendChild(allOption);
    
    // Add specific options
    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'filter-option';
        btn.textContent = option.includes('-') ? option.split('-')[1] : option;
        btn.setAttribute('data-value', option.split('-')[0]);
        btn.addEventListener('click', () => {
            applyAdvancedFilter(containerId.replace('Options', ''), option.split('-')[0]);
            updateActiveFilterOption(container, btn);
        });
        container.appendChild(btn);
    });
}

function updateActiveFilterOption(container, activeBtn) {
    container.querySelectorAll('.filter-option').forEach(btn => {
        btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
}

function applyAdvancedFilter(filterType, value) {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    // Reset all items first
    galleryItems.forEach(item => {
        item.style.display = '';
        item.style.opacity = '';
        item.style.position = '';
        item.style.left = '';
        item.style.top = '';
    });
    
    // Apply filter if value is specified
    if (value) {
        galleryItems.forEach(item => {
            const category = item.getAttribute('data-category');
            let show = true;
            
            switch(filterType) {
                case 'year':
                    show = category.startsWith(value);
                    break;
                case 'month':
                    show = category.substring(5, 7) === value;
                    break;
                case 'location':
                    const parts = category.split('-');
                    if (parts.length > 2) {
                        const location = parts.slice(2).join('-');
                        show = location.includes(value);
                    }
                    break;
            }
            
            if (!show) {
                item.style.display = 'none';
            }
        });
    }
    
    // Re-layout masonry completely after filtering
    setTimeout(() => {
        layoutMasonry();
    }, 100);
    
    // Update current images for lightbox
    updateCurrentImages('*');
    
    // Close dropdown
    document.querySelector(`#${filterType}Dropdown`).classList.remove('show');
}

function getMonthName(monthNum) {
    const months = {
        '01': 'Gennaio', '02': 'Febbraio', '03': 'Marzo', '04': 'Aprile',
        '05': 'Maggio', '06': 'Giugno', '07': 'Luglio', '08': 'Agosto',
        '09': 'Settembre', '10': 'Ottobre', '11': 'Novembre', '12': 'Dicembre'
    };
    return months[monthNum] || monthNum;
}

// Masonry Layout Implementation
function initializeMasonry() {
    layoutMasonry();
    
    // Re-layout on window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(layoutMasonry, 250);
    });
    
    // Re-layout when images load
    const images = document.querySelectorAll('.gallery-item img');
    let loadedImages = 0;
    images.forEach(img => {
        if (img.complete) {
            loadedImages++;
            if (loadedImages === images.length) {
                setTimeout(layoutMasonry, 100);
            }
        } else {
            img.addEventListener('load', () => {
                loadedImages++;
                if (loadedImages === images.length) {
                    setTimeout(layoutMasonry, 100);
                }
            });
        }
    });
}

function layoutMasonry() {
    const container = document.querySelector('.masonry-grid');
    // Considera solo gli elementi visibili (non nascosti dal filtro)
    const items = Array.from(container.querySelectorAll('.gallery-item')).filter(item => {
        return item.style.display !== 'none';
    });
    
    if (items.length === 0) return;
    
    // Skip if grid view is active
    if (container.closest('.gallery-container').classList.contains('grid-view')) {
        return;
    }
    
    const containerWidth = container.offsetWidth - 16; // minus padding
    const gap = 8;
    
    // Determine columns based on screen width
    let columns = 5;
    if (window.innerWidth <= 1400) columns = 4;
    if (window.innerWidth <= 1200) columns = 3;
    if (window.innerWidth <= 768) columns = 2;
    if (window.innerWidth <= 480) columns = 1;
    
    // Add column class
    container.className = container.className.replace(/columns-\d+/g, '') + ` columns-${columns}`;
    
    const itemWidth = (containerWidth - (gap * (columns - 1))) / columns;
    const columnHeights = new Array(columns).fill(0);
    
    items.forEach((item, index) => {
        const img = item.querySelector('img');
        if (!img.complete) return;
        
        // Calculate item height based on image aspect ratio
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        const itemHeight = (itemWidth * imgHeight) / imgWidth;
        
        // Find column with minimum height
        const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
        
        // Position the item
        const left = shortestColumn * (itemWidth + gap);
        const top = columnHeights[shortestColumn];
        
        item.style.left = left + 'px';
        item.style.top = top + 'px';
        item.style.width = itemWidth + 'px';
        
        // Update column height
        columnHeights[shortestColumn] += itemHeight + gap;
    });
    
    // Set container height
    const maxHeight = Math.max(...columnHeights);
    container.style.height = maxHeight + 'px';
} 