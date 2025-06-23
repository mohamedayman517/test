// Custom alert functions using SweetAlert2
function showSuccessAlert(message, callback) {
    Swal.fire({
        title: 'success!',
        text: message,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
        customClass: {
            popup: 'swal2-arabic'
        }
    }).then((result) => {
        if (callback) callback();
    });
}

function showErrorAlert(message, callback) {
    Swal.fire({
        title: 'error!',
        text: message,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
        customClass: {
            popup: 'swal2-arabic'
        }
    }).then((result) => {
        if (callback) callback();
    });
}

function showWarningAlert(message, callback) {
    Swal.fire({
        title: 'warning!',
        text: message,
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ffa500',
        customClass: {
            popup: 'swal2-arabic'
        }
    }).then((result) => {
        if (callback) callback();
    });
}

function showConfirmAlert(message, callback) {
    Swal.fire({
        title: 'Are you sure ?',
        text: message,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        customClass: {
            popup: 'swal2-arabic'
        }
    }).then((result) => {
        if (result.isConfirmed && callback) {
            callback();
        }
    });
} 