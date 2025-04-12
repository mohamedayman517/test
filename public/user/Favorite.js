document.addEventListener('DOMContentLoaded', function() {
    const favoritesContainer = document.getElementById('favoritesContainer');
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    if (favorites.length === 0) {
        favoritesContainer.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fa-solid fa-heart"></i>
                    <h3>No Favorite Engineers Yet</h3>
                    <p>Start adding engineers to your favorites to see them here!</p>
                    <a href="/eng" class="btn btn-warning mt-3">
                        <i class="fa-solid fa-search"></i> Browse Engineers
                    </a>
                </div>
            </div>
        `;
        return;
    }

    fetch('/api/engineers')
        .then(response => response.json())
        .then(engineers => {
            const favoriteEngineers = engineers.filter(engineer => 
                favorites.includes(engineer._id.toString())
            );

            if (favoriteEngineers.length === 0) {
                favoritesContainer.innerHTML = `
                    <div class="col-12">
                        <div class="empty-state">
                            <i class="fa-solid fa-heart"></i>
                            <h3>No Favorite Engineers Found</h3>
                            <p>Your favorite engineers might have been removed or are no longer available.</p>
                            <a href="/eng" class="btn btn-warning mt-3">
                                <i class="fa-solid fa-search"></i> Browse Engineers
                            </a>
                        </div>
                    </div>
                `;
                return;
            }

            favoritesContainer.innerHTML = favoriteEngineers.map(engineer => `
                <div class="col-md-4 col-sm-6" data-aos="fade-up" data-aos-duration="1000" data-engineer-id="${engineer._id}">
                    <div class="favorite-card card h-100">
                        <img src="${engineer.profilePhoto || '/images/default-avatar.png'}" 
                             class="card-img-top" 
                             alt="${engineer.firstName} ${engineer.lastName}">
                        <div class="card-body">
                            <h3 class="engineer-name">${engineer.firstName} ${engineer.lastName}</h3>
                            <div class="rating mb-2">
                                ${generateRatingStars(engineer.averageRating || 0)}
                            </div>
                            <p class="card-text engineer-description mb-2">${engineer.bio || 'No bio available'}</p>
                            <div class="d-flex justify-content-center gap-2">
                                <a href="/profile/${engineer._id}" class="btn btn-warning">
                                    <i class="fa-solid fa-eye"></i> View Profile
                                </a>
                                <button class="remove-btn" onclick="removeFromFavorites('${engineer._id}')">
                                    <i class="fa-solid fa-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error fetching engineers:', error);
            favoritesContainer.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                        <h3>Error Loading Engineers</h3>
                        <p>Please try again later.</p>
                    </div>
                </div>
            `;
        });
});

function removeFromFavorites(engineerId) {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const updatedFavorites = favorites.filter(id => id !== engineerId);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    
    // Show success message using SweetAlert2
    Swal.fire({
        title: 'Success!',
        text: 'Engineer removed from favorites',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true,
        background: '#28a745',
        color: 'white',
        iconColor: 'white'
    });
    
    // Immediately update the UI
    const favoritesContainer = document.getElementById('favoritesContainer');
    const cardToRemove = document.querySelector(`[data-engineer-id="${engineerId}"]`);
    
    if (cardToRemove) {
        cardToRemove.remove();
    }
    
    // If no favorites left, show empty state
    if (updatedFavorites.length === 0) {
        favoritesContainer.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fa-solid fa-heart"></i>
                    <h3>No Favorite Engineers Yet</h3>
                    <p>Start adding engineers to your favorites to see them here!</p>
                    <a href="/eng" class="btn btn-warning mt-3">
                        <i class="fa-solid fa-search"></i> Browse Engineers
                    </a>
                </div>
            </div>
        `;
    }
}

function reloadFavorites() {
    const favoritesContainer = document.getElementById('favoritesContainer');
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    if (favorites.length === 0) {
        favoritesContainer.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fa-solid fa-heart"></i>
                    <h3>No Favorite Engineers Yet</h3>
                    <p>Start adding engineers to your favorites to see them here!</p>
                    <a href="/eng" class="btn btn-warning mt-3">
                        <i class="fa-solid fa-search"></i> Browse Engineers
                    </a>
                </div>
            </div>
        `;
        return;
    }

    fetch('/api/engineers')
        .then(response => response.json())
        .then(engineers => {
            const favoriteEngineers = engineers.filter(engineer => 
                favorites.includes(engineer._id.toString())
            );

            if (favoriteEngineers.length === 0) {
                favoritesContainer.innerHTML = `
                    <div class="col-12">
                        <div class="empty-state">
                            <i class="fa-solid fa-heart"></i>
                            <h3>No Favorite Engineers Found</h3>
                            <p>Your favorite engineers might have been removed or are no longer available.</p>
                            <a href="/eng" class="btn btn-warning mt-3">
                                <i class="fa-solid fa-search"></i> Browse Engineers
                            </a>
                        </div>
                    </div>
                `;
                return;
            }

            favoritesContainer.innerHTML = favoriteEngineers.map(engineer => `
                <div class="col-md-4 col-sm-6" data-aos="fade-up" data-aos-duration="1000" data-engineer-id="${engineer._id}">
                    <div class="favorite-card card h-100">
                        <img src="${engineer.profilePhoto || '/images/default-avatar.png'}" 
                             class="card-img-top" 
                             alt="${engineer.firstName} ${engineer.lastName}">
                        <div class="card-body">
                            <h3 class="engineer-name">${engineer.firstName} ${engineer.lastName}</h3>
                            <div class="rating mb-2">
                                ${generateRatingStars(engineer.averageRating || 0)}
                            </div>
                            <p class="card-text engineer-description mb-2">${engineer.bio || 'No bio available'}</p>
                            <div class="d-flex justify-content-center gap-2">
                                <a href="/profile/${engineer._id}" class="btn btn-warning">
                                    <i class="fa-solid fa-eye"></i> View Profile
                                </a>
                                <button class="remove-btn" onclick="removeFromFavorites('${engineer._id}')">
                                    <i class="fa-solid fa-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error fetching engineers:', error);
            favoritesContainer.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                        <h3>Error Loading Engineers</h3>
                        <p>Please try again later.</p>
                    </div>
                </div>
            `;
        });
}

function generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHTML = '';
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="bi bi-star-fill text-warning"></i>';
    }
    
    // Add half star if needed
    if (halfStar) {
        starsHTML += '<i class="bi bi-star-half text-warning"></i>';
    }
    
    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="bi bi-star text-warning"></i>';
    }
    
    return starsHTML;
} 