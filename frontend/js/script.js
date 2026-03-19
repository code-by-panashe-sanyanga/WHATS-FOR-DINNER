// I handle shared front end behaviour here so page interactions stay consistent.
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
    const pathname = window.location.pathname.toLowerCase();
    const inCountriesFolder = pathname.includes('/countries/');
    const inPagesFolder = pathname.includes('/pages/');

    const isSharedAsset = path.startsWith('assets/') || path.startsWith('styles/') || path.startsWith('js/');
    const isCountryRoute = path.startsWith('countries/');

    if (inCountriesFolder) {
        if (isSharedAsset || isCountryRoute) return `../../${path}`;
        return `../../pages/${path}`;
    }

    if (inPagesFolder) {
        if (isSharedAsset || isCountryRoute) return `../${path}`;
        return path;
    }

    return path;
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
        { keywords: ['cheeseburger', 'burger'], path: 'countries/american/cheeseburger.html' },
        { keywords: ['kung pao', 'kung-pao'], path: 'countries/chinese/kung-pao-chicken.html' },
        { keywords: ['sweet and sour', 'sweet sour', 'pork'], path: 'countries/chinese/sweet-sour-pork.html' },
        { keywords: ['ma po', 'mapo', 'tofu'], path: 'countries/chinese/ma-po-tofu.html' },
        { keywords: ['biryani'], path: 'countries/indian/biryani.html' },
        { keywords: ['butter chicken'], path: 'countries/indian/butter-chicken.html' },
        { keywords: ['chole'], path: 'countries/indian/chole.html' },
        { keywords: ['palak paneer', 'palak'], path: 'countries/indian/palakpaneer.html' },
        { keywords: ['samosa', 'samosas'], path: 'countries/indian/samosas.html' },
        { keywords: ['prawn masala'], path: 'countries/indian/prawn-masala.html' },
        { keywords: ['dataset', 'ingredients dataset', 'recipe dataset', 'kaggle'], path: 'dataset.html' },
        { keywords: ['american'], path: 'countries/american/index.html' },
        { keywords: ['chinese'], path: 'countries/chinese/index.html' },
        { keywords: ['english'], path: 'countries/english/index.html' },
        { keywords: ['french'], path: 'countries/french/index.html' },
        { keywords: ['indian'], path: 'countries/indian/index.html' },
        { keywords: ['italian'], path: 'countries/italian/index.html' },
        { keywords: ['japanese'], path: 'countries/japanese/index.html' },
        { keywords: ['mexican'], path: 'countries/mexican/index.html' },
        { keywords: ['spanish'], path: 'countries/spanish/index.html' },
        { keywords: ['thai'], path: 'countries/thai/index.html' }
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
    const pathname = window.location.pathname.toLowerCase();
    const pageBase = pathname.includes('/countries/') ? '../../pages/' : '';

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
                <a href="${pageBase}index.html">HOME</a>
                <a href="${pageBase}recipes.html">RECIPES</a>
                <a href="${pageBase}meal-inspo.html">MEAL INSPIRATION</a>
                <a href="${pageBase}about.html">ABOUT</a>
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

    if (carouselAutoRotateHandle) {
        clearInterval(carouselAutoRotateHandle);
    }

    carouselAutoRotateHandle = setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }, 5000);
}
// -ISH OF THE DAY (24hr rotation) 

const dailyDishes = [
    {
        title: "Cheeseburger",
        description: "A classic American staple with a juicy beef patty, melted cheese, and fresh toppings.",
        image: "https://commons.wikimedia.org/wiki/Special:FilePath/Cheeseburger.png",
        link: "countries/american/cheeseburger.html",
        country: "America"
    },
    {
        title: "Sweet and Sour Pork",
        description: "Crispy pork coated in a tangy, sweet, and sour sauce with vibrant peppers.",
        image: "https://commons.wikimedia.org/wiki/Special:FilePath/Sweet-and-sour_pork.jpg",
        link: "countries/chinese/sweet-sour-pork.html",
        country: "China"
    },
    {
        title: "Kung Pao Chicken",
        description: "Spicy stir-fried chicken with peanuts, vegetables, and chili peppers in a savory sauce.",
        image: "https://commons.wikimedia.org/wiki/Special:FilePath/Gongbao_Jiding_Iron_Pot_in_China.jpeg",
        link: "countries/chinese/kung-pao-chicken.html",
        country: "China"
    },
    {
        title: "Ma Po Tofu",
        description: "Bold Sichuan tofu dish with minced pork, rich chili bean paste, and numbing peppercorns.",
        image: "https://commons.wikimedia.org/wiki/Special:FilePath/Homemade_Mapo_doufu.jpg",
        link: "countries/chinese/ma-po-tofu.html",
        country: "China"
    },
    {
        title: "Peking Duck",
        description: "Iconic roasted duck with crispy lacquered skin, served with thin pancakes and hoisin sauce.",
        image: "https://commons.wikimedia.org/wiki/Special:FilePath/Peking_Duck_1.jpg",
        link: "countries/chinese/peking-duck.html",
        country: "China"
    },
    {
        title: "Butter Chicken",
        description: "Tender chicken in a rich, creamy tomato sauce with aromatic spices — pure comfort food.",
        image: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=1000&q=80",
        link: "countries/indian/butter-chicken.html",
        country: "India"
    },
    {
        title: "Palak Paneer",
        description: "Soft paneer cheese in a velvety spiced spinach gravy, a beloved vegetarian classic.",
        image: "https://commons.wikimedia.org/wiki/Special:FilePath/Cottage_cheese_in_spinach_gravy(palak_paneer).jpg",
        link: "countries/indian/palakpaneer.html",
        country: "India"
    },
    {
        title: "Biryani",
        description: "Fragrant basmati rice layered with spiced meat and aromatics, a festive Indian classic.",
        image: "https://commons.wikimedia.org/wiki/Special:FilePath/Hyderabadi_egg_biryani.jpg",
        link: "countries/indian/biryani.html",
        country: "India"
    },
    {
        title: "Samosas",
        description: "Golden crispy pastry pockets filled with spiced potatoes and peas, perfect as a snack.",
        image: "https://commons.wikimedia.org/wiki/Special:FilePath/Vegetable_Samosa.jpg",
        link: "countries/indian/samosas.html",
        country: "India"
    }
];

const quickInspoMeals = [
    {
        title: 'Cheeseburger',
        country: 'America',
        description: 'Juicy beef patty, melted cheese, and crisp toppings.',
        image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cheeseburger.png',
        link: 'countries/american/cheeseburger.html'
    },
    {
        title: 'Fish and Chips',
        country: 'England',
        description: 'Crispy battered fish with golden chips and lemon.',
        image: 'https://images.unsplash.com/photo-1576777647209-e8733d7b851d?auto=format&fit=crop&w=1000&q=80',
        link: 'countries/english/fish-and-chips.html'
    },
    {
        title: 'Croissant',
        country: 'France',
        description: 'Buttery, flaky pastry baked until deeply golden.',
        image: 'https://images.pexels.com/photos/2135/food-france-morning-breakfast.jpg?auto=compress&cs=tinysrgb&w=1000',
        link: 'countries/french/croissant.html'
    },
    {
        title: 'Butter Chicken',
        country: 'India',
        description: 'Creamy tomato curry with warm spices and tender chicken.',
        image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=1000&q=80',
        link: 'countries/indian/butter-chicken.html'
    },
    {
        title: 'Spaghetti',
        country: 'Italy',
        description: 'Classic pasta tossed in rich tomato sauce and herbs.',
        image: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=1000',
        link: 'countries/italian/spaghetti.html'
    },
    {
        title: 'Sushi',
        country: 'Japan',
        description: 'Fresh rice rolls with seafood and delicate seasonings.',
        image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=1000&q=80',
        link: 'countries/japanese/sushi.html'
    },
    {
        title: 'Tacos',
        country: 'Mexico',
        description: 'Warm tortillas loaded with savory fillings and salsa.',
        image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1000&q=80',
        link: 'countries/mexican/tacos.html'
    },
    {
        title: 'Paella',
        country: 'Spain',
        description: 'Saffron rice with seafood and bold Mediterranean flavor.',
        image: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=1000&q=80',
        link: 'countries/spanish/paella.html'
    },
    {
        title: 'Pad Thai',
        country: 'Thailand',
        description: 'Stir-fried rice noodles with peanuts and lime.',
        image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=1000&q=80',
        link: 'countries/thai/pad-thai.html'
    },
    {
        title: 'Kung Pao Chicken',
        country: 'China',
        description: 'Spicy chicken stir-fry with peanuts and chili heat.',
        image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Gongbao_Jiding_Iron_Pot_in_China.jpeg',
        link: 'countries/chinese/kung-pao-chicken.html'
    }
];

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