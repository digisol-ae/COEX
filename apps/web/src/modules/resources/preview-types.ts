/** Browser-safe checks; hashing and OTP verification stay server-side. */
export const previewable = (type: string) =>
  type === 'application/pdf' || type.startsWith('image/') || type.startsWith('text/plain');
