// Hero click redirection
const mainPlate = document.getElementById('main-plate');
if (mainPlate) {
    mainPlate.addEventListener('click', () => {
        const target = mainPlate.dataset.targetLink;
        window.location.href = target ? rel(target) : rel('recipes.html');
    });
}

const sectionFolders = [
    'american',
    'chinese',
    'english',
    'french',
    'indian',
    'italian',
    'japanese',
    'mexican',
    'spanish',
    'thai'
];

function isSectionPage() {
    const path = window.location.pathname.toLowerCase();
    return sectionFolders.some(folder => path.includes(`/${folder}/`));
}

function rel(path) {
    return isSectionPage() ? `../${path}` : path;
}

const favoritesStore = {
    loaded: false,
    ids: new Set()
};

function getAuthToken() {
    return localStorage.getItem('wfdAuthToken') || '';
}

function safeAttr(value) {
    return String(value || '').replace(/"/g, '&quot;');
}

function getFavoriteDishId(meal) {
    if (meal?.link) return meal.link;
    return String(meal?.title || '').trim().toLowerCase().replace(/\s+/g, '-');
}

async function apiRequest(path, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(path, {
        ...options,
        headers
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload?.error || 'Request failed';
        throw new Error(message);
    }

    return payload;
}

async function ensureFavoriteStateLoaded() {
    const token = getAuthToken();
    if (!token) {
        favoritesStore.ids = new Set();
        favoritesStore.loaded = true;
        syncFavoritesHeaderIcon();
        return;
    }

    try {
        const data = await apiRequest('/api/customers/me');
        const ids = (data.favorites || []).map(item => item.dish_id);
        favoritesStore.ids = new Set(ids);
        favoritesStore.loaded = true;
    } catch (error) {
        localStorage.removeItem('wfdAuthToken');
        localStorage.removeItem('wfdCustomerName');
        favoritesStore.ids = new Set();
        favoritesStore.loaded = true;
    }

    syncFavoriteButtons();
    syncFavoritesHeaderIcon();
}

function syncFavoriteButtons() {
    const buttons = Array.from(document.querySelectorAll('.favorite-btn'));
    buttons.forEach(button => {
        const dishId = button.dataset.dishId;
        const isFavorite = favoritesStore.ids.has(dishId);
        button.classList.toggle('is-favorite', isFavorite);
        button.textContent = isFavorite ? '♥' : '♡';
    });
}

function syncFavoritesHeaderIcon() {
    const links = Array.from(document.querySelectorAll('.fav-icon-link'));
    const hasFavorites = favoritesStore.ids.size > 0;
    links.forEach(link => {
        link.classList.toggle('has-favorites', hasFavorites);
        link.textContent = hasFavorites ? '♥' : '♡';
        link.setAttribute('aria-label', hasFavorites ? 'View favourites (saved)' : 'View favourites');
    });
}

function favoriteButtonMarkup(meal) {
    return `<button class="favorite-btn" type="button" data-dish-id="${safeAttr(getFavoriteDishId(meal))}" data-title="${safeAttr(meal.title)}" data-link="${safeAttr(meal.link)}" data-image="${safeAttr(meal.image)}" data-country="${safeAttr(meal.country || '')}" aria-label="Save ${safeAttr(meal.title)} to favourites">♡</button>`;
}

async function toggleFavoriteFromButton(button) {
    const token = getAuthToken();
    if (!token) {
        window.location.href = rel('signin.html');
        return;
    }

    const dishId = button.dataset.dishId;
    const isFavorite = favoritesStore.ids.has(dishId);

    button.disabled = true;
    try {
        if (isFavorite) {
            await apiRequest(`/api/favorites/${encodeURIComponent(dishId)}`, {
                method: 'DELETE'
            });
            favoritesStore.ids.delete(dishId);
        } else {
            await apiRequest('/api/favorites', {
                method: 'POST',
                body: JSON.stringify({
                    dishId,
                    title: button.dataset.title,
                    link: button.dataset.link,
                    image: button.dataset.image,
                    country: button.dataset.country
                })
            });
            favoritesStore.ids.add(dishId);
        }
    } catch (error) {
        alert(error.message || 'Could not update favourites right now.');
    } finally {
        button.disabled = false;
        syncFavoriteButtons();
        syncFavoritesHeaderIcon();
    }
}

function ensureFavoriteButtonBehavior() {
    document.addEventListener('click', (event) => {
        const button = event.target.closest('.favorite-btn');
        if (!button) return;
        event.preventDefault();
        toggleFavoriteFromButton(button);
    });
}

function ensureSocialLinks() {
    const topBar = document.querySelector('.top-bar');
    if (!topBar) return;

    let socialLinks = topBar.querySelector('.social-links');
    if (!socialLinks) {
        socialLinks = document.createElement('div');
        socialLinks.className = 'social-links';

        const existingAnchors = topBar.querySelectorAll('a');
        existingAnchors.forEach(anchor => socialLinks.appendChild(anchor));

        topBar.appendChild(socialLinks);
    }

    const iconBase = rel('assets/icons/');
    const socialConfig = [
        { href: 'https://instagram.com', title: 'Instagram', icon: 'instagram.svg' },
        { href: 'https://x.com', title: 'X', icon: 'x.svg' },
        { href: 'https://facebook.com', title: 'Facebook', icon: 'facebook.svg' }
    ];

    socialLinks.innerHTML = socialConfig.map(item => (
        `<a href="${item.href}" title="${item.title}">` +
        `<img src="${iconBase}${item.icon}" alt="${item.title}">` +
        '</a>'
    )).join('');
}

function ensureNavigationLinks() {
    const nav = document.querySelector('.nav-container nav');
    if (!nav) return;

    const links = [
        { text: 'HOME', href: rel('index.html') },
        { text: 'RECIPES', href: rel('recipes.html') },
        { text: 'MEAL INSPIRATION', href: rel('meal-inspo.html') },
        { text: 'ABOUT', href: rel('about.html') }
    ];

    nav.innerHTML = links.map(link => `<a href="${link.href}">${link.text}</a>`).join('');
}

function getSearchTarget(term) {
    const query = term.trim().toLowerCase();
    if (!query) return null;

    const routes = [
        { keywords: ['cheeseburger', 'burger'], path: 'american/cheeseburger.html' },
        { keywords: ['kung pao', 'kung-pao'], path: 'chinese/kung-pao-chicken.html' },
        { keywords: ['sweet and sour', 'sweet sour', 'pork'], path: 'chinese/sweet-sour-pork.html' },
        { keywords: ['ma po', 'mapo', 'tofu'], path: 'chinese/ma-po-tofu.html' },
        { keywords: ['biryani'], path: 'indian/biryani.html' },
        { keywords: ['butter chicken'], path: 'indian/butter-chicken.html' },
        { keywords: ['chole'], path: 'indian/chole.html' },
        { keywords: ['palak paneer', 'palak'], path: 'indian/palakpaneer.html' },
        { keywords: ['samosa', 'samosas'], path: 'indian/samosas.html' },
        { keywords: ['prawn masala'], path: 'indian/prawn-masala.html' },
        { keywords: ['dataset', 'ingredients dataset', 'recipe dataset', 'kaggle'], path: 'dataset.html' },
        { keywords: ['american'], path: 'american/index.html' },
        { keywords: ['chinese'], path: 'chinese/index.html' },
        { keywords: ['english'], path: 'english/index.html' },
        { keywords: ['french'], path: 'french/index.html' },
        { keywords: ['indian'], path: 'indian/index.html' },
        { keywords: ['italian'], path: 'italian/index.html' },
        { keywords: ['japanese'], path: 'japanese/index.html' },
        { keywords: ['mexican'], path: 'mexican/index.html' },
        { keywords: ['spanish'], path: 'spanish/index.html' },
        { keywords: ['thai'], path: 'thai/index.html' }
    ];

    const match = routes.find(route => route.keywords.some(keyword => query.includes(keyword)));
    if (match) {
        if (match.path === 'dataset.html') return rel('dataset.html');
        return rel(match.path);
    }

    return `${rel('dataset.html')}?q=${encodeURIComponent(query)}`;
}

function ensureSearchUIAndBehavior() {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;

    let navActions = navContainer.querySelector('.nav-actions');
    if (!navActions) {
        navActions = document.createElement('div');
        navActions.className = 'nav-actions';
        navActions.innerHTML = `
            <input type="text" class="site-search" placeholder="SEARCH" />
            <a class="fav-icon-link" href="${rel('signin.html')}#favorites" title="Favourites" aria-label="View favourites">♡</a>
            <a class="btn-signin" href="${rel('signin.html')}">SIGN IN</a>
        `;
        navContainer.appendChild(navActions);
    }

    let searchInput = navActions.querySelector('input');
    if (!searchInput) {
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'site-search';
        searchInput.placeholder = 'SEARCH';
        navActions.prepend(searchInput);
    }

    let searchButton = navActions.querySelector('.search-submit');
    let authButton = navActions.querySelector('.btn-signin:not(.search-submit)');
    if (!authButton) {
        authButton = document.createElement('button');
        authButton.className = 'btn-signin';
        authButton.type = 'button';
        authButton.textContent = 'SIGN IN';
        navActions.appendChild(authButton);
    }

    let favIconLink = navActions.querySelector('.fav-icon-link');
    if (!favIconLink) {
        favIconLink = document.createElement('a');
        favIconLink.className = 'fav-icon-link';
        favIconLink.href = `${rel('signin.html')}#favorites`;
        favIconLink.title = 'Favourites';
        favIconLink.textContent = '♡';
        navActions.insertBefore(favIconLink, authButton);
    }

    const customerName = localStorage.getItem('wfdCustomerName');
    if (customerName) {
        authButton.textContent = 'SIGN OUT';
        if (authButton.tagName === 'A') authButton.href = '#';
        authButton.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.removeItem('wfdAuthToken');
            localStorage.removeItem('wfdCustomerName');
            window.location.reload();
        }, { once: true });
    } else {
        authButton.textContent = 'SIGN IN';
        if (authButton.tagName === 'A') {
            authButton.href = rel('signin.html');
        } else {
            authButton.addEventListener('click', () => {
                window.location.href = rel('signin.html');
            }, { once: true });
        }
    }

    syncFavoritesHeaderIcon();

    const runSearch = () => {
        const target = getSearchTarget(searchInput.value || '');
        if (target) {
            window.location.href = target;
        }
    };

    if (searchButton) {
        searchButton.addEventListener('click', runSearch);
    }
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            runSearch();
        }
    });
}

function normalizeFooter() {
    const footer = document.querySelector('footer');
    if (!footer) return;

    const iconBase = rel('assets/icons/');
    const base = isSectionPage() ? '../' : '';

    footer.innerHTML = `
        <div class="footer-inner">
            <div class="footer-socials">
                <a href="https://instagram.com" title="Instagram" target="_blank" rel="noopener">
                    <img src="${iconBase}instagram.svg" alt="Instagram" />
                </a>
                <a href="https://x.com" title="X" target="_blank" rel="noopener">
                    <img src="${iconBase}x.svg" alt="X" />
                </a>
                <a href="https://facebook.com" title="Facebook" target="_blank" rel="noopener">
                    <img src="${iconBase}facebook.svg" alt="Facebook" />
                </a>
            </div>
            <nav class="footer-links">
                <a href="${base}index.html">HOME</a>
                <a href="${base}recipes.html">RECIPES</a>
                <a href="${base}meal-inspo.html">MEAL INSPIRATION</a>
                <a href="${base}about.html">ABOUT</a>
            </nav>
            <div class="footer-bottom">WHATS FOR DINNER &copy; 2026</div>
        </div>
    `;
}

function normalizeHeader() {
    ensureSocialLinks();
    ensureNavigationLinks();
    ensureSearchUIAndBehavior();
}

document.addEventListener('DOMContentLoaded', normalizeHeader);
document.addEventListener('DOMContentLoaded', normalizeFooter);

function ensureIngredientSearchBehavior() {
    const ingredientSection = document.querySelector('.ingredient-search');
    if (!ingredientSection) return;

    const inputs = Array.from(ingredientSection.querySelectorAll('.input-row input'));
    const findButton = ingredientSection.querySelector('.btn-primary');
    const clearButton = ingredientSection.querySelector('.btn-secondary');

    if (!inputs.length || !findButton) return;

    const runIngredientSearch = () => {
        const ingredients = inputs
            .map(input => (input.value || '').trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 3);

        if (!ingredients.length) return;

        const countryMealTarget = getSearchTarget(ingredients.join(' '));
        if (countryMealTarget && !countryMealTarget.includes('dataset.html?q=')) {
            window.location.href = countryMealTarget;
            return;
        }

        window.location.href = `${rel('dataset.html')}?ingredients=${encodeURIComponent(ingredients.join(','))}`;
    };

    findButton.addEventListener('click', runIngredientSearch);
    inputs.forEach(input => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                runIngredientSearch();
            }
        });
    });

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            inputs.forEach(input => {
                input.value = '';
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', ensureIngredientSearchBehavior);
document.addEventListener('DOMContentLoaded', ensureFavoriteStateLoaded);
document.addEventListener('DOMContentLoaded', ensureFavoriteButtonBehavior);

function ensureRecipeFilterRouting() {
    const filterButtons = Array.from(document.querySelectorAll('.recipe-filters [data-filter-key]'));
    if (!filterButtons.length) return;

    const targetMap = {
        chicken: `${rel('dataset.html')}?ingredients=${encodeURIComponent('chicken')}`,
        vegetarian: `${rel('dataset.html')}?q=${encodeURIComponent('vegetarian')}`,
        pasta: `${rel('dataset.html')}?ingredients=${encodeURIComponent('pasta')}`,
        under30: `${rel('dataset.html')}?quickFilter=under30`
    };

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filterKey = button.dataset.filterKey;
            const target = targetMap[filterKey] || rel('dataset.html');
            window.location.href = target;
        });
    });
}

document.addEventListener('DOMContentLoaded', ensureRecipeFilterRouting);

//  CAROUSEL LOGIC 

let carouselAutoRotateHandle = null;

function initCarousel(containerSelector = '.carousel-container') {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const slides = Array.from(container.querySelectorAll('.carousel-slide'));
    const nextBtn = container.querySelector('.next');
    const prevBtn = container.querySelector('.prev');

    if (!slides.length || !nextBtn || !prevBtn) return;

    let currentSlide = Math.max(0, slides.findIndex(slide => slide.classList.contains('active')));

    const showSlide = (index) => {
        slides.forEach(slide => slide.classList.remove('active'));
        slides[index].classList.add('active');
    };

    nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    });

    prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
    });

const dailyDishes = [
    {
        title: "Spaghetti Bolognese",
        description: "Classic Italian pasta with rich meat sauce, a timeless favorite enjoyed worldwide.",
        image: "assets/flags/italy.svg",
        link: "italian/",
        country: "Italian"
    },
    {
        title: "Butter Chicken",
        description: "Tender chicken in a creamy tomato sauce with aromatic spices, pure comfort food.",
        image: "assets/flags/india.svg",
        link: "indian/butter-chicken.html",
        country: "Indian"
    },
    {
        title: "Sweet and Sour Pork",
        description: "Crispy pork coated in a tangy, sweet, and sour sauce with vibrant peppers.",
        image: "assets/flags/china.svg",
        link: "chinese/sweet-sour-pork.html",
        country: "Chinese"
    },
    {
        title: "Cheeseburger",
        description: "A classic American staple with juicy beef patty, melted cheese, and fresh toppings.",
        image: "assets/flags/usa.svg",
        link: "american/cheeseburger.html",
        country: "American"
    },
    {
        title: "Pad Thai",
        description: "Stir-fried noodles with shrimp, peanuts, and lime, a true Thai street food favorite.",
        image: "assets/flags/thailand.svg",
        link: "thai/",
        country: "Thai"
    },
    {
        title: "Sushi Platter",
        description: "Fresh, artfully rolled sushi with premium fish and vegetables, a culinary masterpiece.",
        image: "assets/flags/japan.svg",
        link: "japanese/",
        country: "Japanese"
    },
    {
        title: "Chicken Tacos",
        description: "Seasoned grilled chicken in soft tortillas with fresh salsa and toppings.",
        image: "assets/flags/mexico.svg",
        link: "mexican/",
        country: "Mexican"
    },
    {
        title: "Coq au Vin",
        description: "Tender chicken braised in red wine with mushrooms, a French classic.",
        image: "assets/flags/france.svg",
        link: "french/",
        country: "French"
    },
    {
        title: "Fish and Chips",
        description: "Crispy battered fish served with golden chips, a beloved English tradition.",
        image: "assets/flags/england.svg",
        link: "english/",
        country: "English"
    },
    {
        title: "Paella",
        description: "Saffron-infused rice with seafood and vegetables, a Spanish celebration dish.",
        image: "assets/flags/spain.svg",
        link: "spanish/",
        country: "Spanish"
    }
];

function getDailyDish() {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const dishIndex = dayOfYear % dailyDishes.length;
    return dailyDishes[dishIndex];
}

function displayDailyDish() {
    const dailyDishElement = document.getElementById('dailyDish');
    if (!dailyDishElement) return;
    
    const dish = getDailyDish();
    
    dailyDishElement.innerHTML = `
        <div class="dish-content">
            <h4>${dish.title}</h4>
            <p>${dish.description}</p>
            <a href="${dish.link}" class="btn-primary" style="display: inline-block; margin-top: 10px; padding: 8px 16px; text-decoration: none; border-radius: 5px;">View Recipe</a>
        </div>
    `;
}

// Run on page load
document.addEventListener('DOMContentLoaded', displayDailyDish);

function getDailyDish() {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem("dishDate");
    const storedDish = localStorage.getItem("dishName");

function shuffleArray(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function pickRandomMeals(meals, count) {
    const shuffled = shuffleArray(meals);
    const chosen = [];
    const usedCountries = new Set();

    shuffled.forEach(meal => {
        if (chosen.length >= count) return;
        if (!usedCountries.has(meal.country)) {
            chosen.push(meal);
            usedCountries.add(meal.country);
        }
    });

    if (chosen.length < count) {
        shuffled.forEach(meal => {
            if (chosen.length >= count) return;
            if (!chosen.includes(meal)) {
                chosen.push(meal);
            }
        });
    }

    return chosen;
}

function syncHomeHeroWithMeal(meal) {
    if (!meal) return;

    const heroImage = document.querySelector('#main-plate img');
    const heroTitle = document.querySelector('.hero-text-box h1');
    const heroText = document.querySelector('.hero-text-box p');

    if (heroImage) {
        heroImage.src = meal.image;
        heroImage.alt = meal.title;
    }

    if (heroTitle) {
        heroTitle.textContent = `${meal.title.toUpperCase()} FROM ${meal.country.toUpperCase()}`;
    }

    if (heroText) {
        heroText.textContent = meal.description;
    }

    if (mainPlate) {
        mainPlate.dataset.targetLink = meal.link;
        mainPlate.style.cursor = 'pointer';
    }
}

function ensureHomeInspoCards() {
    const grid = document.getElementById('quickInspoGrid');
    if (!grid) return;

    const meals = pickRandomMeals(quickInspoMeals, 6);
    syncHomeHeroWithMeal(meals[0]);
    grid.innerHTML = meals.map(meal => `
        <article class="inspo-card country-inspo-card">
            <div class="circle-img">
                <img src="${meal.image}" alt="${meal.title}" />
            </div>
            <span class="dish-country">${meal.country}</span>
            <h4>${meal.title}</h4>
            <p>${meal.description}</p>
            ${favoriteButtonMarkup(meal)}
            <a class="inspo-link" href="${rel(meal.link)}">View Recipe</a>
        </article>
    `).join('');

    syncFavoriteButtons();
}

function ensureRecipesPageDynamicMeals() {
    const trendingGrid = document.getElementById('recipesTrendingGrid');
    const featuredCarousel = document.getElementById('recipesFeaturedCarousel');
    const recipeNamesGrid = document.getElementById('recipesNameGrid');

    if (!trendingGrid && !featuredCarousel && !recipeNamesGrid) return;

    if (trendingGrid) {
        const trendingMeals = pickRandomMeals(quickInspoMeals, 3);
        trendingGrid.innerHTML = trendingMeals.map(meal => `
            <article class="inspo-card meal-card">
                <img class="meal-thumb" src="${meal.image}" alt="${meal.title}" />
                <span class="dish-country">${meal.country}</span>
                <h4>${meal.title}</h4>
                <p>${meal.description}</p>
                ${favoriteButtonMarkup(meal)}
                <a class="inspo-link" href="${rel(meal.link)}">View Recipe</a>
            </article>
        `).join('');

        syncFavoriteButtons();
    }

    if (featuredCarousel) {
        const featuredMeals = pickRandomMeals(quickInspoMeals, 3);
        featuredCarousel.innerHTML = `
            ${featuredMeals.map((meal, index) => `
                <div class="carousel-slide ${index === 0 ? 'active' : ''}">
                    <img src="${meal.image}" alt="${meal.title}" />
                    <div class="carousel-text">
                        <a class="featured-link" href="${rel(meal.link)}">${meal.title} - ${meal.country}</a>
                    </div>
                </div>
            `).join('')}
            <button class="carousel-btn prev">&#10094;</button>
            <button class="carousel-btn next">&#10095;</button>
        `;

        initCarousel('#recipesFeaturedCarousel');
    }

    if (recipeNamesGrid) {
        const recipeNameMeals = shuffleArray(quickInspoMeals).slice(0, 6);
        recipeNamesGrid.innerHTML = recipeNameMeals.map(meal => `
            <a class="recipe-card" href="${rel(meal.link)}">${meal.title}</a>
        `).join('');
    }
}

function getDailyDish() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    return dailyDishes[dayOfYear % dailyDishes.length];
}

function displayDailyDish() {
    const dailyDishElement = document.getElementById('dailyDish');
    if (!dailyDishElement) return;
    
    const dish = getDailyDish();
    
    dailyDishElement.innerHTML = `
        <h3>DISH OF THE DAY</h3>
        <div class="circle-img">
            <img src="${dish.image}" alt="${dish.title}" />
        </div>
        <div class="dish-content">
            <span class="dish-country">${dish.country}</span>
            <h4>${dish.title}</h4>
            <p>${dish.description}</p>
            ${favoriteButtonMarkup(dish)}
            <a href="${rel(dish.link)}">View Recipe</a>
        </div>
    `;

    syncFavoriteButtons();
}

// Run on page load
document.addEventListener('DOMContentLoaded', displayDailyDish);
document.addEventListener('DOMContentLoaded', ensureHomeInspoCards);
document.addEventListener('DOMContentLoaded', ensureRecipesPageDynamicMeals);
document.addEventListener('DOMContentLoaded', () => initCarousel());

// Also call immediately in case DOM is already loaded
displayDailyDish();
ensureHomeInspoCards();
ensureRecipesPageDynamicMeals();
initCarousel();