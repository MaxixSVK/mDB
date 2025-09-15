const authorForm = document.getElementById('author-management-form');
const authorFormType = document.getElementById('author-type');

authorFormType.addEventListener('change', function () {
    if (this.value != 'new') {
        showNotification('This function is not available yet.', 'error');
    }
    this.value = 'new';
});

authorForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const formData = new FormData(this);
    const authorName = formData.get('author-name');
    const authorBio = formData.get('author-bio');

    try {
        const response = await fetch(api + '/mange-library/author/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': getCookie('sessionToken')
            },
            body: JSON.stringify({
                name: authorName,
                bio: authorBio,
            })
        });

        if (response.ok) {
            showNotification('Author created successfully!', 'success');
            refreshContent();
        } else {
            showNotification('Failed to create author.', 'error');
        }
    } catch (error) {
        showNotification('An error occurred while creating the author.', 'error');
    }
});
