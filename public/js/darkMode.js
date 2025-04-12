document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("mode") === "dark") {
    document.body.classList.add("dark-mode");
  }
});

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("mode", "dark");
  } else {
    localStorage.setItem("mode", "light");
  }
}

function scrollDown() {
  window.scrollBy({
    top: 855,
    behavior: "smooth",
  });
}
