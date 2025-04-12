document.addEventListener("DOMContentLoaded", function () {
  const projectForm = document.getElementById("projectForm");
  
  if (projectForm) {
    projectForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      
      // Get form data
      const formData = new FormData(this);
      
      // Log form data for debugging
      console.log("📧 Project Name:", formData.get("projectName"));
      console.log("📝 Project Type:", formData.get("projectType"));
      console.log("💰 Project Price:", formData.get("projectPrice"));
      console.log("📸 Project Image:", formData.get("projectImage"));

      try {
        const response = await fetch("/create", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        
        if (response.status === 401) {
          // Handle unauthorized access
          showErrorAlert("Please log in to create a project");
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
          return;
        }

        if (result.success) {
          showSuccessAlert("Project created successfully!");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showErrorAlert(result.message || "Error creating project");
        }
      } catch (error) {
        console.error("Error:", error);
        showErrorAlert("An error occurred while creating the project");
      }
    });
  }
}); 