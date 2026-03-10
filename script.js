const today = new Date().toISOString().split('T')[0];

document.documentElement.style.setProperty('--accent-hue', Math.floor(Math.random() * 360));
document.getElementById('accessDate').value = today;


// --- Formatting ---

function formatDateParts(day, month, year) {
    if (!year) return '(Date missing)';
    let parts = [];
    if (day) parts.push(('0' + day).slice(-2));
    if (month) parts.push(month);
    parts.push(year);
    return parts.join(' ');
}

function formatAccessDate(dateString) {
    if (!dateString) return '(Access date missing)';
    const [y, m, d] = dateString.split('-');
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', options);
}


// --- Validation ---

function setFieldError(inputId, errorId, show) {
    document.getElementById(inputId).classList.toggle('field-error', show);
    document.getElementById(errorId).style.display = show ? 'block' : 'none';
}

function validateFields(titleVal, publisherVal, urlVal) {
    let valid = true;

    if (!titleVal) {
        setFieldError('title', 'titleError', true);
        valid = false;
    } else {
        setFieldError('title', 'titleError', false);
    }

    if (!publisherVal) {
        setFieldError('publisher', 'publisherError', true);
        valid = false;
    } else {
        setFieldError('publisher', 'publisherError', false);
    }

    const urlInvalid = urlVal && !urlVal.startsWith('http://') && !urlVal.startsWith('https://');
    setFieldError('url', 'urlError', urlInvalid);
    if (urlInvalid) valid = false;

    return valid;
}


// --- Citation ---

function buildAuthor(firstName, middleName, lastName) {
    if (!firstName && !middleName && !lastName) return '(Author missing)';
    let author = lastName || '';
    if (author && (firstName || middleName)) author += ', ';
    author += firstName || '';
    if (middleName) author += ' ' + middleName;
    return author;
}

function generateCitation() {
    const firstName   = document.getElementById('firstName').value.trim();
    const middleName  = document.getElementById('middleName').value.trim();
    const lastName    = document.getElementById('lastName').value.trim();
    const day         = document.getElementById('day').value;
    const month       = document.getElementById('month').value;
    const year        = document.getElementById('year').value;
    const titleVal    = document.getElementById('title').value.trim();
    const publisherVal = document.getElementById('publisher').value.trim();
    const urlVal      = document.getElementById('url').value.trim();
    const accessDate  = document.getElementById('accessDate').value || today;

    if (!validateFields(titleVal, publisherVal, urlVal)) return;

    const author          = buildAuthor(firstName, middleName, lastName);
    const publicationDate = formatDateParts(day, month, year);
    const titleHtml       = `<i>${titleVal}</i>`;
    const urlHtml         = urlVal
        ? `Available at: <a href='${urlVal}' target='_blank' style='text-decoration:underline;'>${urlVal}</a>`
        : '(URL missing)';

    const citationHtml = `${author}. ${publicationDate}. ${titleHtml}. ${publisherVal}. ${urlHtml} (Accessed: ${formatAccessDate(accessDate)}).`;

    document.getElementById('citationPreview').innerHTML = citationHtml;
    document.getElementById('outputSection').style.display = 'block';
    document.getElementById('copyButton').disabled = false;
}


// --- Clipboard ---

function copyCitation() {
    const preview = document.getElementById('citationPreview');

    const cleanHtml = preview.innerHTML
        .replace(/<i>(.*?)<\/i>/gi, '\x00ITALIC\x00$1\x00END\x00')
        .replace(/<[^>]+>/g, '')
        .replace(/\x00ITALIC\x00(.*?)\x00END\x00/g,
            '<i style="background-color: transparent; font-style: italic;">$1</i>');

    const fullHtml = `<html><body><p style="background-color: transparent; font-family: Arial, sans-serif; font-size: 11pt; color: black;">${cleanHtml}</p></body></html>`;

    const blob     = new Blob([fullHtml], { type: 'text/html' });
    const textBlob = new Blob([preview.innerText], { type: 'text/plain' });

    navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob })
    ]).then(() => {
        const btn = document.getElementById('copyButton');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy Citation', 2000);
    }).catch(err => console.error(err));
}


// --- Reset ---

function clearAll() {
    ['firstName', 'middleName', 'lastName', 'day', 'year', 'title', 'publisher', 'url'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('month').value = '';
    document.getElementById('accessDate').value = today;
    document.getElementById('outputSection').style.display = 'none';
    document.getElementById('copyButton').disabled = true;
    setFieldError('title', 'titleError', false);
    setFieldError('publisher', 'publisherError', false);
    setFieldError('url', 'urlError', false);
}
