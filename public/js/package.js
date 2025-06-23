// Package Management Functions
async function submitPackages() {
  const form = document.getElementById("packageForm");
  const occasionType = form.querySelector('[name="occasionType"]').value;

  // Validate form
  if (!occasionType) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Please select occasion type",
    });
    return;
  }

  // Prepare packages data
  const packages = [
    {
      name: "Basic Package",
      price: form.querySelector('[name="basicPrice"]').value,
      services: form
        .querySelector('[name="basicServices"]')
        .value.split("\n")
        .map((s) => s.trim())
        .filter((s) => s),
    },
    {
      name: "Premium Package",
      price: form.querySelector('[name="premiumPrice"]').value,
      services: form
        .querySelector('[name="premiumServices"]')
        .value.split("\n")
        .map((s) => s.trim())
        .filter((s) => s),
    },
    {
      name: "Luxury Package",
      price: form.querySelector('[name="luxuryPrice"]').value,
      services: form
        .querySelector('[name="luxuryServices"]')
        .value.split("\n")
        .map((s) => s.trim())
        .filter((s) => s),
    },
  ];

  // Validate all packages
  for (const pkg of packages) {
    if (!pkg.price || isNaN(pkg.price) || pkg.services.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Please fill all fields for ${pkg.name}`,
      });
      return;
    }
  }

  try {
    const response = await fetch("/packages/add-packages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        occasionType,
        packages,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Packages created successfully",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        location.reload();
      });
    } else {
      throw new Error(result.message || "Failed to create packages");
    }
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.message,
    });
  }
}

async function editPackage(packageId) {
  try {
    const response = await fetch(`/packages/${packageId}`);
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to fetch package");

    // Open the edit modal
    const modal = new bootstrap.Modal(
      document.getElementById("editPackageModal")
    );

    // Populate form fields
    document.getElementById("editPackageId").value = packageId;
    document.getElementById("editPackageName").value = data.package.name;
    document.getElementById("editPackagePrice").value = data.package.price;
    document.getElementById("editPackageDescription").value =
      data.package.description;

    // Clear and repopulate essential items
    const essentialItemsContainer =
      document.getElementById("editEssentialItems");
    essentialItemsContainer.innerHTML = "";

    data.package.essentialItems.forEach((item) => {
      const div = document.createElement("div");
      div.className = "input-group mb-2";
      div.innerHTML = `
        <input type="text" class="form-control" value="${item}">
        <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      `;
      essentialItemsContainer.appendChild(div);
    });

    modal.show();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.message,
    });
  }
}

// عند إرسال الفورم
const packageForm = document.getElementById("packageForm");
if (packageForm) {
  packageForm.onsubmit = function (e) {
    e.preventDefault();
    const packageId = document.getElementById("packageId").value;
    if (packageId) {
      updatePackage(packageId);
    } else {
      submitPackages();
    }
  };
}

async function updatePackage() {
  const packageId = document.getElementById("editPackageId").value;

  // Collect all essential items
  const essentialItems = Array.from(
    document.querySelectorAll("#editEssentialItems input")
  )
    .map((input) => input.value.trim())
    .filter((item) => item);

  const packageData = {
    name: document.getElementById("editPackageName").value,
    description: document.getElementById("editPackageDescription").value,
    price: document.getElementById("editPackagePrice").value,
    essentialItems: essentialItems,
  };

  // Validate all fields
  if (
    !packageData.name ||
    !packageData.description ||
    !packageData.price ||
    isNaN(packageData.price) ||
    packageData.essentialItems.length === 0
  ) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Please fill all required fields",
    });
    return;
  }

  try {
    const response = await fetch(`/packages/${packageId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(packageData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update package");
    }

    const result = await response.json();

    Swal.fire({
      icon: "success",
      title: "Success!",
      text: "Package updated successfully",
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      location.reload();
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.message,
    });
  }
}

async function deletePackage(packageId) {
  try {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    const response = await fetch(`/packages/${packageId}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (response.ok) {
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Package has been deleted.",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        location.reload();
      });
    } else {
      throw new Error(data.message || "Failed to delete package");
    }
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.message,
    });
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  // Add event listeners
  document
    .getElementById("addEssentialItem")
    ?.addEventListener("click", function () {
      const container = document.getElementById("editEssentialItems");
      const div = document.createElement("div");
      div.className = "input-group mb-2";
      div.innerHTML = `
      <input type="text" class="form-control">
      <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
      container.appendChild(div);
    });
});
