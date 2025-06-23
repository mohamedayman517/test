document.addEventListener("DOMContentLoaded", () => {
  const darkModeButtons = document.querySelectorAll("button.dark-mode");

  // Set initial mode based on localStorage
  if (localStorage.getItem("mode") === "dark") {
    document.body.classList.add("dark-mode");
    // Update all dark mode buttons to show sun icon
    darkModeButtons.forEach((button) => {
      const icon = button.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
      }
    });
  } else {
    // Ensure moon icon is shown in light mode
    darkModeButtons.forEach((button) => {
      const icon = button.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
      }
    });
  }
});

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const darkModeButtons = document.querySelectorAll("button.dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("mode", "dark");
    // Change to sun icon in dark mode
    darkModeButtons.forEach((button) => {
      const icon = button.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
      }
    });
  } else {
    localStorage.setItem("mode", "light");
    // Change to moon icon in light mode
    darkModeButtons.forEach((button) => {
      const icon = button.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
      }
    });
  }
}

function scrollDown() {
  window.scrollBy({
    top: 855,
    behavior: "smooth",
  });
}
