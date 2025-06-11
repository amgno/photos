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
    initializeGallery();
    initializeFilters();
});

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
                    item.style.display = 'inline-block';
                } else {
                    const category = item.getAttribute('data-category');
                    if (category === filterValue) {
                        item.style.display = 'inline-block';
                    } else {
                        item.style.display = 'none';
                    }
                }
            });

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

// Lightbox functionality
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

function openLightbox(imageSrc, caption) {
    // Find the index of the clicked image
    currentIndex = currentImages.findIndex(img => img.src === imageSrc);
    
    if (currentIndex === -1) currentIndex = 0;
    
    showLightboxImage();
    lightbox.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.style.overflow = 'auto';
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

// Event listeners for lightbox
lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', previousImage);
lightboxNext.addEventListener('click', nextImage);

// Close lightbox when clicking outside the image
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});

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

// Lazy loading optimization
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.style.opacity = '0';
                img.style.transition = 'opacity 0.3s ease';
                img.onload = () => {
                    img.style.opacity = '1';
                };
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('.gallery-item img').forEach(img => {
        imageObserver.observe(img);
    });
}

// Performance optimization: debounced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Re-initialize masonry layout if needed
        initializeGallery();
    }, 250);
}); 