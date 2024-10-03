import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clearIndexedDB() {
  indexedDB.deleteDatabase('REACTFLOW-COLLAB-EXAMPLE');
  console.log('IndexedDB cleared');
}