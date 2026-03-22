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

  const formattedHours = hours > 0 ? pad(hours, 2) : '';
  const formattedMinutes = minutes > 0 ? pad(minutes, 2) : '00';
  const formattedSeconds = pad(remainingSeconds, 2);

  return `${formattedHours ? formattedHours + ':' : ''}${formattedMinutes}:${formattedSeconds}`;
}

export function getLocalFileUrl(filePath: string) {
  return filePath ? /^https?:\/\//g.test(filePath) ? filePath : 'aim:///' + filePath.replace(/%/g, '__@5@__') : '';
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
  const fileList: TemoFileList[] = result.fileList?.map((file: any) => {
    const { pic: _pic, ...rest } = file
    const newObj = {
      ...rest,
      from,
      duration: Math.ceil(file.metadata.duration)
    }
    from += Math.ceil(file.metadata.duration)
    duration += newObj.duration
    return newObj
  })
  return { ...result, duration: secondsToHMS(duration), fileDuration: duration, fileList }

}

export function patchTemoData(data: TemoData) {
  const fileList = (data.infoData!.order as string[]).map(item => {
    const { pic: _pic, ...rest } = data.infoData![item] as Record<string, any>
    return rest as TemoFileList
  })
  return fileList
}

// export function splitString(str: string, chunkSize: number) {
//   // 在达到字数限制时寻找最近的标点符号

//   const result = [];
//   for (let i = 0; i < str.length; i += chunkSize) {
//     result.push(str.slice(i, i + chunkSize));
//   }
//   return result;
// }

// const text = "这是第一行。\n这是一个很长的第二行，需要被分割。这里有标点符号。\n这是第三行";
// const chunks = splitString(text, 10);
export function splitString(str: string, chunkSize: number = 1000) {
  // 首先按换行符分割
  const lines = str.split(/\r\n|\n/).filter(line => line.trim() !== '');
  const result: string[] = [];
  
  // 处理每一行文本
  lines.forEach(line => {
    // 如果单行长度小于限制，直接添加
    if (line.length <= chunkSize) {
      result.push(line);
      return;
    }
    
    // 如果超过长度限制，尝试按标点符号分割
    let remainingText = line;
    while (remainingText.length > chunkSize) {
      // 在限制长度内查找最后一个标点符号
      let sliceIndex = -1;
      for (let i = chunkSize; i >= 0; i--) {
        if (/[。.!?！？]/.test(remainingText[i])) {
          sliceIndex = i + 1;
          break;
        }
      }
      
      // 如果找不到标点符号，则强制按长度分割
      if (sliceIndex === -1) {
        sliceIndex = chunkSize;
      }
      
      // 添加分割后的文本
      result.push(remainingText.slice(0, sliceIndex));
      remainingText = remainingText.slice(sliceIndex).trim();
    }
    
    // 添加剩余文本（如果有）
    if (remainingText.length > 0) {
      result.push(remainingText);
    }
  });
  
  return result;
}

export function getJSONDataFromEditorContents(editorContent: any, target: string) {
  console.log('getJSONDataFromEditorContents called, editorContent:', editorContent, 'target:', target)
  const jsonData: any[] = [];
  if (editorContent?.length) {
      editorContent.forEach((item: { type: string; attrs: { voice: any } }, index: number) => {
          if (item.type == 'editorCard' && editorContent[index + 1]?.type == 'translateCard') {
              if (item.attrs?.voice) {
                  editorContent[index + 1].attrs!.voice = item.attrs.voice
              } else {
                  delete editorContent[index + 1].attrs!.voice
              }
          }
      })
  }
  editorContent.forEach((item: { attrs: { id: string, voice?: any }, content: string | any[]; type: string; }) => {
      console.log('checking item:', item.type, 'hasContent:', !!item.content?.length, 'attrs:', item.attrs)
      // 检查是否有任何文本内容（不要求第一个元素必须是 text）
      const hasTextContent = Array.isArray(item.content) && item.content.some((child: any) => child.type === 'text' && child.text)
      if (hasTextContent && (item.type === 'editorCard' || item.type === 'translateCard')) {
          console.log('passed first check, voice:', item.attrs?.voice)
          if (item.attrs.voice && (item.attrs.voice?.target === 'original' && item.type === 'editorCard' || (item.attrs.voice?.target !== 'original' && item.type === 'translateCard'))) {
              console.log('pushing with voice')
              jsonData.push(item)
          } else if (!item.attrs.voice && (target === 'original' && item.type === 'editorCard' || (target !== 'original' && item.type === 'translateCard'))) {
              console.log('pushing without voice, target:', target, 'type:', item.type)
              jsonData.push(item)
          } else {
              console.log('not matched, voice condition failed')
          }
      } else {
          console.log('first check failed, hasTextContent:', hasTextContent)
      }
  })
  console.log('getJSONDataFromEditorContents result:', jsonData)
  return jsonData
}

/**
 * 文本片段接口，包含速度和情绪属性
 */
export interface TextSegment {
  text: string
  speed?: number | null
  emotion?: string | null
  config?: Record<string, any> | null
  voiceConfig?: Record<string, any> | null
}

function parseTTSMentionConfig(config: unknown): Record<string, any> | null {
  if (!config) {
    return null
  }

  if (typeof config === 'string') {
    try {
      return JSON.parse(config)
    } catch (error) {
      console.warn('Failed to parse ttsMention config:', error)
      return null
    }
  }

  if (typeof config === 'object') {
    return config as Record<string, any>
  }

  return null
}

function isSameVoiceConfig(
  left?: Record<string, any> | null,
  right?: Record<string, any> | null
) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

/**
 * 从编辑器内容节点中提取文本片段，保留 Mark 属性
 * 遍历文本节点，根据 ttsMark 的边界分割文本
 */
export function extractTextSegmentsFromNode(node: any): TextSegment[] {
  const segments: TextSegment[] = []

  if (!node?.content || !Array.isArray(node.content)) {
    return segments
  }

  // 递归处理节点内容
  const processContent = (content: any[], inheritedSpeed?: number | null, inheritedEmotion?: string | null) => {
    content.forEach((child: any) => {
      if (child.type === 'text') {
        // 检查是否有 ttsMark
        const ttsMark = child.marks?.find((m: any) => m.type === 'ttsMark')

        segments.push({
          text: child.text || '',
          speed: ttsMark?.attrs?.speed ?? inheritedSpeed ?? null,
          emotion: ttsMark?.attrs?.emotion ?? inheritedEmotion ?? null,
        })
      } else if (child.content) {
        // 递归处理嵌套内容
        const childMark = child.marks?.find((m: any) => m.type === 'ttsMark')
        processContent(
          child.content,
          childMark?.attrs?.speed ?? inheritedSpeed,
          childMark?.attrs?.emotion ?? inheritedEmotion
        )
      }
    })
  }

  processContent(node.content)

  // 合并相邻的相同属性片段
  return mergeSegments(segments)
}

export function extractTextSegmentsFromNodeWithMentions(node: any): TextSegment[] {
  const segments: TextSegment[] = []

  if (!node?.content || !Array.isArray(node.content)) {
    return segments
  }

  const processContent = (
    content: any[],
    inheritedSpeed?: number | null,
    inheritedEmotion?: string | null,
    inheritedVoiceConfig?: Record<string, any> | null,
  ) => {
    let currentVoiceConfig = inheritedVoiceConfig ?? null

    content.forEach((child: any) => {
      if (child.type === 'ttsMention') {
        currentVoiceConfig = parseTTSMentionConfig(child.attrs?.config)
        return
      }

      const ttsMark = child.marks?.find((mark: any) => mark.type === 'ttsMark')
      const nextSpeed = ttsMark?.attrs?.speed ?? inheritedSpeed ?? null
      const nextEmotion = ttsMark?.attrs?.emotion ?? inheritedEmotion ?? null

      if (child.type === 'text') {
        if (!child.text) {
          return
        }

        segments.push({
          text: child.text,
          speed: nextSpeed,
          emotion: nextEmotion,
          voiceConfig: currentVoiceConfig,
        })
        return
      }

      if (child.content) {
        processContent(
          child.content,
          nextSpeed,
          nextEmotion,
          currentVoiceConfig,
        )
      }
    })
  }

  processContent(node.content)
  return mergeSegmentsWithVoice(segments)
}

/**
 * 合并相邻的相同属性片段
 */
function mergeSegments(segments: TextSegment[]): TextSegment[] {
  if (segments.length === 0) return []

  const result: TextSegment[] = []
  let current = { ...segments[0] }

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i]

    // 如果属性相同，合并文本
    if (current.speed === next.speed && current.emotion === next.emotion) {
      current.text += next.text
    } else {
      result.push(current)
      current = { ...next }
    }
  }

  result.push(current)
  return result
}

function mergeSegmentsWithVoice(segments: TextSegment[]): TextSegment[] {
  if (segments.length === 0) return []

  const result: TextSegment[] = []
  let current = { ...segments[0] }

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i]

    if (
      current.speed === next.speed &&
      current.emotion === next.emotion &&
      isSameVoiceConfig(current.voiceConfig, next.voiceConfig)
    ) {
      current.text += next.text
    } else {
      result.push(current)
      current = { ...next }
    }
  }

  result.push(current)
  return result
}

/**
 * 从编辑器卡片中提取所有文本片段及其 TTS 属性
 */
export function extractTextSegmentsFromEditorCard(cardData: any): TextSegment[] {
  const allSegments: TextSegment[] = []

  // 获取文本内容
  const textData = cardData.content?.find((info: any) => info.type === 'text')
  if (!textData?.text) {
    return allSegments
  }

  // 检查是否有 ttsMark
  const segments = extractTextSegmentsFromNode({ content: [textData] })

  // 如果没有分段（没有 marks），返回整个文本
  if (segments.length === 0) {
    return [{ text: textData.text }]
  }

  return segments
}

/**
 * 扩展的 JSON 数据项，包含分段信息
 */
export interface ExtendedJsonDataItem {
  text: string
  md5: string
  options?: any
  textChunks?: string[]
  // 新增：每个文本段的 TTS 属性
  segments?: TextSegment[]
}
