export function padNumber(number) {
    return String(number).padStart(2, '0');
}

export function formatMonthDay(date) {
    const month = padNumber(date.getMonth() + 1);
    const day = padNumber(date.getDate());
    return `${month}.${day}`;
}