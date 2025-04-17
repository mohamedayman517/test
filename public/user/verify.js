document.addEventListener('DOMContentLoaded', () => {
    const verificationForm = document.getElementById('verificationForm');
    
    if (verificationForm) {
        verificationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const verificationCode = document.getElementById('verificationCode').value;
            const engineerId = document.getElementById('engineerId').value;

            try {
                const response = await fetch('/verify-account', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: verificationCode,
                        engineerId: engineerId
                    })
                });

                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: 'Your account has been verified successfully.',
                        showConfirmButton: true,
                        confirmButtonText: 'Go to Login'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = data.redirectTo || '/login';
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Verification Failed',
                        text: data.message || 'Invalid verification code. Please try again.',
                        confirmButtonText: 'Try Again'
                    });
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'An error occurred during verification. Please try again.',
                    confirmButtonText: 'OK'
                });
            }
        });

        // Add input validation for verification code
        const verificationInput = document.getElementById('verificationCode');
        if (verificationInput) {
            verificationInput.addEventListener('input', (e) => {
                // Remove any non-numeric characters
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                
                // Limit to 6 digits
                if (e.target.value.length > 6) {
                    e.target.value = e.target.value.slice(0, 6);
                }
            });
        }
    }
}); 