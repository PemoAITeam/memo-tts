import './App.scss'
import { MdMoreHoriz } from "react-icons/md";
import { Button } from './components/ui/button';
import Tiptap from './components/business/tiptap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { useState } from 'react';
import EdgeConfig from './components/business/edge-config';
import OpenAIConfig from './components/business/openAI-config';
import VolcanoConfig from './components/business/volcano-config';

function App() {

  const [service, setService] = useState<'Edge' | 'OpenAI' | 'Volcano'>('Edge')

  const handleService = (e: 'Edge' | 'OpenAI' | 'Volcano') => {
    console.log(e)
    setService(e)
  }

  return (
    <>
      <div className="flex justify-between items-center h-11 p-4 border-b">
        <span>Temo</span>
        <div className='flex items-center'>
          <Button variant="secondary">Share</Button>
          <Button className=' ml-2' variant="secondary">
            <MdMoreHoriz />
          </Button>
        </div>
      </div>
      <div className='flex p-4 flex-1'>
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
