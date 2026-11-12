export const SIGNATURE_STYLES = [
  { name: 'Script', font: '"Brush Script MT", "Segoe Script", cursive', italic: false },
  { name: 'Classic', font: 'Georgia, "Times New Roman", serif', italic: true },
  { name: 'Simple', font: 'Arial, sans-serif', italic: true },
] as const;
export type SignatureMethod = 'typed' | 'drawn' | 'uploaded';
export interface SignatureCapture {
  method: SignatureMethod;
  style?: number;
  imageDataUrl?: string;
}

export const FIRST_PARTY_CONSENT =
  'I am authorised to sign for the first party. I have reviewed this agreement and intend to sign it electronically on behalf of the first party.';
