/**
 * Safe Bootstrap Modal Initialization
 * This script safely initializes Bootstrap modals and prevents errors
 * related to modal backdrop and other initialization issues
 */

document.addEventListener('DOMContentLoaded', function() {
  // Safe modal initialization function
  function safelyInitializeModals() {
    try {
      // Get all modal trigger buttons
      const modalTriggers = document.querySelectorAll('[data-bs-toggle="modal"]');
      
      // Add safe click handlers to all modal triggers
      if (modalTriggers) {
        modalTriggers.forEach(function(trigger) {
          trigger.addEventListener('click', function(e) {
            try {
              // Get the target modal ID
              const targetId = this.getAttribute('data-bs-target');
              if (!targetId) return;
              
              // Find the target modal element
              const targetModal = document.querySelector(targetId);
              
              // If modal doesn't exist, create a fallback modal
              if (!targetModal) {
                console.warn('Modal not found:', targetId);
                // Create a fallback modal with the same ID
                createFallbackModal(targetId.replace('#', ''));
                e.preventDefault();
                return;
              }
            } catch (error) {
              console.error('Error in modal click handler:', error);
              e.preventDefault();
            }
          });
        });
      }
      
      // Safely initialize all existing modals
      const modalElements = document.querySelectorAll('.modal');
      if (modalElements) {
        modalElements.forEach(function(modal) {
          try {
            // Check if Bootstrap is available
            if (typeof bootstrap !== 'undefined') {
              // Only initialize if not already initialized
              if (!bootstrap.Modal.getInstance(modal)) {
                new bootstrap.Modal(modal, {
                  backdrop: true,
                  keyboard: true,
                  focus: true
                });
              }
            }
          } catch (error) {
            console.warn('Modal initialization skipped for', modal.id, error);
          }
        });
      }
    } catch (error) {
      console.error('Error initializing modals:', error);
    }
  }
  
  // Create a fallback modal if the target doesn't exist
  function createFallbackModal(modalId) {
    // Check if a modal with this ID already exists
    if (document.getElementById(modalId)) return;
    
    // Create a basic modal structure
    const modalHTML = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Notice</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p>The requested modal content is not available.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Append the modal to the body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize the new modal
    const newModal = document.getElementById(modalId);
    if (newModal && typeof bootstrap !== 'undefined') {
      const modalInstance = new bootstrap.Modal(newModal);
      modalInstance.show();
    }
  }
  
  // Initialize modals when DOM is loaded
  safelyInitializeModals();
  
  // Also initialize modals after a short delay to catch any dynamically added ones
  setTimeout(safelyInitializeModals, 500);
});
