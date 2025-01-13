/**
 * doesEventOccurOnDate:
 * Tjekker om et givent event ("event") forekommer på den specifikke dato
 * "dateString". 
 * Bruges, hvis eventet har gentagelse (WEEKLY, MONTHLY mm.).
 */
export function doesEventOccurOnDate(event, dateString) {
    // freq = "NONE|DAILY|WEEKLY|MONTHLY|YEARLY"
    const freq = event.recurrence?.frequency || 'NONE';
    // recEnd = evt. slutdato for gentagelse, eller null
    const recEnd = event.recurrence?.endDate || null;

    // "checkDate" og "eventStartDate" som JS Date
    // checkDate er den dato vil tjekke om eventet forekommer på
    const checkDate = new Date(dateString);
    // eventStartDate er "basis-dato" for eventet
    const eventStartDate = new Date(event.date);

    // a) Hvis checkDate < eventStartDate => event er ikke startet endnu
    if (checkDate < eventStartDate) {
        return false;
    }

    // b) Hvis event har en slutdato for gentagelse (recEnd),
    // og checkDate ligger efter den => event er stoppet.
    if (recEnd) {
        const recEndDate = new Date(recEnd);
        if (checkDate > recEndDate) {
            return false;
        }
    }

    // c) Switch på freq
    switch (freq) {
        case 'NONE':
            // Ingen gentagelse => event gælder kun hvis checkDate == startDate
            return isSameDay(checkDate, eventStartDate);

        case 'DAILY':
            // Eventet gælder alle dage fra startDate til recEnd
            return checkDate >= eventStartDate;

        case 'WEEKLY':
            // Tjek, om der er gået et antal hele uger (7,14,21 ...) siden start
            return isWeeklyMatch(eventStartDate, checkDate);

        case 'MONTHLY':
            // Tjek dag-i-måneden (fx den 8.)
            return isMonthlyMatch(eventStartDate, checkDate);

        case 'YEARLY':
            // Tjek samme dag og måned (fx 8. januar)
            return isYearlyMatch(eventStartDate, checkDate);

        default:
            return false;
    }
}

/**
 * isSameDay:
 * Hjælpefunktion, der checker om to datoer har samme år, måned, dag.
 */
function isSameDay(d1, d2) {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

/**
 * isWeeklyMatch:
 * - Regner forskellen i dage (diffInDays) mellem checkDate og eventStartDate.
 * - Hvis differencen helt multiplum af 7, kommer eventet den dag.
 * - Eksempel: Start på en mandag, 7 dage senere = næste mandag.
 */
function isWeeklyMatch(startDate, checkDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    // Afrund differencen til heltal for at håndtere evt. tidszoneafvigelser
    const diffInDays = Math.floor(
        (checkDate.getTime() - startDate.getTime()) / msPerDay
    );
    if (diffInDays < 0) return false;
    return diffInDays % 7 === 0; // fx 7, 14, 21, ...
}

/**
 * isMonthlyMatch:
 * - Tjekker, om checkDate har samme "dato" (d) i måneden som startDate,
 *   fx den 8.
 * - checkDate >= startDate, så eventet ikke starter før det opr. start.
 */
function isMonthlyMatch(startDate, checkDate) {
    if (checkDate < startDate) return false;
    // Hvis fx startDate er den 8., tjek om checkDate er den 8. i en senere måned.
    if (checkDate.getDate() !== startDate.getDate()) return false;
    return true;
}

/**
 * isYearlyMatch:
 * - Tjekker, om dag og måned matcher, fx 8. januar hvert år.
 * - Ingen rounding, men checkDate >= startDate for at sikre eventet er startet.
 */
function isYearlyMatch(startDate, checkDate) {
    if (checkDate < startDate) return false;
    return (
        checkDate.getDate() === startDate.getDate() &&
        checkDate.getMonth() === startDate.getMonth()
    );
}