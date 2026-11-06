export function passwordChecks(value){return {length:value.length>=12&&value.length<=128,lower:/[a-z]/.test(value),upper:/[A-Z]/.test(value),number:/[0-9]/.test(value),symbol:/[^A-Za-z0-9\s]/.test(value)};}
export function strongPassword(value){return Object.values(passwordChecks(value)).every(Boolean);}
