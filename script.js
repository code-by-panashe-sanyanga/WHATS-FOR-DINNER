// Hero click redirection
const mainPlate = document.getElementById('main-plate');
mainPlate.addEventListener('click', () => {
    window.location.href = '#recipe-details'; 
    alert("Navigating to the recipe page!");
});

// Ingredient Clear logic
const clearBtn = document.querySelector('.btn-secondary');
clearBtn.addEventListener('click', () => {
    const inputs = document.querySelectorAll('.input-row input');
    inputs.forEach(input => input.value = '');
});

// ===== CAROUSEL LOGIC =====

const slides = document.querySelectorAll('.carousel-slide');
const nextBtn = document.querySelector('.next');
const prevBtn = document.querySelector('.prev');

let currentSlide = 0;

function showSlide(index) {
    slides.forEach(slide => slide.classList.remove('active'));
    slides[index].classList.add('active');
}

if (nextBtn && prevBtn) {
    nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    });

    prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
    });
}
// ===== DISH OF THE DAY (24hr rotation) =====

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

    if (storedDate === today && storedDish) {
        return storedDish;
    } else {
        const randomDish = meals[Math.floor(Math.random() * meals.length)];
        localStorage.setItem("dishDate", today);
        localStorage.setItem("dishName", randomDish);
        return randomDish;
    }
}

const dailyDishElement = document.getElementById("dailyDish");
if (dailyDishElement) {
    dailyDishElement.innerText = getDailyDish();
}