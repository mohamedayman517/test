document.addEventListener("DOMContentLoaded", function () {
  const favoritesContainer = document.getElementById("favoritesContainer");

  function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    
    if (favorites.length === 0) {
      favoritesContainer.innerHTML = "<p>No favorites yet.</p>";
      return;
    }

    fetch("/api/engineers")
      .then(response => response.json())
      .then(engineers => {
        const favoriteEngineers = engineers.filter(engineer => 
          favorites.includes(engineer._id.toString())
        );
        
        favoritesContainer.innerHTML = "";
        
        favoriteEngineers.forEach(engineer => {
          const favCard = document.createElement("div");
          favCard.className = "card p-3 m-2";
          favCard.innerHTML = `
          <a href="/profile/${engineer._id}">  <img src="${engineer.profilePhoto}" 
                 class="img-fluid rounded-circle mb-3" 
                 alt="${engineer.firstName}"
                 style="width: 200px; height: 200px; object-fit: cover;"></a>
            <h3>${engineer.firstName} ${engineer.lastName}</h3>
            <p>${engineer.bio}</p>
            <button class="btn btn-danger remove-from-favorites" 
                    data-id="${engineer._id}">
              Remove
            </button>
          `;
          favoritesContainer.appendChild(favCard);
        });

        document.querySelectorAll(".remove-from-favorites").forEach(button => {
          button.addEventListener("click", function () {
            const updatedFavorites = favorites.filter(id => id !== this.dataset.id);
            localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
            loadFavorites();
          });
        });
      });
  }

  if (favoritesContainer) {
    loadFavorites();
  }
});