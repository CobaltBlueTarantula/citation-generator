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


// --- Autofill ---

const PROXY = 'https://cors-proxy.cobaltbluetarantula.workers.dev/';

async function fetchWithProxy(url) {
    const response = await fetch(`${PROXY}?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(`Proxy returned ${response.status}`);
    return await response.text();
}

function parseAndApplyDate(dateString) {
    if (!dateString) return;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return;
    document.getElementById('day').value   = date.getUTCDate();
    document.getElementById('month').value = MONTH_NAMES[date.getUTCMonth()];
    document.getElementById('year').value  = date.getUTCFullYear();
}

function extractMetadata(doc) {
    const getMeta   = (name)     => doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() || null;
    const getOG     = (property) => doc.querySelector(`meta[property="${property}"]`)?.getAttribute('content')?.trim() || null;
    const getJsonLD = (key)      => {
        for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
            try {
                const data = JSON.parse(script.textContent);
                const entries = Array.isArray(data) ? data : [data];
                for (const entry of entries) {
                    if (entry[key]) return entry[key];
                }
            } catch {}
        }
        return null;
    };

    // Author: try JSON-LD first, then meta tags
    let author = null;
    const ldAuthor = getJsonLD('author');
    if (ldAuthor) {
        author = Array.isArray(ldAuthor)
            ? ldAuthor.map(a => a.name || a).join(', ')
            : (ldAuthor.name || ldAuthor);
    }
    author = author || getMeta('author') || getMeta('article:author') || getOG('article:author');

    // Title: OpenGraph is usually cleaner than <title> which often has site name appended
    const title = getOG('og:title') || getJsonLD('headline') || getMeta('title') || doc.querySelector('title')?.textContent?.trim() || null;

    // Publisher / site name
    const publisher = getOG('og:site_name') || getJsonLD('publisher')?.name || getMeta('publisher') || null;

    // Date: try multiple sources in order of reliability
    const date = getJsonLD('datePublished') || getMeta('article:published_time') || getOG('article:published_time') || getMeta('date') || getMeta('pubdate') || null;

    return { author, title, publisher, date };
}

function applyMetadata({ author, title, publisher, date }) {
    if (author) {
        const parts = author.split(/\s+/);
        document.getElementById('firstName').value  = parts[0] || '';
        document.getElementById('middleName').value = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
        document.getElementById('lastName').value   = parts.length > 1 ? parts[parts.length - 1] : '';
    }
    if (title)     document.getElementById('title').value     = title;
    if (publisher) document.getElementById('publisher').value = publisher;
    if (date)      parseAndApplyDate(date);
}

async function autofill() {
    const urlVal = document.getElementById('url').value.trim();

    if (!urlVal || (!urlVal.startsWith('http://') && !urlVal.startsWith('https://'))) {
        setFieldError('url', 'urlError', true);
        return;
    }
    setFieldError('url', 'urlError', false);

    const btn = document.getElementById('autofillButton');
    const autofillError = document.getElementById('autofillError');
    autofillError.style.display = 'none';
    btn.textContent = 'Loading...';
    btn.disabled = true;

    try {
        const html = await fetchWithProxy(urlVal);
        const doc  = new DOMParser().parseFromString(html, 'text/html');

        const metadata = extractMetadata(doc);
        applyMetadata(metadata);

        const anyFound = Object.values(metadata).some(v => v !== null);
        if (!anyFound) autofillError.style.display = 'block';
    } catch (err) {
        console.error(err);
        autofillError.style.display = 'block';
    } finally {
        btn.textContent = 'Autofill';
        btn.disabled = false;
    }
}




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
    document.getElementById('autofillError').style.display = 'none';
    setFieldError('title', 'titleError', false);
    setFieldError('publisher', 'publisherError', false);
    setFieldError('url', 'urlError', false);
}
