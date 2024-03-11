import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { cloneDeep } from 'lodash-es';
import { TemoData, TemoFileList, WhisperSegments } from "@/app/interface";

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
  const remainingSeconds = Math.ceil(seconds % 60);

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
    if (emotion[item.value]) {
      list = list.concat(emotion[item.value])
    }
  });
  const lists = Array.from(
    new Map(list.map((item: any) => [item.value, item])).values()
  );
  console.log(lists)
}

export function jsonToSrt(data: { start?: string, end?: string, text?: string }[]) {
  let srt_data = "";
  data.forEach((item, index) => {
    const start = (item.start as string).length > 5 ? `${item.start}` : `00:${item.start}`;
    const end = (item.end as string).length > 5 ? `${item.end}` : `00:${item.end}`;
    const text = `${index + 1}\n${start} --> ${end}\n${item.text}\n\n`
    srt_data += text;
  })
  return srt_data;
}

function pad(number: string | number, length: number) {
  // 在数字前面补零，确保有指定的位数
  let str = '' + number;
  while (str.length < length) {
    str = '0' + str;
  }
  return str;
}

export function secondsToSRT(timeInSeconds: number) {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.round((timeInSeconds % 1) * 1000);

  // 格式化输出，确保小时、分钟、秒和毫秒都有两位数
  const formattedTime =
    pad(hours, 2) +
    ':' +
    pad(minutes, 2) +
    ':' +
    pad(seconds, 2) +
    ',' +
    pad(milliseconds, 3);

  return formattedTime;
}

export function getTranscriptionData(data: { start: string, text: string, end: string }[]) {
  const items = data.map(item => {
    return {
      start: secondsToSRT(parseFloat(item.start)),
      text: item.text,
      end: secondsToSRT(parseFloat(item.end))
    }
  })
  return items
}

export function getTextFragment(infoData: any) {
  const textInfo: any = [];
  let startTime = 0;
  infoData.order.forEach((uuid: string) => {
    const item = infoData[uuid];
    textInfo.push({
      start: startTime,
      end: item.metadata.duration + startTime,
      text: item.text
    })
    startTime += item.metadata.duration
  })
  const items = getTranscriptionData(textInfo);
  return jsonToSrt(items)
}

export function getSpeed(speed: string) {
  let rate: number = 0;
  switch (speed) {
    case '0.5':
      rate = -30;
      break;
    case '0.75':
      rate = -15;
      break;
    case '1':
      rate = 0;
      break;
    case '1.5':
      rate = 15;
      break;
    case '2':
      rate = 30;
      break;
    case '3':
      rate = 60;
      break;
    case '4':
      rate = 100;
      break;
  }
  return rate
}

export function resultItemString(
  strArray: string[],
  convertResult: WhisperSegments[],
  translateResult?: WhisperSegments[]
) {
  const result = translateResult && translateResult.length ? cloneDeep(translateResult) : cloneDeep(convertResult)
  strArray.forEach((str) => {
    if (str) {
      const regex = /^\[(\d+)\]([\s\S]*)/
      const matches = regex.exec(str.trim())
      if (matches) {
        const number = matches[1]
        const text = matches[2]
        const index = Number(number)
        if (index >= 0 && index < convertResult.length) {
          result[index] = result[index] || {}
          result[index].text = text
          result[index].st = convertResult[index].st
          result[index].et = convertResult[index].et
        }
      }
    }
  })

  return result
}

export function mergeTranslate(array1: Record<string, any>[], array2: Record<string, any>[]) {
  return array1.flatMap((item: any, index: number) => {
    const matchingObject = array2.find(obj => obj.index === index);
    if (matchingObject) {
      return [item, { type: 'translateCard', content: [{ type: 'text', text: matchingObject.text }] }];
    }

    return item;
  });
}


export function hasDuplicateId(arr: any[]) {
  const idSet = new Set();
  for (const item of arr) {
    if (idSet.has(item.attrs.id)) {
      return item.attrs.id; // 发现重复的 id
    }
    idSet.add(item.attrs.id);
  }
  return false; // 没有重复的 id
}

export function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);

  // 获取年、月、日、时、分、秒
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // 拼接成格式化的时间字符串
  const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  return formattedTime;
}

export function lowercaseFirstLetter(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function updateTemoData(result: TemoData) {
  let from = 0, duration = 0;
  const fileList: TemoFileList[] = result.fileList?.map(file => {
    const newObj = {
      ...file,
      from,
      duration: Math.ceil(file.metadata.duration)
    }
    from += Math.ceil(file.metadata.duration)
    duration += newObj.duration
    return newObj
  })
  return { ...result, fileDuration: duration, fileList }

}