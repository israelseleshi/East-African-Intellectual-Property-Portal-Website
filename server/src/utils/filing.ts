/**
 * Sanitizes a string for use in a filename by removing special characters,
 * replacing spaces with underscores, and limiting length.
 */
export function sanitizeFilename(str: string): string {
    if (!str) return 'unknown';
    
    return str
        .toLowerCase()
        // Replace spaces and special chars with underscores
        .replace(/[^a-z0-9]/gi, '_')
        // Remove multiple consecutive underscores
        .replace(/_+/g, '_')
        // Remove leading/trailing underscores
        .replace(/^_+|_+$/g, '')
        // Limit length to 40 characters to keep filenames manageable
        .substring(0, 40);
}
