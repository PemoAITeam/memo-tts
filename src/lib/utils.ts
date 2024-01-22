import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertFileToBlob(file: Blob) {
  const reader = new FileReader();

  reader.onload = function (event) {
    const fileContentArrayBuffer = event.target?.result;
    const blob = new Blob([fileContentArrayBuffer!], { type: file.type });

    // Now 'blob' contains the file data in Blob format
    console.log('Blob:', blob);

    // You can use the blob as needed, for example, send it to a server, etc.
  };

  reader.readAsArrayBuffer(file);
}