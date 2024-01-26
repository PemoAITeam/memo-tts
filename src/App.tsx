import './App.scss'
import { Button } from './components/ui/button';
import Tiptap from './components/business/tiptap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
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
import { generateUUID, isWebURL } from './lib/utils';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Slider } from './components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { RiEditLine } from "react-icons/ri";
import mammoth from "mammoth";
import { Editor } from '@tiptap/react';
import { AllLanguage } from './lib/tts';
import md5 from 'md5'

declare const window: any;

function App() {

  const [service, setService] = useState<'Edge' | 'OpenAI' | 'Volcano'>('Edge')
  const [url, setUrl] = useState('');
  const [valid, setValid] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [speed, setSpeed] = useState<number>(0)
  const [playVol, setPlayVol] = useState<'mute' | 'auto'>('auto')
  const [jenerating, setJenerating] = useState(false)
  const [list, setList] = useState<any[]>([])
  const [editorRef, setEditorRef] = useState<Editor>();
  const [options, setOptions] = useState<{ lang?: AllLanguage, voice?: any }>()

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
      if(!editorRef?.getText().length) {
        
        return
      }
      setJenerating(true)
      const jsonData = editorRef?.getJSON().content?.filter(item => !!item.content?.length)
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
          temo: true,
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
      }
      console.log(params)
      const result = await window.AIM.textToSpeech(params, generateUUID());
      if(result) {
        result.voice = options?.voice;
        result.lang = options?.lang
        console.log(result)
        setList((old: any) => [...old,...result])
      }
      setJenerating(false);
    } catch (error) {
      setJenerating(false);
      console.log(error)
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

          {/* <Button variant="secondary">Share</Button>
          <Button className=' ml-2' variant="secondary">
            <MdMoreHoriz />
          </Button> */}
        </div>
      </div>
      <div className='flex p-4 flex-1 memo-no-draggable temo-content'>
        <div className='w-1/3 border h-full p-3 rounded-md overflow-y-scroll'>
          <Tiptap setEditor={setEditorRef} />
        </div>
        <div className='flex-1 flex'>
          <div className='px-4 flex-1'>

            {list.length ? list.map(item => (<div className=" flex items-center space-x-4 rounded-md border p-4">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {item.voice.properties.LocalName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Send notifications to device.
                </p>
              </div>
            </div>))
             : <div className='flex items-center h-full justify-center'>
              <RiEditLine className=' mr-2' size={20} />
              <span>请在左边开始编辑内容...</span>
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
            {service === 'Edge' && <EdgeConfig setOptions={setOptions} />}
            {service === 'OpenAI' && <OpenAIConfig />}
            {service === 'Volcano' && <VolcanoConfig />}
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
      </div >
    </>
  )
}

export default App
