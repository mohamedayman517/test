document.addEventListener("DOMContentLoaded", function () {
  const projectForm = document.getElementById("projectForm");
  const messageDiv = document.getElementById("message");
  const projectArea = document.getElementById("projectArea");
  const projectPrice = document.getElementById("projectPrice");
  
  
  
    // ✅ تحديث السعر تلقائيًا عند إدخال المساحة
    projectArea.addEventListener("input", function () {
      const areaValue = parseFloat(projectArea.value) || 0;
      const priceValue = areaValue * 100;
      
      projectPrice.value = priceValue;
      projectPrice.placeholder = `السعر يتراوح بين ${priceValue - 50} إلى ${priceValue + 50}`;
    });
  
  if (projectForm) {
    projectForm.addEventListener("submit", async function (event) {
      event.preventDefault();

    
      const projectName = document.getElementById("projectName").value.trim();
      const projectType = document.getElementById("projectType").value;
      const projectPrice = document.getElementById("projectPrice").value.trim();
      const projectImageInput = document.getElementById("projectImage");
      const projectImage = projectImageInput.files[0];
      const projectArea = document.getElementById("projectArea").value.trim();
      console.log("📧 Project Name:", projectName);
      console.log("📝 Project Type:", projectType);
      console.log("💰 Project Price:", projectPrice);
      console.log(
        "📸 Project Image:",
        projectImage ? projectImage.name : "No file selected"
      );

      
      if (!projectName || !projectType || !projectPrice || !projectImage || !projectArea) {
        messageDiv.style.display = "block";
        messageDiv.style.color = "red";
        messageDiv.textContent = "Please fill in all fields and select an image.";
        return;
      }

      
      const submitButton = projectForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";

      
      const formData = new FormData();
      formData.append("projectName", projectName);
      formData.append("projectType", projectType);
      formData.append("projectPrice", projectPrice);
      formData.append("projectImage", projectImage);
      formData.append("projectArea", projectArea);
      try {
        const response = await fetch("/create", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          messageDiv.style.display = "block";
          messageDiv.style.color = "green";
          messageDiv.textContent = "Project created successfully!";
          setTimeout(() => {
            window.location.reload(); 
          }, 2000);
        } else {
          const errorMessage = await response.text();
          messageDiv.style.display = "block";
          messageDiv.style.color = "red";
          messageDiv.textContent = `Failed: ${errorMessage}`;
        }
      } catch (error) {
        messageDiv.style.display = "block";
        messageDiv.style.color = "red";
        messageDiv.textContent = `Error: ${error.message}`;
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Creating...";
      }
    });
  }

  
window.editProject= async function (projectId) {
    const newName = prompt("Enter the new project name:");
    if (newName) {
      try {
        const response = await fetch(`/projects/${projectId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newName }),
        });
        if (response.ok) {
          alert("Project updated successfully!");
          window.location.reload(); 
        } else {
          alert("Failed to update project.");
        }
      } catch (error) {
        console.error("Error updating project:", error);
        alert("An error occurred while updating the project.");
      }
    }
  }

  
  window.deleteProject = async function (projectId) {
    if (confirm("Are you sure you want to delete this project?")) {
      try {
        const response = await fetch(`/projects/${projectId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          alert("Project deleted successfully!");
          window.location.reload(); 
        } else {
          alert("Failed to delete project.");
        }
      } catch (error) {
        console.error("Error deleting project:", error);
        alert("An error occurred while deleting the project.");
      }
    }
  };

});