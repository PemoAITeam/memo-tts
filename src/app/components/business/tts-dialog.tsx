import { useEffect, useRef, useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { useTranslation } from "react-i18next"
import { GoPlus } from "react-icons/go";
import { Button } from "../ui/button";
import { inject, observer } from "mobx-react";
import DataStore from "@/app/stores/dataStore";
import { LibraryData } from "@/app/interface";
import { getLocalFileUrl } from "@/app/lib/utils";
import { TbVolume } from "react-icons/tb";
import { LuFileClock } from "react-icons/lu";

interface TTSDialogProps {
    selectImage: (path: string) => void
    dataStore?: DataStore
    fileType: 'pic' | 'media'
}

const TTSDialog = inject('dataStore')(observer(({ selectImage, dataStore, fileType }: TTSDialogProps) => {
    const { t } = useTranslation()
    const [type, setType] = useState<'myLibrary' | 'generate' | 'favorate'>('myLibrary')
    const [list, setList] = useState<LibraryData[]>()
    const bgmAudioRef = useRef<any>();
    const [isPlaying, setIsPlaying] = useState(false);
    const [curPath, setCurPath] = useState<string>();

    useEffect(() => {
        const data = dataStore?.libraryData.filter(item => item.type === fileType)
        setList(data)
        console.log(data)
    }, [dataStore?.libraryData, fileType])

    useEffect(() => {
        return () => {
            if (bgmAudioRef?.current) {
                bgmAudioRef.current.pause();
                bgmAudioRef.current.src = '';
                setIsPlaying(false);
            }
        }
    }, [])

    const selectBgPic = async () => {
        const file: any = await window.AIM.openDialog('showOpenDialogSync', {
            properties: ['openFile'],
            filters: [{ name: '', extensions: fileType === 'pic' ? ['jpg', 'jpeg', 'png'] : ['mp3'] }]
        })
        if (!file) return
        const filePath = file[0];
        selectImage(filePath)
    }

    const playBgm = (event: any, path: string) => {
        if (event) {
            event.stopPropagation();
        }
        if (isPlaying) {
            bgmAudioRef.current.pause();
        }
        if (curPath !== path) {
            bgmAudioRef.current.src = getLocalFileUrl(path)
            bgmAudioRef.current.play();
            setCurPath(path)
        }

        setIsPlaying(!isPlaying);
    }

    return (
        <div>
            <Tabs value={type} className=" w-2/3">
                <TabsList className="grid grid-cols-3">
                    <TabsTrigger className='px-1' value="myLibrary" onClick={() => setType('myLibrary')}>{t('tts.my library')}</TabsTrigger>
                    <TabsTrigger className='px-1' value="generate" onClick={() => setType('generate')}>{t('tts.generate')}</TabsTrigger>
                    <TabsTrigger className='px-1' value="favorate" onClick={() => setType('favorate')}>{t('tts.favorate')}</TabsTrigger>
                </TabsList>
            </Tabs>
            {type === 'myLibrary' && <div className=" mt-4 flex items-center flex-wrap">
                <Button variant='ghost' onClick={selectBgPic} className=" border mr-4 h-auto w-auto mt-4 p-0 text-gray-300">
                    <GoPlus size={fileType === 'pic' ? 128 : 86} />
                </Button>
                {!!list?.length &&
                    list.map(item => (
                        fileType == 'pic' ? <div key={item.name} className="border rounded-md mr-4 w-32 h-32 mt-4 cursor-pointer" onClick={() => selectImage(item.path)}>
                            <img className="cover w-full h-full object-cover" src={getLocalFileUrl(item.path)} />
                        </div> : <div key={item.name} className="flex justify-center flex-col border p-4 rounded-md ml-4 cursor-pointer" onClick={() => selectImage(item.path)}>
                            <div className="flex items-center">
                                <TbVolume onClick={(e) => playBgm(e, item.path)} className={`mr-1 cursor-pointer flex-shrink-0 ${curPath === item.path ? 'text-indigo-500' : ''}`} size={18} />
                                <span>{item.name}</span>
                            </div>
                            <div className="flex items-center mt-2">
                                <LuFileClock className=" mr-1" size={16} />
                                <span className="text-sm">{item.duration}</span>
                            </div>
                        </div>
                    ))}
            </div>}
            <audio className='audioRef' ref={bgmAudioRef} controls></audio>
        </div>
    )
}))

export default TTSDialog