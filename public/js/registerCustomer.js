document.addEventListener("DOMContentLoaded", function () {
  const registerCustomer = document.getElementById("registerCustomer");
  const phoneInput = document.querySelector('input[name="phone"]');

  const iti = window.intlTelInput(phoneInput, {
    utilsScript:
      "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
    preferredCountries: ["eg", "sa", "ae", "us"],
    separateDialCode: true,
    initialCountry: "auto",
    geoIpLookup: function (callback) {
      fetch("https://ipapi.co/json")
        .then((res) => res.json())
        .then((data) => callback(data.country_code))
        .catch(() => callback("eg"));
    },
  });

  if (registerCustomer) {
    registerCustomer.addEventListener("submit", async function (event) {
      event.preventDefault();

      // ✅ استهداف جميع المدخلات ورسائل الخطأ
      const inputs = {
        email: document.querySelector('input[name="email"]'),
        password: document.querySelector('input[name="password"]'),

        name: document.querySelector('input[name="Name"]'),

        phone: document.querySelector('input[name="phone"]'),
        bio: document.querySelector('textarea[name="bio"]'),
      };

      const errors = {
        email: document.getElementById("emailError"),
        password: document.getElementById("passwordError"),
        name: document.getElementById("NameError"),
        phone: document.getElementById("phoneError"),
        bio: document.getElementById("bioError"),
      };

      const profilePhotoInput = document.querySelector(
        'input[type="file"][name="profilePhoto"]'
      );
      const profilePhoto =
        profilePhotoInput.files.length > 0 ? profilePhotoInput.files[0] : null;

      // تحقق من الصورة الشخصية (اختياري)
      if (!profilePhoto) {
        showMessage("❌ Please upload your profile photo.", "red");
        hasError = true;
      }

      // ✅ إعادة ضبط الأخطاء
      Object.keys(errors).forEach((key) => {
        errors[key].textContent = "";
        inputs[key].classList.remove("input-error");
      });

      let hasError = false;

      // ✅ التحقق من البريد الإلكتروني
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
      if (!emailRegex.test(inputs.email.value.trim())) {
        errors.email.textContent = "❌ Enter a valid email address";
        inputs.email.classList.add("input-error");
        hasError = true;
      }

      // ✅ التحقق من صحة كلمة المرور
      const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/;
      if (!passwordRegex.test(inputs.password.value.trim())) {
        errors.password.textContent =
          "❌ Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.";
        inputs.password.classList.add("input-error");
        hasError = true;
      }

      // ✅ التحقق من الاسم الأول والأخير
      if (inputs.name.value.trim().length < 2) {
        errors.firstName.textContent = "❌ Name must be at least 2 characters.";
        inputs.name.classList.add("input-error");
        hasError = true;
      }

      if (!iti.isValidNumber()) {
        errors.phone.textContent = "❌ Enter a valid phone number.";
        inputs.phone.classList.add("input-error");
        hasError = true;
      } else {
        // ✅ تحويل الرقم إلى التنسيق الدولي الصحيح
        inputs.phone.value = iti.getNumber();
      }

      // ✅ إذا كان هناك خطأ، لا يتم إرسال الطلب
      if (hasError) {
        return;
      }

      // ✅ تعطيل زر الإرسال أثناء الطلب
      const submitButton = registerCustomer.querySelector(
        'button[type="submit"]'
      );
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";

      const formData = new FormData();
      formData.append("Name", inputs.name.value.trim());

      formData.append("email", inputs.email.value.trim());
      formData.append("phone", inputs.phone.value.trim());
      formData.append("password", inputs.password.value.trim());

      formData.append("bio", inputs.bio.value.trim());

      if (profilePhoto) {
        formData.append("profilePhoto", profilePhoto);
      }

      try {
        const response = await fetch("/registerCustomer", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          showMessage("Successfully registered! Redirecting...", "green");

          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        } else {
          try {
            const errorData = await response.json();
            console.error("Server Error:", errorData);
            showMessage(errorData.message || "Failed to register.", "red");
          } catch (e) {
            // إذا لم يكن الرد JSON، استخدم النص
            const errorText = await response.text();
            console.error("Server Error:", errorText);
            showMessage(
              "حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.",
              "red"
            );
          }
        }
      } catch (error) {
        showMessage(`Error: ${error.message}`, "red");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Register";
      }
    });
  }
});

// ✅ وظيفة عرض الرسائل العامة
function showMessage(text, color) {
  const messageDiv = document.getElementById("message");
  messageDiv.style.display = "block";
  messageDiv.style.color = color;
  messageDiv.textContent = text;
}

function previewProfilePhoto(event) {
  const input = event.target;
  const preview = document.querySelector(".profile-preview");
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.style.backgroundImage = `url(${e.target.result})`;
      preview.style.display = "block";
    };
    reader.readAsDataURL(input.files[0]);
  }
}
