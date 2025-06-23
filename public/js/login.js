document.addEventListener("DOMContentLoaded", function () {
  // Handle both the main login form and the modal login form
  const mainLoginForm = document.getElementById("loginForm");
  const modalLoginFormData = document.getElementById("loginFormData");
  const alertBox = document.getElementById("alertBox");

  // Function to handle login submission
  async function handleLogin(event, formElement) {
    event.preventDefault();

    // Get email and password based on which form is being submitted
    let email, password, loginButton;

    if (formElement.id === "loginForm") {
      // Main login page
      email = document.getElementById("email").value.trim();
      password = document.getElementById("password").value.trim();
    } else {
      // Modal login form in profile page
      email = document.getElementById("loginEmail").value.trim();
      password = document.getElementById("loginPassword").value.trim();
    }

    loginButton = formElement.querySelector('button[type="submit"]');

    // Validate inputs
    if (!email || !password) {
      showNotification("Please enter both email and password", "error");
      return;
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    if (!emailRegex.test(email)) {
      showNotification("Please enter a valid email address", "error");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      showNotification("Password must be at least 6 characters long", "error");
      return;
    }

    // Show loading state
    if (loginButton) {
      loginButton.disabled = true;
      loginButton.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Logging in...';
    }

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Redirecting to:", data.redirectPath);
        showNotification("Login successful! Redirecting...", "success");

        // Close modal if it's open
        const authModal = document.getElementById("authModal");
        if (authModal) {
          const bsModal = bootstrap.Modal.getInstance(authModal);
          if (bsModal) bsModal.hide();
        }

        setTimeout(() => {
          // Check if we're in the modal login form (in profile.ejs) or the main login form (in login.ejs)
          const isModalLogin = formElement.id === "loginFormData";

          if (isModalLogin) {
            // If we're in the modal login form, check for booking information
            const packageId = localStorage.getItem("bookingPackageId");
            const eventType = localStorage.getItem("bookingEventType");

            if (packageId && eventType) {
              // If we have booking info, redirect to booking page with package info
              window.location.href = `/booking?packageId=${packageId}&eventType=${encodeURIComponent(
                eventType
              )}`;
              return;
            }
          }

          // For main login form or if no booking info in modal, use the default redirect path
          window.location.href = data.redirectPath || "/";
        }, 1500);
      } else {
        if (response.status === 403) {
          showNotification(
            "Your account is pending approval. Please wait for admin approval.",
            "warning"
          );
        } else {
          showNotification(
            data.message || "Invalid email or password",
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Error:", error);
      showNotification("Server error. Please try again later.", "error");
    } finally {
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.innerHTML = "Login";
      }
    }
  }

  // Attach event listeners to both forms
  if (mainLoginForm) {
    mainLoginForm.addEventListener("submit", function (event) {
      handleLogin(event, mainLoginForm);
    });
  }

  if (modalLoginFormData) {
    modalLoginFormData.addEventListener("submit", function (event) {
      handleLogin(event, modalLoginFormData);
    });
  }

  // Function to show alerts in the main login page
  function showAlert(message, color) {
    if (alertBox) {
      alertBox.textContent = message;
      alertBox.style.display = "block";
      alertBox.style.color = color;
    }
  }

  // Function to show notifications using SweetAlert or fallback to alert
  function showNotification(message, type) {
    if (typeof Swal !== "undefined") {
      // Use SweetAlert if available
      Swal.fire({
        title:
          type === "success"
            ? "Success!"
            : type === "warning"
            ? "Warning!"
            : "Error!",
        text: message,
        icon: type,
        timer: 3000,
        showConfirmButton: false,
        position: "top-end",
        toast: true,
      });
    } else if (alertBox) {
      // Use alert box if available
      showAlert(
        message,
        type === "success" ? "green" : type === "warning" ? "orange" : "red"
      );
    } else {
      // Fallback to browser alert
      alert(message);
    }
  }
});
