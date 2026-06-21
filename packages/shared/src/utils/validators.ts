export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isPhone = (v: string) => /^[+\d][\d\s().-]{6,}$/.test(v);
