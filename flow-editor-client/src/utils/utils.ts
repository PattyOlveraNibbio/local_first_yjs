export function stringToColor(str: string) {
    let colour = '#';
    let hash = 0;
    for (const char of str) {
      hash = char.charCodeAt(0) + (hash << 5) - hash;
    }
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      colour += value.toString(16).padStart(2, '0');
    }
    return colour;
  }