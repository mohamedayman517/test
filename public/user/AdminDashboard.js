// Alert functions
function showConfirmAlert(message, callback) {
  Swal.fire({
    title: "Are you sure?",
    text: message,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "No",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
  }).then((result) => {
    if (result.isConfirmed) {
      callback();
    }
  });
}

function showSuccessAlert(message, callback) {
  Swal.fire({
    title: "Success!",
    text: message,
    icon: "success",
    confirmButtonText: "OK",
  }).then(() => {
    if (callback) callback();
  });
}

function showErrorAlert(message) {
  Swal.fire({
    title: "Error!",
    text: message,
    icon: "error",
    confirmButtonText: "OK",
  });
}

// Enhanced search function
function filterEngineers() {
  const searchTerm = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();
  const cards = document.querySelectorAll("#engineerCards .card");
  let visibleCount = 0;

  // Show all cards if search is empty
  if (!searchTerm) {
    cards.forEach((card) => {
      card.style.display = "";
      card.style.animation = "fadeIn 0.5s";
    });

    // Remove no results message if it exists
    const noResultsMsg = document.getElementById("noSearchResults");
    if (noResultsMsg) noResultsMsg.remove();

    return;
  }

  cards.forEach((card) => {
    const name = card.getAttribute("data-name").toLowerCase();
    const email = card
      .querySelector(".fa-envelope")
      .parentNode.textContent.toLowerCase();
    const phone = card
      .querySelector(".fa-phone")
      .parentNode.textContent.toLowerCase();

    if (
      name.includes(searchTerm) ||
      email.includes(searchTerm) ||
      phone.includes(searchTerm)
    ) {
      card.style.display = "";
      card.style.animation = "fadeIn 0.5s";
      visibleCount++;
    } else {
      card.style.display = "none";
    }
  });

  // Add animation styles if not already present
  if (!document.getElementById("searchAnimations")) {
    const style = document.createElement("style");
    style.id = "searchAnimations";
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // Show no results message if needed
  const noResultsMsg = document.getElementById("noSearchResults");
  if (visibleCount === 0) {
    if (!noResultsMsg) {
      const message = document.createElement("div");
      message.id = "noSearchResults";
      message.className = "text-center py-4 mt-3";
      message.innerHTML = `
        <i class="fas fa-search fa-2x mb-3 text-muted"></i>
        <h4 class="text-muted">No engineers found</h4>
        <p class="mb-0">Try a different search term</p>
      `;
      document.getElementById("engineerCards").appendChild(message);
    }
  } else if (noResultsMsg) {
    noResultsMsg.remove();
  }
}

// Edit Project function
function editProject(projectId) {
  window.location.href = `/edit-project/${projectId}`;
}

// Delete Engineer function
async function deleteEngineer(engineerId) {
  showConfirmAlert(
    "Are you sure you want to delete this engineer?",
    async () => {
      try {
        const response = await fetch(
          `/AdminDashboard/engineers/${engineerId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          showSuccessAlert("Engineer deleted successfully.", () => {
            location.reload();
          });
        } else {
          const errorData = await response.text();
          showErrorAlert("Failed to delete engineer: " + errorData);
        }
      } catch (error) {
        console.error("Error deleting engineer:", error);
        showErrorAlert("Error deleting engineer. Please try again.");
      }
    }
  );
}

// Logout function
function logout() {
  showConfirmAlert("Are you sure you want to logout?", () => {
    fetch("/logout", { method: "POST" }).then(
      () => (window.location.href = "/login")
    );
  });
}
