import './App.scss'
import { Button } from './components/ui/button';
import Tiptap from './components/business/tiptap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { ChangeEvent, useEffect, useState } from 'react';
import EdgeConfig from './components/business/edge-config';
import OpenAIConfig from './components/business/openAI-config';
import VolcanoConfig from './components/business/volcano-config';
import { LuFilePlus } from "react-icons/lu";
import { FiLink } from "react-icons/fi";
import { TbX } from "react-icons/tb";
import axios from 'axios';
import cheerio from 'cheerio';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { secondsToHMS, generateUUID, isWebURL, getLocalFileUrl } from './lib/utils';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Slider } from './components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { RiEditLine } from "react-icons/ri";
import { PiVinylRecord } from "react-icons/pi";
import mammoth from "mammoth";
import { Editor } from '@tiptap/react';
import { TTSOptions } from './lib/tts';
import md5 from 'md5'
import { useToast } from "./components/ui/use-toast"
import { Toaster } from './components/ui/toaster';
// import cdImg from './assets/cd.png'

declare const window: any;

function App() {

  const [service, setService] = useState<'Edge' | 'OpenAI' | 'Volcano'>('Edge')
  const [url, setUrl] = useState('');
  const [valid, setValid] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [speed, setSpeed] = useState<number>(1)
  const [playVol, setPlayVol] = useState<'mute' | 'auto'>('auto')
  const [jenerating, setJenerating] = useState(false)
  const [list, setList] = useState<any[]>([])
  const [editorRef, setEditorRef] = useState<Editor>();
  const [options, setOptions] = useState<TTSOptions>()
  const [curPlay, setCurPlay] = useState<any>();

  useEffect(() => {
    window.AIM.getTemoData().then((data: any) => {
      if (data?.length) {
        setList(data.map((item: any) => ({ ...item, duration: secondsToHMS(item.metadata?.duration) })))
      }
    })
  }, []);

  const { toast } = useToast()

  const fetchWebPageText = async () => {
    try {
      setParsing(true)
      const response = await axios.get(url);
      const html = response.data;

      // 使用cheerio解析HTML
      const $ = cheerio.load(html);

      // 提取文本内容
      const extractedTextContent = $('body').text();

      console.log(extractedTextContent);
      setParsing(false)
    } catch (error) {
      console.error('Error fetching web page:', error);
      setParsing(false)
    }
  };

  const handleService = (e: 'Edge' | 'OpenAI' | 'Volcano') => {
    setService(e)
  }

  const handleFileSelect = async (event: { target: { files: any; }; }) => {
    const file = event.target.files[0];
    console.log(file)
    const reader = new FileReader();
    if (file.type === 'text/plain') {
      reader.readAsText(file);
      reader.onload = e => { // 读取完毕从中取值
        const text = e.target?.result as string;
        editorRef?.chain().insertContentAt(editorRef.state.selection.head, text).focus().run()
        console.log('pointsTxt', text) // 获取到的TXT文件
      };
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
      reader.onloadend = function () {
        const arrayBuffer = reader.result as ArrayBuffer;
        if (arrayBuffer) {
          mammoth.extractRawText({ arrayBuffer: arrayBuffer }).then(function (resultObject) {
            editorRef?.chain().insertContentAt(editorRef.state.selection.head, resultObject.value).focus().run()
          })
        }

      };
      reader.readAsArrayBuffer(file);
    }
  };

  const closeWin = () => {
    window.AIM?.closeTTS()
  }

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValid(isWebURL(e.target.value))
    setUrl(e.target.value)
  }

  const generateAudio = async () => {
    try {
      if (!editorRef?.getText().length) {
        toast({
          variant: "destructive",
          description: `请先在左侧输入框编辑文字...`
        })
        return
      }
      setJenerating(true)
      const jsonData = editorRef?.getJSON().content?.filter(item => !!item.content?.length && item.type === 'editorCard')
      // console.log(jsonData)
      // return;
      let params;
      if (service === 'Edge') {
        params = {
          type: 'Edge',
          lang: options?.lang,
          rate: speed,
          pitch: 0,
          voiceName: options?.voice?.shortName,
          voiceLocalName: options?.voice?.properties.LocalName,
          data: jsonData?.map((item) => {
            const textData = item.content?.find((info) => info.type === 'text')
            const data: any = { text: '', md5: '' }
            if (textData) {
              data.text = textData.text;
              data.md5 = md5(speed + 0 + options?.voice?.shortName + textData.text)
            }
            return data
          })
        }
      } else if (service === 'OpenAI') {
        params = {
          type: 'OpenAI',
          model: options?.model,
          speed: speed,
          voice: options?.voice?.value,
          voiceLocalName: options?.voice?.label,
          data: jsonData?.map((item) => {
            const textData = item.content?.find((info) => info.type === 'text')
            const data: any = { text: '', md5: '' }
            if (textData) {
              data.text = textData.text;
              data.md5 = md5(speed + 0 + options?.voice?.value + textData.text)
            }
            return data
          })
        }
      } else if(service === 'Volcano') {
        params = {
          type: 'Volc',
          emotion: options?.emotion,
          voice_type: options?.voice?.value,
          voiceLocalName: options?.voice?.label,
          scene: options?.scenes,
          data: jsonData?.map((item) => {
            const textData = item.content?.find((info) => info.type === 'text')
            const data: any = { text: '', md5: '' }
            if (textData) {
              data.text = textData.text;
              data.md5 = md5(speed + 0 + options?.voice?.value + textData.text)
            }
            return data
          })
        }
      }
      console.log(params)
      const result = await window.AIM.mergeTemo(params, generateUUID());
      if (result) {
        result.duration = secondsToHMS(result.metadata?.duration)
        setList((old: any) => [...old, result])
      }
      console.log(result)
      setJenerating(false);
    } catch (error) {
      setJenerating(false);
      console.log(error)
    }
  }

  let audioPlayer: HTMLAudioElement | null;
  const playAudio = (item: any, isAudition?: boolean) => {
    if (curPlay?.fileUrl === item.fileUrl && !isAudition) {
      handleEnded()
    } else {
      if (audioPlayer) {
        audioPlayer.pause()
        audioPlayer?.removeEventListener('ended', handleEnded);
      }
      setCurPlay(item);
      setTimeout(() => {
        audioPlayer = document.getElementById('audioPlayer') as HTMLAudioElement;
        audioPlayer.load();
        audioPlayer.play();
        if (!isAudition) {
          audioPlayer.addEventListener('ended', handleEnded);
        }
      })
    }
  }

  const handleEnded = () => {
    console.log('Audio playback stopped');
    // 在这里执行播放结束后的逻辑
    // 移除事件监听器
    audioPlayer?.removeEventListener('ended', handleEnded);
    setCurPlay(null)
    audioPlayer = null;
  };

  const audition = async (params: any, uuid: string) => {
    console.log(params)
    const fileUrl = await window.AIM.getTemoAudition(params, uuid);
    if (fileUrl) {
      playAudio({ fileUrl }, true)
    }
  }

  return (
    <>
      <div className="flex justify-between items-center h-12 p-4">
        <div>
          <Button variant='ghost' className='memo-no-draggable hover:bg-transparent w-8 h-8 rounded-full transition-colors ease-linear' onClick={closeWin} size='icon'><TbX size={16} /></Button>
        </div>
        <div className='flex items-center memo-no-draggable'>
          <Button className="flex items-center relative p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent mr-4">
            <input type="file" onChange={handleFileSelect} className=" absolute w-full h-full opacity-0" accept="application/pdf|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
            <LuFilePlus size={18} />
            <span className=" text-sm ml-1">Add File</span>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center p-0 bg-transparent shadow-none h-auto hover:bg-transparent">
                <FiLink size={18} />
                <span className=" text-sm ml-1">Parse link</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>请输入地址获取文本内容</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input onChange={handleUrlChange} value={url} placeholder='请输入链接地址' className="col-span-3" />
              </div>
              <DialogFooter>
                <Button disabled={!valid || parsing} onClick={fetchWebPageText}>
                  {parsing && <AiOutlineLoading3Quarters className='transition-colors ease-linear animate-spin mr-2' size={16} />}
                  <span>解析</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className='flex p-4 flex-1 memo-no-draggable temo-content'>
        <div className='w-1/3 border h-full p-3 rounded-md overflow-y-scroll'>
          <Tiptap setEditor={setEditorRef} />
        </div>
        <div className='flex-1 flex'>
          <div className='px-4 flex-1'>

            {list.length ? list.map(item => (<div key={item.fileUrl} className={`flex items-center space-x-3 rounded-md border p-3 mb-3 ${item.fileUrl === curPlay?.fileUrl ? 'is-playing-audio' : ''}`}>
              <span className={`flex-shrink-0 ${item.fileUrl === curPlay?.fileUrl ? 'animate-spin' : ''}`}>
                <PiVinylRecord size={36} />
              </span>
              <div className="flex-1 space-y-1">
                <p className="font-medium leading-none">
                  {item.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className=' mr-2'>{item.voiceLocalName}</span>
                  <span>{item.duration}</span>
                </p>
              </div>
              <span className='flex-shrink-0 cursor-pointer text-sm'>下载</span>
              <span className='flex-shrink-0 cursor-pointer text-sm mr-1' onClick={() => playAudio(item)}>{item.fileUrl === curPlay?.fileUrl ? '取消' : '播放'}</span>
            </div>))
              : <div className='flex flex-col items-center justify-center h-full '>
                <p className='flex items-center'>
                  <RiEditLine className=' mr-2' size={20} />
                  <span>请在左边开始编辑内容...</span>
                </p>
                <p className=' text-sm mt-2 text-gray-500'>推荐使用对应的文本语言模型</p>
              </div>}

          </div>
          <div className='px-4 flex-shrink-0 tts-service-panel'>
            <div className="mb-1 text-sm">服务</div>
            <Select defaultValue={service} onValueChange={handleService}>
              <SelectTrigger className=" w-auto min-w-36 mr-4">
                <SelectValue placeholder={service} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='OpenAI'>
                  Open AI
                </SelectItem>
                <SelectItem value='Edge'>
                  Edge
                </SelectItem>
                <SelectItem value='Volcano'>
                  Volcano
                </SelectItem>
              </SelectContent>
            </Select>
            {service === 'Edge' && <EdgeConfig setOptions={setOptions} getAudition={audition} />}
            {service === 'OpenAI' && <OpenAIConfig setOptions={setOptions} getAudition={audition} />}
            {service === 'Volcano' && <VolcanoConfig setOptions={setOptions} getAudition={audition} />}
            <div className="relative mt-8 mb-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  其他设置
                </span>
              </div>
            </div>
            {
              service !== 'Volcano' &&
              <>
                <div className="mb-4 mt-4 flex justify-between">
                  <span>语速</span>
                  <span>{speed}</span>
                </div>
                <Slider className=' cursor-pointer' value={[speed]} onValueChange={(value: number[]) => setSpeed(value[0])} max={100} step={1} />
              </>
            }
            <div className="mb-2 mt-4">音量</div>
            <Tabs value={playVol}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mute" onClick={() => setPlayVol('mute')}>静音</TabsTrigger>
                <TabsTrigger value="auto" onClick={() => setPlayVol('auto')}>自动调整</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button className=' mt-6 w-full' size="lg" disabled={jenerating} onClick={generateAudio}>
              {jenerating && <AiOutlineLoading3Quarters className='transition-colors ease-linear animate-spin mr-2' size={16} />}
              <span>合成</span>
            </Button>
          </div>
        </div>
      </div>
      {curPlay?.fileUrl && <audio id="audioPlayer" controls>
        <source src={getLocalFileUrl(curPlay?.fileUrl)} type="audio/wav" />
      </audio>}
      <Toaster />
    </>
  )
}

export default App
