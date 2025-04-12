document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const alertBox = document.getElementById("alertBox");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const loginButton = loginForm.querySelector('button[type="submit"]');

      // ✅ التحقق من صحة البريد الإلكتروني
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
      if (!emailRegex.test(email)) {
        showAlert("Please enter a valid email address", "red");
        return;
      }

      // ✅ التحقق من صحة كلمة المرور
      if (password.length < 6) {
        showAlert("Password must be at least 6 characters long", "red");
        return;
      }

      loginButton.disabled = true;
      loginButton.textContent = "Logging in...";

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
          showAlert("Login successful! Redirecting...", "green");

          setTimeout(() => {
            window.location.href = data.redirectPath;
          }, 2000);
        } else {
          if (response.status === 403) {
            showAlert("Your account is pending approval. Please wait for admin approval.", "orange");
          } else {
            showAlert(data.message || "Invalid email or password", "red");
          }
        }
      } catch (error) {
        console.error("Error:", error);
        showAlert("Server error. Please try again later.", "red");
      } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Login";
      }
    });
  }

  function showAlert(message, color) {
    alertBox.textContent = message;
    alertBox.style.display = "block";
    alertBox.style.color = color;
  }
}); 