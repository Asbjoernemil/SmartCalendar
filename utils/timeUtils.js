export function formatTime(date) {
    // 24-timers format uden AM/PM
    return date.toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
