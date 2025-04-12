// Custom alert functions using SweetAlert2
function showSuccessAlert(message, callback) {
    Swal.fire({
        title: 'نجاح!',
        text: message,
        icon: 'success',
        confirmButtonText: 'حسناً',
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
        title: 'خطأ!',
        text: message,
        icon: 'error',
        confirmButtonText: 'حسناً',
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
        title: 'تحذير!',
        text: message,
        icon: 'warning',
        confirmButtonText: 'حسناً',
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
        title: 'هل أنت متأكد؟',
        text: message,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم',
        cancelButtonText: 'لا',
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