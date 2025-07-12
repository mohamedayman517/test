// Initialize sidebar
const sidebarId = document.getElementById("sidebar");

if (sidebarId) {
  if (localStorage.getItem("isSmall") === "yes") {
    sidebarId.classList.add("small-sidebar");
  } else {
    sidebarId.classList.remove("small-sidebar");
  }

  const toggleSidebar = () => {
    if (localStorage.getItem("isSmall") === "yes") {
      localStorage.setItem("isSmall", "no");
      sidebarId.classList.remove("small-sidebar");
    } else {
      localStorage.setItem("isSmall", "yes");
      sidebarId.classList.add("small-sidebar");
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  // Enhanced mobile navigation
  const menuBtn = document.querySelector(".menu-btn");
  const navLinks = document.querySelector(".nav-links");
  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      // Add ARIA attributes for accessibility
      const isExpanded = navLinks.classList.contains("active");
      menuBtn.setAttribute("aria-expanded", isExpanded);
      navLinks.setAttribute("aria-hidden", !isExpanded);
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!menuBtn.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove("active");
        menuBtn.setAttribute("aria-expanded", "false");
        navLinks.setAttribute("aria-hidden", "true");
      }
    });

    // Close menu on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navLinks.classList.contains("active")) {
        navLinks.classList.remove("active");
        menuBtn.setAttribute("aria-expanded", "false");
        navLinks.setAttribute("aria-hidden", "true");
        menuBtn.focus();
      }
    });
  }

  // Check for price range elements
  const priceRange = document.getElementById("priceRange");
  const priceValue = document.getElementById("priceValue");
  if (priceRange && priceValue) {
    priceRange.addEventListener("input", () => {
      priceValue.textContent = priceRange.value;
    });
  }

  // Check for star rating elements
  const stars = document.querySelectorAll(".star");
  if (stars.length > 0) {
    stars.forEach((star) => {
      star.addEventListener("click", () => {
        selectedRating = parseInt(star.getAttribute("data-rating"));
        highlightStars(selectedRating);
      });
    });
  }

  // Check for rating form
  const ratingForm = document.getElementById("ratingForm");
  if (ratingForm) {
    ratingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const engineerId = form.querySelector('input[name="engineerId"]')?.value;
      const name = form.querySelector('input[name="name"]')?.value;
      const comment = form.querySelector('textarea[name="comment"]')?.value;

      if (selectedRating === 0) {
        showErrorAlert("Please select a rating before submitting.");
        return;
      }

      try {
        const response = await fetch("/rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            engineerId,
            name,
            rating: selectedRating,
            comment,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          showErrorAlert(
            errorData.message || "An error occurred while submitting feedback."
          );
          return;
        }

        const data = await response.json();
        showSuccessAlert("Thank you for your feedback!");
        form.reset();
        selectedRating = 0;
        highlightStars(0);
      } catch (error) {
        showErrorAlert("An error occurred while submitting feedback.");
      }
    });
  }
});

// timer
// Countdown Timer
const countdown = () => {
  // Set the event date (YYYY-MM-DD HH:MM:SS)
  const eventDate = new Date("2025-01-30 12:00:00").getTime();
  const now = new Date().getTime();

  // Calculate remaining time
  const timeLeft = eventDate - now;

  if (timeLeft > 0) {
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    // Update HTML if elements exist
    const daysElement = document.querySelector(".days");
    const hoursElement = document.querySelector(".hours");
    const minutesElement = document.querySelector(".minutes");
    const secondsElement = document.querySelector(".seconds");
    const timerBox = document.getElementById("timer-box");

    if (daysElement) daysElement.textContent = days;
    if (hoursElement) hoursElement.textContent = hours;
    if (minutesElement) minutesElement.textContent = minutes;
    if (secondsElement) secondsElement.textContent = seconds;
  } else {
    // If the event is over
    const timerBox = document.getElementById("timer-box");
    if (timerBox) {
      timerBox.innerHTML = "<h3>Event Started!</h3>";
    }
  }
};

// Only start countdown if timer elements exist
const timerBox = document.getElementById("timer-box");
if (timerBox) {
  setInterval(countdown, 1000);
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute("href")).scrollIntoView({
      behavior: "smooth",
    });
  });
});

// Initialize AOS only if it exists
if (typeof AOS !== "undefined") {
  AOS.init({
    duration: 1200,
    once: true,
  });
}

function changeImages(category) {
  const images = {
    nature: [
      "imgs/img1.jpg",
      "imgs/img2.jpg",
      "imgs/img3.jpg",
      "imgs/img4.webp",
      "imgs/img5.jpg",
      "imgs/img6.webp",
      "imgs/img7.png",
      "imgs/img8.webp",
      "imgs/img9.webp",
    ],
    urban: [
      "imgs/p-1.jpg",
      "imgs/p-2.jpg",
      "imgs/p-3.avif",
      "imgs/p-4.avif",
      "imgs/p-5.jpg",
      "imgs/p-6.jpg",
      "imgs/p-7.jpg",
      "imgs/p-8.jpg",
      "imgs/p-9.jpg",
    ],
    abstract: [
      "imgs/t-1.avif",
      "imgs/t-2.avif",
      "imgs/t-3.avif",
      "imgs/t-4.avif",
      "imgs/t-5.avif",
      "imgs/t-6.avif",
      "imgs/t-7.avif",
      "imgs/t-8.avif",
      "imgs/t-9.avif",
    ],
    modern: [
      "imgs/r-1.jpg",
      "imgs/r-2.jpg",
      "imgs/r-3.jpg",
      "imgs/r-4.jpg",
      "imgs/r-5.jpg",
      "imgs/r-6.jpg",
      "imgs/r-7.jpg",
      "imgs/r-8.jpg",
      "imgs/r-9.jpg",
    ],
  };

  // ===== MOBILE ENHANCEMENTS =====

  // Touch gesture support
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }

  function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }

  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          // Swipe right - close mobile menu if open
          const navLinks = document.querySelector(".nav-links");
          const menuBtn = document.querySelector(".menu-btn");
          if (navLinks && navLinks.classList.contains("active")) {
            navLinks.classList.remove("active");
            if (menuBtn) {
              menuBtn.setAttribute("aria-expanded", "false");
              navLinks.setAttribute("aria-hidden", "true");
            }
          }
        }
      }
    }
  }

  // Add touch event listeners
  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchend", handleTouchEnd, { passive: true });

  // Improved form handling for mobile
  function enhanceMobileForms() {
    const forms = document.querySelectorAll("form");

    forms.forEach((form) => {
      // Add loading state to submit buttons
      form.addEventListener("submit", function (e) {
        const submitBtn = form.querySelector(
          'button[type="submit"], input[type="submit"]'
        );
        if (submitBtn) {
          submitBtn.disabled = true;
          const originalText = submitBtn.textContent || submitBtn.value;
          submitBtn.textContent = "جاري التحميل...";
          submitBtn.innerHTML = '<span class="loading"></span> جاري التحميل...';

          // Re-enable after 5 seconds as fallback
          setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }, 5000);
        }
      });

      // Auto-resize textareas
      const textareas = form.querySelectorAll("textarea");
      textareas.forEach((textarea) => {
        textarea.addEventListener("input", function () {
          this.style.height = "auto";
          this.style.height = this.scrollHeight + "px";
        });
      });
    });
  }

  // Mobile-specific optimizations
  function initMobileOptimizations() {
    // Check if device is mobile
    const isMobile =
      window.innerWidth <= 768 ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (isMobile) {
      // Add mobile class to body
      document.body.classList.add("mobile-device");

      // Optimize images for mobile
      const images = document.querySelectorAll("img");
      images.forEach((img) => {
        if (!img.loading) {
          img.loading = "lazy";
        }
      });

      // Add smooth scrolling for anchor links
      const anchorLinks = document.querySelectorAll('a[href^="#"]');
      anchorLinks.forEach((link) => {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute("href"));
          if (target) {
            target.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        });
      });

      // Enhance mobile forms
      enhanceMobileForms();
    }
  }

  // Initialize mobile optimizations when DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileOptimizations);
  } else {
    initMobileOptimizations();
  }

  // Handle orientation changes
  window.addEventListener("orientationchange", function () {
    // Close mobile menu on orientation change
    const navLinks = document.querySelector(".nav-links");
    const menuBtn = document.querySelector(".menu-btn");
    if (navLinks && navLinks.classList.contains("active")) {
      navLinks.classList.remove("active");
      if (menuBtn) {
        menuBtn.setAttribute("aria-expanded", "false");
        navLinks.setAttribute("aria-hidden", "true");
      }
    }

    // Recalculate viewport height
    setTimeout(() => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    }, 100);
  });

  // Set initial viewport height
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);

  for (let i = 1; i <= 9; i++) {
    document.getElementById(`img${i}`).src = images[category][i - 1];
  }
}

function highlightStars(rating) {
  document.querySelectorAll(".star").forEach((star, index) => {
    if (index < rating) {
      star.classList.add("active");
    } else {
      star.classList.remove("active");
    }
  });
}

function showPopup() {
  popup.style.display = "block";
  overlay.style.display = "block";
}

function closePopup() {
  popup.style.display = "none";
  overlay.style.display = "none";
}
