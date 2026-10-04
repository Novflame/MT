/**
 * Returns the next number in a sequence.
 *
 * Example:
 * [1, 2, 3, 4] → 5
 * [1, 2, 4]    → 5
 * []           → 1
 */
export function getNextSequence(values: number[]): number {
    if (values.length === 0) {
        return 1
    }

    return Math.max(...values) + 1
}


export function formatSequence(
    value: number,
    digits = 2,
): string {
    return String(value).padStart(digits, "0")
}