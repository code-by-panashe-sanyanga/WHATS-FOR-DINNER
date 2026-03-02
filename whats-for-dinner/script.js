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

const meals = [
    "SPAGHETTI BOLOGNESE",
    "CHICKEN CURRY",
    "SUSHI PLATTER",
    "PAD THAI",
    "BURGER & FRIES",
    "BUTTER CHICKEN",
    "RAMEN BOWL",
    "TACOS"
];

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