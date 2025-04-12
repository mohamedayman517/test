function filterEngineers() {
  const input = document.getElementById('searchInput');
  const filter = input.value.toLowerCase();
  const cards = document.querySelectorAll('.card');

  cards.forEach(card => {
    const name = card.getAttribute('data-name').toLowerCase();
    if (name.includes(filter)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

async function deleteEngineer(engineerId) {
  showConfirmAlert("Are you sure you want to delete this engineer?", async () => {
    try {
      const response = await fetch(`/AdminDashboard/engineers/${engineerId}`, {
        method: "DELETE", 
        headers: {
          "Content-Type": "application/json",
        },
      });

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
  });
}

function logout() {
  showConfirmAlert("Are you sure you want to logout?", () => {
    fetch("/logout", { method: "POST" })
      .then(() => window.location.href = "/login");
  });
}



