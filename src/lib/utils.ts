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

export const regExp = new RegExp(
  "^" +
  // protocol identifier (optional)
  // short syntax // still required
  "(?:(?:(?:https?|ftp):)?\\/\\/)" +
  // user:pass BasicAuth (optional)
  "(?:\\S+(?::\\S*)?@)?" +
  "(?:" +
  // IP address exclusion
  // private & local networks
  "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
  "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
  "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
  // IP address dotted notation octets
  // excludes loopback network 0.0.0.0
  // excludes reserved space >= 224.0.0.0
  // excludes network & broadcast addresses
  // (first & last IP address of each class)
  "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
  "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
  "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
  "|" +
  // host & domain names, may end with dot
  // can be replaced by a shortest alternative
  // (?![-_])(?:[-\\w\\u00a1-\\uffff]{0,63}[^-_]\\.)+
  "(?:" +
  "(?:" +
  "[a-z0-9\\u00a1-\\uffff]" +
  "[a-z0-9\\u00a1-\\uffff_-]{0,62}" +
  ")?" +
  "[a-z0-9\\u00a1-\\uffff]\\." +
  ")+" +
  // TLD identifier name, may end with dot
  "(?:[a-z\\u00a1-\\uffff]{2,}\\.?)" +
  ")" +
  // port number (optional)
  "(?::\\d{2,5})?" +
  // resource path (optional)
  "(?:[/?#]\\S*)?" +
  "$", "i"
)


export function isWebURL(url: string): boolean { return regExp.test(url) }

export function generateUUID(): string {
  let d = new Date().getTime();
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (c) {
      const r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);

      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    }
  );

  return uuid;
}

export function getAudioDuration(filePath: string) {
  const audio = new Audio(filePath);

  return new Promise((resolve) => {
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
  });
}

export function secondsToHMS(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedHours = hours > 0 ? `${hours}时` : '';
  const formattedMinutes = minutes > 0 ? `${minutes}分` : '';
  const formattedSeconds = `${remainingSeconds}秒`;

  return `${formattedHours}${formattedMinutes}${formattedSeconds}`;
}

export function getLocalFileUrl(filePath: string) {
  return /^https?:\/\//g.test(filePath) ? filePath : 'aim:///' + filePath.replace(/%/g, '__@5@__');
}

export function getData(voice: any, emotion: any) {
  let list: any = []
  voice.forEach((item: any) => {
    if(emotion[item.value]) {
      list = list.concat(emotion[item.value])
    }
  });
  const lists = Array.from(
    new Map(list.map((item: any) => [item.value, item])).values()
  );
  console.log(lists)
}