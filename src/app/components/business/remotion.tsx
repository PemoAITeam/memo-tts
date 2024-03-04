import { Player } from "@remotion/player";
import { MyComp } from "@/remotion/myComp";
import { staticFile } from "remotion";
import { inject, observer } from "mobx-react";
import DataStore from "@/app/stores/dataStore";
import { useEffect, useState } from "react";
import { TemoData, TemoFileList } from "@/app/interface";
import { getLocalFileUrl, getTextFragment } from "@/app/lib/utils";

interface RemotionPageProps {
    dataStore?: DataStore
    temoData: TemoData,
}

export const Remotion = inject('dataStore')(observer(({ temoData }: RemotionPageProps) => {

    // const { temoData } = dataStore!
    const [file, setFile] = useState<TemoData | null>();
    const [fileList, setFileList] = useState<TemoFileList[]>();
    const [subTitle, setSubTitle] = useState<string>('');

    useEffect(() => {
        if (temoData) {
            setFile(temoData)
            const srtData = getTextFragment(temoData.infoData)
            // const subtitles = parseSRT(srtData);
            // const mergedSRT = mergeSubtitlesToSRT(subtitles1);
            let from = 0;
            const list: TemoFileList[] = temoData.fileList?.map(file => {
                const newObj = {
                    ...file,
                    from,
                    duration: Math.floor(file.metadata.duration)
                }
                from += Math.ceil(file.metadata.duration)
                return newObj
            })
            // console.log(mergedSRT)
            setSubTitle(srtData)
            setFileList(list)
            console.log(list)
        }

    }, [temoData])

    useEffect(() => {
        return () => {
            setFile(null)
            setFileList([])
            setSubTitle('')
        }
    }, [])

    return (
        <div className=" h-full temo-draggable pt-6">
            <div className="h-full w-full temo-no-draggable">
                {!!file &&
                    <Player
                        key={file.uuid}
                        component={MyComp}
                        inputProps={{
                            type: file.type!,
                            // Audio settings
                            audioOffsetInSeconds: 0,

                            // Title settings
                            // audioFileName: staticFile('audio.mp3'),
                            bgm: file.bgm?.path ? getLocalFileUrl(file.bgm?.path) : '',
                            audioFileName: getLocalFileUrl(file.fileUrl!),
                            // titleText:
                            //     '#234 – Money, Kids, and Choosing Your Market with Justin Jackson of Transistor.fm',
                            // titleColor: 'rgba(186, 186, 186, 0.93)',

                            // Subtitles settings
                            subtitlesFileName: staticFile('subtitles.srt'),
                            subText: subTitle,
                            onlyDisplayCurrentSentence: true,
                            subtitlesTextColor: 'rgba(255, 255, 255, 0.93)',
                            subtitlesLinePerPage: 4,
                            subtitlesZoomMeasurerSize: 10,
                            subtitlesLineHeight: 64,
                            fileList: fileList!,
                            duration: 30 * Math.ceil(file.metadata?.duration)
                        }}
                        durationInFrames={30 * Math.ceil(file.metadata?.duration)}
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