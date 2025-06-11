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
let lazyLoadObserver;

// Detect mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Memory management for mobile
let processedImages = 0;
const MAX_MOBILE_IMAGES = 50;

// Debounce masonry re-layout
let layoutTimeout;
function debouncedLayoutMasonry() {
    clearTimeout(layoutTimeout);
    layoutTimeout = setTimeout(layoutMasonry, 100);
}

// Initialize gallery
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting initialization...');
    
    // Add error handling for mobile
    if (isMobile) {
        window.addEventListener('error', (e) => {
            console.warn('Mobile error caught:', e.message);
            // Try to free memory
            if (lazyLoadObserver) {
                lazyLoadObserver.disconnect();
                setTimeout(() => initializeLazyLoading(), 1000);
            }
        });
        
        // Monitor memory usage on mobile
        if ('memory' in performance) {
            setInterval(() => {
                const memInfo = performance.memory;
                if (memInfo.usedJSHeapSize > memInfo.jsHeapSizeLimit * 0.8) {
                    console.warn('High memory usage detected, optimizing...');
                    optimizeMemoryUsage();
                }
            }, 10000); // Check every 10 seconds
        }
    }
    
    initializeImageLoader();
});

// Memory optimization function
function optimizeMemoryUsage() {
    // Remove loaded images that are far from viewport
    const images = document.querySelectorAll('.gallery-item img:not(.lazy)');
    let cleanedCount = 0;
    
    images.forEach((img, index) => {
        if (index > MAX_MOBILE_IMAGES && !isInViewport(img)) {
            // Convert back to lazy loading
            img.setAttribute('data-src', img.src);
            img.removeAttribute('src');
            img.classList.add('lazy');
            cleanedCount++;
            
            if (lazyLoadObserver) {
                lazyLoadObserver.observe(img);
            }
        }
    });
    
    if (cleanedCount > 0) {
        console.log('Cleaned up', cleanedCount, 'images to save memory');
    }
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= -window.innerHeight &&
        rect.left >= -window.innerWidth &&
        rect.bottom <= window.innerHeight * 2 &&
        rect.right <= window.innerWidth * 2
    );
}

// Lazy loading implementation for mobile performance
function initializeLazyLoading() {
    // Only load visible images and next few for better mobile performance
    const imageObserverOptions = {
        root: null,
        rootMargin: '50px', // Small margin to load just before entering viewport
        threshold: 0.01
    };

    lazyLoadObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                if (src) {
                    console.log('Loading lazy image:', src);
                    
                    // Load the image and wait for it to be ready
                    img.addEventListener('load', () => {
                        console.log('Lazy image loaded, re-layouting masonry');
                        img.classList.remove('lazy');
                        img.classList.add('loaded');
                        
                        // IMPORTANTE: Aggiorna l'array currentImages dopo che l'immagine lazy è caricata
                        updateCurrentImagesArray();
                        
                        // Re-layout masonry after image is fully loaded (debounced)
                        debouncedLayoutMasonry();
                    }, { once: true });
                    
                    img.addEventListener('error', () => {
                        console.log('Lazy image failed to load:', src);
                        img.classList.remove('lazy');
                        img.classList.add('error');
                    }, { once: true });
                    
                    img.src = src;
                    img.removeAttribute('data-src');
                    lazyLoadObserver.unobserve(img);
                }
            }
        });
    }, imageObserverOptions);

    // Setup lazy loading for images
    const images = document.querySelectorAll('.gallery-item img[data-src]');
    console.log('Setting up lazy loading for', images.length, 'images');
    images.forEach(img => {
        img.classList.add('lazy');
        lazyLoadObserver.observe(img);
    });
}

// Nuova funzione per aggiornare l'array currentImages
function updateCurrentImagesArray() {
    const galleryItems = document.querySelectorAll('.gallery-item img');
    currentImages = Array.from(galleryItems).map(img => ({
        src: img.src || img.getAttribute('data-src'), // Usa data-src se src non è disponibile
        caption: img.alt
    }));
    console.log('Updated currentImages array, now contains:', currentImages.length, 'images');
}

function initializeImageLoader() {
    console.log('initializeImageLoader called');
    
    const galleryContainer = document.querySelector('.gallery-container');
    const loader = document.getElementById('galleryLoader');
    const loaderPercentage = document.getElementById('loaderPercentage');
    const loaderProgressBar = document.getElementById('loaderProgressBar');
    
    // Count all images, but only wait for the first few to load on mobile
    const allImages = document.querySelectorAll('.gallery-item img');
    const immediateImages = document.querySelectorAll('.gallery-item img:not([data-src])'); // Images that load immediately (no data-src)
    
    console.log('Found elements:', {
        galleryContainer: !!galleryContainer,
        loader: !!loader,
        loaderPercentage: !!loaderPercentage,
        loaderProgressBar: !!loaderProgressBar,
        totalImages: allImages.length,
        immediateImages: immediateImages.length,
        isMobile: isMobile
    });
    
    let loadedCount = 0;
    // Wait only for immediate images to load before showing gallery
    const imagesToWaitFor = immediateImages.length;
    
    // Inizializza la galleria come nascosta
    galleryContainer.classList.remove('loaded');
    
    // Se non ci sono immagini, nascondi il loader immediatamente
    if (imagesToWaitFor === 0) {
        console.log('No immediate images found, hiding loader and showing gallery anyway...');
        hideLoader();
        showGallery();
        return;
    }
    
    // Funzione per aggiornare il progresso
    function updateProgress() {
        const percentage = Math.round((loadedCount / imagesToWaitFor) * 100);
        console.log(`Progress: ${loadedCount}/${imagesToWaitFor} (${percentage}%)`);
        
        if (loaderPercentage) loaderPercentage.textContent = percentage + '%';
        if (loaderProgressBar) loaderProgressBar.style.width = percentage + '%';
        
        // Quando le immagini immediate sono caricate
        if (loadedCount >= imagesToWaitFor) {
            console.log('Initial images loaded, showing gallery...');
            setTimeout(() => {
                hideLoader();
                showGallery();
            }, 500); // Piccolo delay per far vedere il 100%
        }
    }
    
    // Funzione per nascondere il loader
    function hideLoader() {
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }
    
    // Funzione per mostrare la galleria
    function showGallery() {
        console.log('Showing gallery...');
        
        // Initialize everything but keep gallery hidden
        initializeGallery();
        initializeFilters();
        initializeFloatingMenu();
        initializeAdvancedFilters();
        initializeLightbox();
        
        // Calculate masonry layout BEFORE showing gallery
        initializeMasonry();
        
        // Small delay to ensure layout is calculated, then show gallery
        setTimeout(() => {
            // Always use masonry view
            galleryContainer.className = 'gallery-container masonry-view';
            galleryContainer.classList.add('loaded');
            console.log('Gallery is now visible with correct layout');
            
            // Initialize lazy loading AFTER gallery is shown
            initializeLazyLoading();
        }, 50);
        
        // Aggiunge event listener a TUTTE le immagini (anche lazy)
        const allImages = document.querySelectorAll('.gallery-item img');
        console.log('Adding direct event listeners to', allImages.length, 'images (including lazy)');
        allImages.forEach((img, index) => {
            img.addEventListener('click', (e) => {
                const imgSrc = img.src || img.getAttribute('data-src');
                console.log('Direct click on image', index, imgSrc);
                if (imgSrc) {
                    openLightbox(imgSrc, img.alt);
                }
            });
            img.style.cursor = 'pointer';
        });
        
        console.log('Gallery initialized successfully');
    }
    
    // Only monitor immediate images (the ones with src attribute)
    const imagesToMonitor = Array.from(immediateImages);
    
    // Gestisci il caricamento di ogni immagine immediata
    imagesToMonitor.forEach((img, index) => {
        if (img.complete && img.naturalHeight !== 0) {
            // Immagine già caricata
            loadedCount++;
            updateProgress();
        } else {
            // Immagine non ancora caricata
            const loadHandler = () => {
                loadedCount++;
                updateProgress();
                img.removeEventListener('load', loadHandler);
            };
            
            const errorHandler = () => {
                // Anche in caso di errore, conta come "caricata" per il progresso
                loadedCount++;
                updateProgress();
                img.removeEventListener('error', errorHandler);
            };
            
            img.addEventListener('load', loadHandler);
            img.addEventListener('error', errorHandler);
        }
    });
    
    // Aggiorna il progresso iniziale nel caso alcune immagini siano già caricate
    updateProgress();
}

// Make openLightbox available globally for HTML onclick
window.openLightbox = openLightbox;

function initializeGallery() {
    // Usa la nuova funzione unificata per aggiornare currentImages
    updateCurrentImagesArray();
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
        src: img.src || img.getAttribute('data-src'), // Include anche le immagini lazy non ancora caricate
        caption: img.alt
    }));
    console.log('Updated currentImages for filter:', filter, 'Total images:', currentImages.length);
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
    
    // Aggiorna l'array currentImages prima di cercare l'immagine
    updateCurrentImagesArray();
    
    // Find the index of the clicked image - cerca sia in src che in data-src
    currentIndex = currentImages.findIndex(img => 
        img.src === imageSrc || 
        img.src.endsWith(imageSrc.split('/').pop()) || // Confronta solo il nome del file
        imageSrc.includes(img.src.split('/').pop())
    );
    
    console.log('Image index:', currentIndex, 'Total images:', currentImages.length);
    console.log('Looking for image:', imageSrc);
    console.log('Available images:', currentImages.map(img => img.src));
    
    if (currentIndex === -1) {
        console.warn('Image not found in currentImages, defaulting to index 0');
        currentIndex = 0;
    }
    
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
    if (lightbox && lightbox.style.display === 'block') {
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

// Floating Menu Functionality - only for filters now
function initializeFloatingMenu() {
    // No view mode buttons anymore, only masonry layout
    console.log('Floating menu initialized (filters only)');
}

// Advanced Filters
function initializeAdvancedFilters() {
    // Evita di inizializzare più volte
    if (window.filtersInitialized) {
        console.log('Filters already initialized, skipping...');
        return;
    }
    window.filtersInitialized = true;
    
    const filterButtons = document.querySelectorAll('.floating-btn[data-filter]');
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    console.log('initializeAdvancedFilters called');
    console.log('Found filter buttons:', filterButtons.length);
    console.log('Found gallery items:', galleryItems.length);
    
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
    console.log('Years found:', Array.from(years));
    console.log('Months found:', Array.from(months));
    console.log('Locations found:', Array.from(locations));
    
    populateFilterOptions('yearOptions', Array.from(years).sort().reverse());
    populateFilterOptions('monthOptions', Array.from(months).sort().reverse());
    populateFilterOptions('locationOptions', Array.from(locations).sort());
    
    console.log('Filter options populated successfully');
    
    // Setup filter button events
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filterType = btn.getAttribute('data-filter');
            const dropdown = document.getElementById(`${filterType}Dropdown`);
            
            console.log('Filter button clicked:', filterType);
            console.log('Dropdown found:', !!dropdown);
            
            // Close other dropdowns
            document.querySelectorAll('.filter-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('show');
            });
            
            // Toggle current dropdown
            if (dropdown) {
                dropdown.classList.toggle('show');
                console.log('Dropdown is now:', dropdown.classList.contains('show') ? 'VISIBLE' : 'HIDDEN');
            }
        });
        
        console.log('Event listener added to filter button:', btn.getAttribute('data-filter'));
    });
    
    // Setup reset button
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetAllFilters();
        });
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        // Non fare nulla se il click è su un pulsante filtro o sul dropdown stesso
        if (!e.target.closest('.floating-btn') && !e.target.closest('.filter-dropdown')) {
            document.querySelectorAll('.filter-dropdown').forEach(d => {
                d.classList.remove('show');
            });
        }
    });
}

function populateFilterOptions(containerId, options) {
    const container = document.getElementById(containerId);
    const filterType = containerId.replace('Options', '');
    
    console.log('Populating options for:', containerId, 'Options:', options, 'Container:', container);
    
    if (!container) {
        console.error('Container not found for:', containerId);
        return;
    }
    
    // Clear existing options first
    container.innerHTML = '';
    
    // Add "All" option
    const allOption = document.createElement('button');
    allOption.className = 'filter-option active';
    allOption.textContent = 'Tutti';
    allOption.addEventListener('click', () => {
        console.log('Clicking "Tutti" for filter:', filterType);
        applyAdvancedFilter(filterType, null);
        updateActiveFilterOption(container, allOption);
        // Reset filter button text
        resetFilterButtonText(filterType);
    });
    container.appendChild(allOption);
    
    // Add specific options
    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'filter-option';
        const displayText = option.includes('-') ? option.split('-')[1] : option;
        const value = option.split('-')[0];
        
        btn.textContent = displayText;
        btn.setAttribute('data-value', value);
        btn.addEventListener('click', () => {
            console.log('Clicking filter option:', displayText, 'value:', value, 'for filter:', filterType);
            applyAdvancedFilter(filterType, value);
            updateActiveFilterOption(container, btn);
            // Update filter button text
            updateFilterButtonText(filterType, displayText, value);
        });
        container.appendChild(btn);
    });
    
    console.log('Total options created in', containerId, ':', container.children.length);
}

function resetFilterButtonText(filterType) {
    const filterBtn = document.querySelector(`[data-filter="${filterType}"]`);
    const filterText = filterBtn.querySelector('.filter-text');
    
    if (filterText) {
        // Reset to original text
        switch(filterType) {
            case 'year':
                filterText.textContent = 'anno';
                break;
            case 'month':
                filterText.textContent = 'mese';
                break;
            case 'location':
                filterText.textContent = 'luogo';
                break;
        }
    }
    
    // Remove active class
    filterBtn.classList.remove('active');
    
    // Check if we should hide reset button
    checkResetButtonVisibility();
}

function updateFilterButtonText(filterType, displayText, value) {
    const filterBtn = document.querySelector(`[data-filter="${filterType}"]`);
    const filterText = filterBtn.querySelector('.filter-text');
    
    if (filterText) {
        // Use the value for year, displayText for others
        if (filterType === 'year') {
            filterText.textContent = value;
        } else {
            filterText.textContent = displayText.toLowerCase();
        }
    }
    
    // Add active class
    filterBtn.classList.add('active');
    
    // Show reset button
    showResetButton();
}

function updateActiveFilterOption(container, activeBtn) {
    container.querySelectorAll('.filter-option').forEach(btn => {
        btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
}

function applyAdvancedFilter(filterType, value) {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    console.log('Applying filter:', filterType, 'with value:', value);
    console.log('Found gallery items:', galleryItems.length);
    
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
        let hiddenCount = 0;
        galleryItems.forEach(item => {
            const category = item.getAttribute('data-category');
            let show = true;
            
            console.log('Checking item with category:', category);
            
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
                hiddenCount++;
            }
        });
        console.log('Hidden items:', hiddenCount, 'Visible items:', galleryItems.length - hiddenCount);
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

function showResetButton() {
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
        resetBtn.classList.add('show');
    }
}

function hideResetButton() {
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
        resetBtn.classList.remove('show');
    }
}

function checkResetButtonVisibility() {
    const activeFilters = document.querySelectorAll('.floating-btn[data-filter].active');
    if (activeFilters.length === 0) {
        hideResetButton();
    }
}

function resetAllFilters() {
    // Reset all filter button texts
    resetFilterButtonText('year');
    resetFilterButtonText('month');
    resetFilterButtonText('location');
    
    // Reset all filter options to "Tutti"
    document.querySelectorAll('.filter-options').forEach(container => {
        const allOption = container.querySelector('.filter-option[data-value=""]') || 
                         container.querySelector('.filter-option:first-child');
        if (allOption) {
            allOption.click();
        }
    });
    
    // Show all gallery items
    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach(item => {
        item.style.display = '';
        item.style.opacity = '';
        item.style.position = '';
        item.style.left = '';
        item.style.top = '';
    });
    
    // Re-layout masonry
    setTimeout(() => {
        layoutMasonry();
    }, 100);
    
    // Update current images for lightbox
    updateCurrentImages('*');
    
    // Close all dropdowns
    document.querySelectorAll('.filter-dropdown').forEach(d => {
        d.classList.remove('show');
    });
    
    // Hide reset button
    hideResetButton();
    
    console.log('All filters reset');
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
    // Calculate initial layout immediately
    layoutMasonry();
    
    // Re-layout on window resize with mobile-optimized timing
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        const delay = isMobile ? 500 : 250; // Longer delay on mobile
        resizeTimer = setTimeout(layoutMasonry, delay);
    });
    
    // Set up listeners for future image loads (lazy images)
    const lazyImages = document.querySelectorAll('.gallery-item img[data-src]');
    lazyImages.forEach(img => {
        img.addEventListener('load', () => {
            debouncedLayoutMasonry();
        }, { once: true });
    });
}

function layoutMasonry() {
    const container = document.querySelector('.masonry-grid');
    if (!container) return;
    
    // Considera solo gli elementi visibili (non nascosti dal filtro)
    const items = Array.from(container.querySelectorAll('.gallery-item')).filter(item => {
        return item.style.display !== 'none';
    });
    
    if (items.length === 0) return;
    
    console.log('Calculating masonry layout for', items.length, 'items');
    
    // Skip if grid view is active
    if (container.closest('.gallery-container').classList.contains('grid-view')) {
        return;
    }
    
    const containerWidth = container.offsetWidth - 16; // minus padding
    const gap = 8;
    
    // Determine columns based on screen width - force simpler layout on mobile
    let columns = 5;
    if (window.innerWidth <= 1400) columns = 4;
    if (window.innerWidth <= 1200) columns = 3;
    if (window.innerWidth <= 768) columns = 2;
    if (window.innerWidth <= 480) columns = 1;
    
    // On mobile, limit to max 2 columns to reduce calculations
    if (isMobile && columns > 2) {
        columns = 2;
    }
    
    // Add column class
    container.className = container.className.replace(/columns-\d+/g, '') + ` columns-${columns}`;
    
    const itemWidth = (containerWidth - (gap * (columns - 1))) / columns;
    const columnHeights = new Array(columns).fill(0);
    
    // On mobile, process fewer items at once to avoid memory issues
    const itemsToProcess = isMobile ? items.slice(0, 50) : items;
    
    itemsToProcess.forEach((item, index) => {
        const img = item.querySelector('img');
        if (!img) return;
        
        // Skip lazy images that haven't loaded yet (but don't skip if they're loading)
        if (img.classList.contains('lazy') && !img.src) return;
        
        // For images that are loaded or loading, calculate dimensions
        let itemHeight;
        let imgWidth = img.naturalWidth || img.width;
        let imgHeight = img.naturalHeight || img.height;
        
        // If image is loading but dimensions aren't available yet, use fallback
        if ((!imgWidth || !imgHeight) && img.src) {
            // For images that are loading, use a reasonable default
            itemHeight = isMobile ? 250 : 350;
        } else if (imgWidth && imgHeight) {
            // Calculate based on actual dimensions
            itemHeight = (itemWidth * imgHeight) / imgWidth;
        } else {
            // Fallback for other cases
            itemHeight = isMobile ? 200 : 300;
        }
        
        // Find column with minimum height
        const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
        
        // Position the item
        const left = shortestColumn * (itemWidth + gap);
        const top = columnHeights[shortestColumn];
        
        item.style.position = 'absolute';
        item.style.left = left + 'px';
        item.style.top = top + 'px';
        item.style.width = itemWidth + 'px';
        
        // Update column height
        columnHeights[shortestColumn] += itemHeight + gap;
    });
    
    // Set container height
    const maxHeight = Math.max(...columnHeights);
    container.style.height = maxHeight + 'px';
    
    // On mobile, clean up memory periodically
    if (isMobile && items.length > itemsToProcess.length) {
        console.log('Mobile: processed', itemsToProcess.length, 'of', items.length, 'items');
    }
} 