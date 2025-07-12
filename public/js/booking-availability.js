// ===== BOOKING AVAILABILITY CHECKER =====

class BookingAvailabilityChecker {
  constructor() {
    this.bookedDates = new Set();
    this.currentEngineerId = null;
    this.dateInput = null;
    this.init();
  }

  init() {
    // Initialize when DOM is loaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.setupEventListeners()
      );
    } else {
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    // Find date input field
    this.dateInput =
      document.querySelector('input[type="date"]') ||
      document.querySelector('input[name="eventDate"]') ||
      document.querySelector("#eventDate");

    if (this.dateInput) {
      this.dateInput.addEventListener("change", (e) =>
        this.checkDateAvailability(e.target.value)
      );

      // Set minimum date to today
      const today = new Date().toISOString().split("T")[0];
      this.dateInput.min = today;
    }

    // Listen for engineer selection changes
    this.setupEngineerSelectionListener();
  }

  setupEngineerSelectionListener() {
    // Check for engineer selection in various forms
    const engineerSelects = document.querySelectorAll(
      'select[name="engineerId"], #engineerId'
    );
    const packageSelects = document.querySelectorAll(
      'select[name="packageId"], #packageId'
    );

    engineerSelects.forEach((select) => {
      select.addEventListener("change", (e) => {
        this.currentEngineerId = e.target.value;
        this.loadEngineerBookedDates();
      });
    });

    packageSelects.forEach((select) => {
      select.addEventListener("change", async (e) => {
        const packageId = e.target.value;
        if (packageId) {
          await this.getEngineerFromPackage(packageId);
        }
      });
    });

    // Auto-detect engineer from URL or page data
    this.autoDetectEngineer();
  }

  async autoDetectEngineer() {
    // Try to get engineer ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const engineerId = urlParams.get("engineerId");

    if (engineerId) {
      this.currentEngineerId = engineerId;
      await this.loadEngineerBookedDates();
      return;
    }

    // Try to get engineer ID from page data
    const engineerData = document.querySelector("[data-engineer-id]");
    if (engineerData) {
      this.currentEngineerId = engineerData.dataset.engineerId;
      await this.loadEngineerBookedDates();
    }
  }

  async getEngineerFromPackage(packageId) {
    try {
      const response = await fetch(`/api/packages/${packageId}`);
      const packageData = await response.json();

      if (packageData && packageData.engID) {
        this.currentEngineerId = packageData.engID;
        await this.loadEngineerBookedDates();
      }
    } catch (error) {
      console.error("Error getting engineer from package:", error);
    }
  }

  async loadEngineerBookedDates() {
    if (!this.currentEngineerId) return;

    try {
      const response = await fetch(
        `/booking/engineer-booked-dates/${this.currentEngineerId}`
      );
      const data = await response.json();

      if (data.bookedDates) {
        this.bookedDates = new Set(data.bookedDates);
        this.updateDateInputRestrictions();
      }
    } catch (error) {
      console.error("Error loading booked dates:", error);
    }
  }

  updateDateInputRestrictions() {
    if (!this.dateInput) return;

    // Remove previous restrictions
    this.dateInput.classList.remove("date-unavailable");

    // Add event listener for date validation
    this.dateInput.addEventListener("input", (e) => {
      const selectedDate = e.target.value;
      if (this.bookedDates.has(selectedDate)) {
        this.showDateUnavailableMessage(selectedDate);
        e.target.value = ""; // Clear the invalid date
      }
    });
  }

  async checkDateAvailability(selectedDate) {
    if (!this.currentEngineerId || !selectedDate) return;

    try {
      const response = await fetch("/booking/check-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          engineerId: this.currentEngineerId,
          eventDate: selectedDate,
        }),
      });

      const result = await response.json();

      if (!result.available) {
        this.showDateUnavailableMessage(selectedDate, result.message);
        this.dateInput.value = ""; // Clear the invalid date
        return false;
      } else {
        this.hideDateMessages();
        return true;
      }
    } catch (error) {
      console.error("Error checking date availability:", error);
      return false;
    }
  }

  showDateUnavailableMessage(date, customMessage = null) {
    // Remove existing messages
    this.hideDateMessages();

    const message =
      customMessage || `Sorry, this engineer is already booked on ${date}`;

    // Create message element
    const messageDiv = document.createElement("div");
    messageDiv.className = "alert alert-danger date-availability-message mt-2";
    messageDiv.innerHTML = `
      <i class="fas fa-exclamation-triangle me-2"></i>
      <strong>${message}</strong>
      <br>
      <small>Please choose another date or another engineer</small>
    `;

    // Insert message after date input
    if (this.dateInput.parentNode) {
      this.dateInput.parentNode.insertBefore(
        messageDiv,
        this.dateInput.nextSibling
      );
    }

    // Add visual indication to input
    this.dateInput.classList.add("is-invalid");
  }

  hideDateMessages() {
    // Remove existing messages
    const existingMessages = document.querySelectorAll(
      ".date-availability-message"
    );
    existingMessages.forEach((msg) => msg.remove());

    // Remove visual indication
    if (this.dateInput) {
      this.dateInput.classList.remove("is-invalid");
    }
  }

  // Method to disable specific dates in date picker (if supported)
  disableBookedDates() {
    if (!this.dateInput || this.bookedDates.size === 0) return;

    // For browsers that support it, we can set disabled dates
    // This is a more advanced feature that might need additional libraries
    const bookedDatesArray = Array.from(this.bookedDates);

    // Add data attribute for styling
    this.dateInput.setAttribute(
      "data-booked-dates",
      bookedDatesArray.join(",")
    );
  }

  // Public method to manually check availability
  async isDateAvailable(engineerId, date) {
    try {
      const response = await fetch("/booking/check-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          engineerId: engineerId,
          eventDate: date,
        }),
      });

      const result = await response.json();
      return result.available;
    } catch (error) {
      console.error("Error checking date availability:", error);
      return false;
    }
  }
}

// Initialize the booking availability checker
const bookingChecker = new BookingAvailabilityChecker();

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = BookingAvailabilityChecker;
}

// Global function for manual checking
window.checkBookingAvailability = async function (engineerId, date) {
  return await bookingChecker.isDateAvailable(engineerId, date);
};

// Enhanced form submission with availability check
document.addEventListener("DOMContentLoaded", function () {
  const bookingForms = document.querySelectorAll('form[action*="booking"]');

  bookingForms.forEach((form) => {
    form.addEventListener("submit", async function (e) {
      const dateInput = form.querySelector('input[type="date"]');
      const engineerInput = form.querySelector(
        'input[name="engineerId"], select[name="engineerId"]'
      );

      if (
        dateInput &&
        engineerInput &&
        dateInput.value &&
        engineerInput.value
      ) {
        const isAvailable = await bookingChecker.isDateAvailable(
          engineerInput.value,
          dateInput.value
        );

        if (!isAvailable) {
          e.preventDefault();
          bookingChecker.showDateUnavailableMessage(dateInput.value);
          return false;
        }
      }
    });
  });
});

// CSS for styling (can be moved to separate CSS file)
const style = document.createElement("style");
style.textContent = `
  .date-availability-message {
    border-radius: 8px;
    font-size: 14px;
    border: 1px solid #dc3545;
    background-color: #f8d7da;
    color: #721c24;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .is-invalid {
    border-color: #dc3545 !important;
    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
  }

  input[type="date"].date-unavailable {
    background-color: #fff5f5;
  }

  .date-availability-message .fas {
    color: #dc3545;
  }

  .date-availability-message strong {
    font-weight: 600;
  }

  .date-availability-message small {
    color: #6c757d;
    font-style: italic;
  }
`;
document.head.appendChild(style);
