// utils/dateUtils.js
export function formatDate(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        return '';
    }
    const parts = dateString.split('-');
    if (parts.length !== 3) {
        return dateString;
    }
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
}

export function formatTime(date) {
    // 24-timers format uden AM/PM
    return date.toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
