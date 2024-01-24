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
import { isWebURL } from './lib/utils';

declare const window: any;

function App() {

  const [service, setService] = useState<'Edge' | 'OpenAI' | 'Volcano'>('Edge')
  const [url, setUrl] = useState('');
  const [valid, setValid] = useState(false);

  const fetchWebPageText = async () => {
    try {
      const response = await axios.get(url);
      const html = response.data;

      // 使用cheerio解析HTML
      const $ = cheerio.load(html);

      // 提取文本内容
      const extractedTextContent = $('body').text();

      console.log(extractedTextContent);
    } catch (error) {
      console.error('Error fetching web page:', error);
    }
  };

  const handleService = (e: 'Edge' | 'OpenAI' | 'Volcano') => {
    console.log(e)
    setService(e)
  }

  const handleFileSelect = async (event: { target: { files: any; }; }) => {
    const pdfFile = event.target.files[0];
    console.log(pdfFile)
  };

  const closeWin = () => {
    window.AIM?.closeTTS()
  }

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValid(isWebURL(e.target.value))
    setUrl(e.target.value)
  }

  return (
    <>
      <div className="flex justify-between items-center h-12 p-4">
        <div>
          <Button variant='ghost' className='memo-no-draggable hover:bg-transparent w-8 h-8 rounded-full transition-colors ease-linear' onClick={closeWin} size='icon'><TbX size={16} /></Button>
        </div>
        <div className='flex items-center memo-no-draggable'>
          <Button className="flex items-center relative p-0 bg-transparent shadow-none h-auto hover:bg-transparent mr-4">
            <input type="file" onChange={handleFileSelect} className=" absolute w-full h-full opacity-0" accept=".pdf" />
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
                <Button disabled={!valid} onClick={fetchWebPageText}>解析</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* <Button variant="secondary">Share</Button>
          <Button className=' ml-2' variant="secondary">
            <MdMoreHoriz />
          </Button> */}
        </div>
      </div>
      <div className='flex p-4 flex-1 memo-no-draggable'>
        <div className='w-1/3 border h-full p-3 rounded-md'>
          <Tiptap />
        </div>
        <div className='flex-1 flex'>
          <div className='px-4 flex-1'>
            <div className=" flex items-center space-x-4 rounded-md border p-4">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  Push Notifications
                </p>
                <p className="text-sm text-muted-foreground">
                  Send notifications to device.
                </p>
              </div>
            </div>
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
            {service === 'Edge' && <EdgeConfig />}
            {service === 'OpenAI' && <OpenAIConfig />}
            {service === 'Volcano' && <VolcanoConfig />}
          </div>
        </div>
      </div >
    </>
  )
}

export default App
