/**
 * doesEventOccurOnDate(event, dateString)
 * 
 * event: {
 *   date: "2023-06-30"  // start-dato (ISO)
 *   startTime: "2023-06-30T12:00:00.000Z"
 *   endTime:   "2023-06-30T13:00:00.000Z"
 *   recurrence: {
 *     frequency: "NONE|DAILY|WEEKLY|MONTHLY|YEARLY",
 *     endDate: "2023-09-01"   // eller null
 *   }
 *   ...
 * }
 * dateString: "2023-07-10"
 * 
 * Returner true, hvis event forekommer på dateString 
 */

export function doesEventOccurOnDate(event, dateString) {
    // 1) Tjek om event har en start-dato = event.date 
    // 2) Tjek recurrence
    const freq = event.recurrence?.frequency || "NONE";
    const recEnd = event.recurrence?.endDate || null;

    // Convert dateString til en Date
    const checkDate = new Date(dateString);
    // Convert event.date til Date
    const eventStartDate = new Date(event.date);

    // a) Hvis checkDate < eventStartDate => event er ikke startet
    if (checkDate < eventStartDate) {
        return false;
    }

    // b) Hvis recEnd != null, og checkDate > recEnd => event er stoppet
    if (recEnd) {
        const recEndDate = new Date(recEnd);
        // Tilføj midnatstid
        if (checkDate > recEndDate) {
            return false;
        }
    }

    // c) Switch freq
    switch (freq) {
        case "NONE":
            // checkDate == eventStartDate ?
            return isSameDay(checkDate, eventStartDate);

        case "DAILY":
            // Hver dag fra eventStartDate til recEnd
            // checkDate >= eventStartDate ?
            return (checkDate >= eventStartDate);

        case "WEEKLY":
            // Samme ugedag => (checkDate - eventStartDate) mod 7 = 0
            // + checkDate >= eventStartDate
            if (checkDate < eventStartDate) return false;
            return isWeeklyMatch(eventStartDate, checkDate);

        case "MONTHLY":
            // Samme dag i måneden?
            return isMonthlyMatch(eventStartDate, checkDate);

        case "YEARLY":
            // Samme dag+måned?
            return isYearlyMatch(eventStartDate, checkDate);

        default:
            return false;
    }
}

// Helper: check if two dates share same year-month-day
function isSameDay(d1, d2) {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

function isWeeklyMatch(startDate, checkDate) {
    // Tjek om (checkDate - startDate) i dage er multiple of 7
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = (checkDate - startDate) / msPerDay;
    if (diff < 0) return false;
    // e.g. if diff=14 => 14 % 7=0 => yes 2 weeks after start
    return (diff % 7 === 0);
}

function isMonthlyMatch(startDate, checkDate) {
    // Samme dag-i-måneden => startDate.getDate() == checkDate.getDate()
    // + checkDate >= startDate
    if (checkDate < startDate) return false;

    // Tjek om day-of-month matcher
    if (checkDate.getDate() !== startDate.getDate()) return false;

    // check, om checkDate >= startDate, ignoring day
    // year-month difference >= 0
    return checkDate.getTime() >= startDate.getTime();
}

function isYearlyMatch(startDate, checkDate) {
    // Samme dag og måned => (startDate.getDate(), startDate.getMonth()) 
    // + checkDate >= startDate
    if (checkDate < startDate) return false;
    if (checkDate.getDate() !== startDate.getDate()) return false;
    if (checkDate.getMonth() !== startDate.getMonth()) return false;
    return true;
}
