import { Player, PlayerRef } from "@remotion/player";
import { MyComp } from "@/remotion/myComp";
import { inject, observer } from "mobx-react";
import DataStore from "@/app/stores/dataStore";
import { useEffect, useRef, useState } from "react";
import { TemoData, TemoFileList } from "@/app/interface";
import { getLocalFileUrl } from "@/app/lib/utils";

interface RemotionPageProps {
    dataStore?: DataStore
    temoData: TemoData,
    getPlayer?: (player: PlayerRef) => void
}

export const Remotion = inject('dataStore')(observer(({ temoData, getPlayer }: RemotionPageProps) => {

    // const { temoData } = dataStore!
    const [file, setFile] = useState<TemoData | null>();
    const [fileList, setFileList] = useState<TemoFileList[]>();
    const playerRef = useRef<PlayerRef>(null);

    useEffect(() => {
        if (temoData) {
            setFile(temoData)
            setFileList(temoData.fileList)
        }

    }, [temoData])

    useEffect(() => {
        if (playerRef?.current && getPlayer) {
            getPlayer(playerRef.current)
        }
    }, [playerRef, getPlayer])

    useEffect(() => {
        return () => {
            setFile(null)
            setFileList([])
        }
    }, [])

    return (
        <div className=" h-full temo-draggable pt-6">
            <div className="h-full w-full temo-no-draggable">
                {!!file &&
                    <Player
                        ref={playerRef}
                        key={file.uuid}
                        component={MyComp}
                        inputProps={{
                            type: file.type!,

                            // Title settings
                            // audioFileName: staticFile('audio.mp3'),
                            bgm: file.bgm?.path ? getLocalFileUrl(file.bgm?.path) : '',
                            audioFileName: getLocalFileUrl(file.fileUrl!),
                            // titleText:
                            //     '#234 – Money, Kids, and Choosing Your Market with Justin Jackson of Transistor.fm',
                            // titleColor: 'rgba(186, 186, 186, 0.93)',

                            // Subtitles settings
                            fileList: fileList!,
                            duration: 30 * Math.ceil(file.fileDuration)
                        }}
                        durationInFrames={30 * Math.ceil(file.fileDuration)}
                        compositionWidth={1920}
                        compositionHeight={1080}
                        fps={30}
                        style={{
                            width: '100%',
                            height: '50%',
                        }}
                        className="tts-remotion-player"
                        controls
                    />
                }
            </div>
        </div>
    );
}));