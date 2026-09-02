// Fehler, deren Meldung bewusst für Disponenten verständlich formuliert ist
// und direkt in der Oberfläche angezeigt werden darf. Jeder andere Fehler
// (Bugs, Datenbank-/Netzwerkprobleme etc.) wird stattdessen mit einer
// generischen Meldung abgefangen - technische Details/Stacktraces dürfen
// nie in der Oberfläche auftauchen, sondern nur im Server-Log landen.
export class UserFacingError extends Error {}
