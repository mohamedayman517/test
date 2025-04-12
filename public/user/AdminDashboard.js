// Alert functions
function showConfirmAlert(message, callback) {
  Swal.fire({
    title: 'Are you sure?',
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33'
  }).then((result) => {
    if (result.isConfirmed) {
      callback();
    }
  });
}

function showSuccessAlert(message, callback) {
  Swal.fire({
    title: 'Success!',
    text: message,
    icon: 'success',
    confirmButtonText: 'OK'
  }).then(() => {
    if (callback) callback();
  });
}

function showErrorAlert(message) {
  Swal.fire({
    title: 'Error!',
    text: message,
    icon: 'error',
    confirmButtonText: 'OK'
  });
}

// Search function
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

// Edit Project function
function editProject(projectId) {
  window.location.href = `/edit-project/${projectId}`;
}

// Delete Engineer function
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

// Logout function
function logout() {
  showConfirmAlert("Are you sure you want to logout?", () => {
    fetch("/logout", { method: "POST" })
      .then(() => window.location.href = "/login");
  });
} 