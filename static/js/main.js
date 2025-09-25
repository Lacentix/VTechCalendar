const fileInput = document.getElementById('file-input');
const uploadArea = document.querySelector('.upload-area');
const statusMessage = document.getElementById('status-message');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileUpload(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

function showStatus(message, type) {
    statusMessage.innerHTML = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
}

function showLoading(message) {
    statusMessage.innerHTML = `<div class="loading-spinner"></div>${message}`;
    statusMessage.className = 'status-message status-loading';
    statusMessage.style.display = 'block';
}

function handleFileUpload(file) {
    if (!file.type.includes('pdf')) {
        showStatus('Please select a PDF file', 'error');
        return;
    }

    if (file.size > 16 * 1024 * 1024) {
        showStatus('File too large. Maximum size is 16MB', 'error');
        return;
    }

    showLoading('Processing your PDF...');

    const formData = new FormData();
    formData.append('file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => Promise.reject(err));
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace('.pdf', '_schedule.ics');
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showStatus('Calendar file downloaded successfully!<br>Import the .ics file into your calendar app', 'success');
    })
    .catch(error => {
        showStatus(`${error.error || 'Upload failed'}`, 'error');
    });
}