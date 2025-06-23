let isSubmitting = false;

document.addEventListener("DOMContentLoaded", function () {
  const projectForm = document.getElementById("createProjectForm");
  
  if (projectForm) {
    projectForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      
      // Prevent multiple submissions
      if (isSubmitting) {
        return;
      }
      
      isSubmitting = true;
      
      // Get form data
      const formData = new FormData(this);
      
      // Log form data for debugging
      console.log("📧 Project Name:", formData.get("projectName"));
      console.log("📝 Project Type:", formData.get("projectType"));
      console.log("💰 Project Price:", formData.get("projectPrice"));
      console.log("📸 Project Image:", formData.get("projectImage"));

      try {
        const response = await fetch("/projects/create", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        
        if (response.status === 401) {
          // Handle unauthorized access
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Please log in to create a project'
          });
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
          return;
        }

        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Project created successfully!',
            showConfirmButton: false,
            timer: 1500
          }).then(() => {
            window.location.reload();
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message || 'Error creating project'
          });
        }
      } catch (error) {
        console.error("Error:", error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'An error occurred while creating the project'
        });
      } finally {
        isSubmitting = false;
      }
    });
  }
}); 