// I keep sign in, sign up, and account state handling in this file.
function authToken() {
    return localStorage.getItem('wfdAuthToken') || '';
}

function setAuthSession(token, customer) {
    localStorage.setItem('wfdAuthToken', token);
    localStorage.setItem('wfdCustomerName', customer?.name || 'Customer');
}

function clearAuthSession() {
    localStorage.removeItem('wfdAuthToken');
    localStorage.removeItem('wfdCustomerName');
}

// I keep fetch setup in one place so every auth request sends the same headers.
async function authApi(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (authToken()) {
        headers.Authorization = `Bearer ${authToken()}`;
    }

    const response = await fetch(path, {
        ...options,
        headers
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error || 'Request failed');
    }

    return payload;
}

function showMessage(message, kind = '') {
    const el = document.getElementById('authMessage');
    if (!el) return;

    el.classList.remove('is-error', 'is-success');
    if (kind === 'error') el.classList.add('is-error');
    if (kind === 'success') el.classList.add('is-success');
    el.textContent = message || '';
}

function switchTab(tab) {
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.getElementById('signupForm');
    const tabs = Array.from(document.querySelectorAll('.auth-tab'));

    tabs.forEach(button => {
        button.classList.toggle('is-active', button.dataset.tab === tab);
    });

    if (!signinForm || !signupForm) return;
    signinForm.classList.toggle('is-hidden', tab !== 'signin');
    signupForm.classList.toggle('is-hidden', tab !== 'signup');
    showMessage('');
}

function relForSignInPage(path) {
    return path;
}

function favoriteCardMarkup(item) {
    const image = item.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1000';
    return `
        <article class="favorite-item">
            <img src="${image}" alt="${item.title}" />
            <div class="favorite-item-body">
                <h3>${item.title}</h3>
                <p>${item.country || 'Favourite Dish'}</p>
                <a href="${relForSignInPage(item.link)}">View Recipe</a>
            </div>
        </article>
    `;
}

async function renderLoggedInState() {
    const authShell = document.querySelector('.auth-shell');
    const favoritesShell = document.querySelector('.favorites-shell');
    const welcomeText = document.getElementById('welcomeText');
    const favoritesList = document.getElementById('favoritesList');

    if (!authShell || !favoritesShell || !welcomeText || !favoritesList) return;

    try {
        // I load the signed in profile and switch from forms to account view.
        const data = await authApi('/api/customers/me');
        authShell.classList.add('is-hidden');
        favoritesShell.classList.remove('is-hidden');

        const customerName = data?.customer?.name || localStorage.getItem('wfdCustomerName') || 'Customer';
        welcomeText.textContent = `Welcome back, ${customerName}.`;

        const favorites = data.favorites || [];
        if (!favorites.length) {
            favoritesList.innerHTML = '<p class="favorites-meta">No favourites yet. Tap hearts on meals to save them.</p>';
        } else {
            favoritesList.innerHTML = favorites.map(favoriteCardMarkup).join('');
        }
    } catch (error) {
        clearAuthSession();
        authShell.classList.remove('is-hidden');
        favoritesShell.classList.add('is-hidden');
    }
}

function setupTabUI() {
    const tabs = Array.from(document.querySelectorAll('.auth-tab'));
    tabs.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
}

function setupSignInForm() {
    const form = document.getElementById('signinForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('signinEmail')?.value?.trim();
        const password = document.getElementById('signinPassword')?.value || '';

        try {
            // I send credentials and keep the returned token in local storage.
            const data = await authApi('/api/auth/signin', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            setAuthSession(data.token, data.customer);
            showMessage('Signed in successfully.', 'success');
            await renderLoggedInState();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });
}

function setupSignUpForm() {
    const form = document.getElementById('signupForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.getElementById('signupName')?.value?.trim();
        const email = document.getElementById('signupEmail')?.value?.trim();
        const password = document.getElementById('signupPassword')?.value || '';

        try {
            // I create the account then reuse the same logged in flow.
            const data = await authApi('/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });
            setAuthSession(data.token, data.customer);
            showMessage('Account created. You are now signed in.', 'success');
            await renderLoggedInState();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });
}

function setupSignOut() {
    const button = document.getElementById('signOutBtn');
    if (!button) return;

    button.addEventListener('click', async () => {
        try {
            await authApi('/api/auth/signout', { method: 'POST' });
        } catch (error) {
            // Clear local session anyway.
        }

        clearAuthSession();
        window.location.href = 'signin.html';
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    setupTabUI();
    setupSignInForm();
    setupSignUpForm();
    setupSignOut();

    if (authToken()) {
        await renderLoggedInState();
    } else {
        switchTab('signin');
    }
});
