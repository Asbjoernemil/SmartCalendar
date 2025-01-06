// recurrenceUtils.js

export function doesEventOccurOnDate(event, dateString) {
    const freq = event.recurrence?.frequency || 'NONE';
    const recEnd = event.recurrence?.endDate || null;

    const checkDate = new Date(dateString);         // 2025-01-15
    const eventStartDate = new Date(event.date);    // 2025-01-08

    // a) Hvis checkDate < eventStartDate => event er ikke startet
    if (checkDate < eventStartDate) {
        return false;
    }

    // b) Hvis recEnd != null, og checkDate > recEnd => event er stoppet
    if (recEnd) {
        const recEndDate = new Date(recEnd);
        if (checkDate > recEndDate) {
            return false;
        }
    }

    // c) Switch freq
    switch (freq) {
        case 'NONE':
            // checkDate == eventStartDate?
            return isSameDay(checkDate, eventStartDate);

        case 'DAILY':
            return checkDate >= eventStartDate;

        case 'WEEKLY':
            return isWeeklyMatch(eventStartDate, checkDate);

        case 'MONTHLY':
            return isMonthlyMatch(eventStartDate, checkDate);

        case 'YEARLY':
            return isYearlyMatch(eventStartDate, checkDate);

        default:
            return false;
    }
}

function isSameDay(d1, d2) {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

function isWeeklyMatch(startDate, checkDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    // -> Rund differencen til nærmeste heltal for at håndtere tidszoneafvigelser
    const diffInDays = Math.floor(
        (checkDate.getTime() - startDate.getTime()) / msPerDay
    );
    if (diffInDays < 0) return false;
    return diffInDays % 7 === 0;
}

function isMonthlyMatch(startDate, checkDate) {
    // Tilsvarende kan du overveje at runde differencen i dage, men oftest:
    if (checkDate < startDate) return false;
    // Samme "dato" i måneden?
    if (checkDate.getDate() !== startDate.getDate()) return false;
    return true;
}

function isYearlyMatch(startDate, checkDate) {
    if (checkDate < startDate) return false;
    return (
        checkDate.getDate() === startDate.getDate() &&
        checkDate.getMonth() === startDate.getMonth()
    );
}
