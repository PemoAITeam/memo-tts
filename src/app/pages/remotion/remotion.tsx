import { Player } from "@remotion/player";
import { MyComp } from "@/remotion/myComp";
import { staticFile } from "remotion";
import { inject, observer } from "mobx-react";
import DataStore from "@/app/stores/dataStore";
import { useEffect, useState } from "react";
import { TemoData } from "@/app/interface";
import { getLocalFileUrl, getTextFragment } from "@/app/lib/utils";
import { mergeSubtitlesToSRT, parseSRT } from "@/remotion/util";

interface RemotionPageProps {
    dataStore?: DataStore
}

export const RemotionPage = inject('dataStore')(observer(({ dataStore }: RemotionPageProps) => {

    const { temoData } = dataStore!
    const [file, setFile] = useState<TemoData>();
    const [subTitle, setSubTitle] = useState<string>('');

    useEffect(() => {
        setFile(temoData[0])
        const srtData = getTextFragment(temoData[0].infoData)
        const subtitles1 = parseSRT(srtData);
        const mergedSRT = mergeSubtitlesToSRT(subtitles1);
        // console.log(mergedSRT)
        setSubTitle(mergedSRT)
    }, [])

    return (
        <div className=" h-full temo-draggable pt-6">
            <div className="h-full w-full temo-no-draggable">
                {!!file &&
                    <Player
                        component={MyComp}
                        inputProps={{
                            // Audio settings
                            audioOffsetInSeconds: 0,

                            // Title settings
                            // audioFileName: staticFile('audio.mp3'),
                            audioFileName: getLocalFileUrl(file.fileUrl!),
                            coverImgFileName: staticFile('cover.jpg'),
                            titleText:
                                '#234 – Money, Kids, and Choosing Your Market with Justin Jackson of Transistor.fm',
                            titleColor: 'rgba(186, 186, 186, 0.93)',

                            // Subtitles settings
                            subtitlesFileName: staticFile('subtitles.srt'),
                            subText: subTitle,
                            onlyDisplayCurrentSentence: true,
                            subtitlesTextColor: 'rgba(255, 255, 255, 0.93)',
                            subtitlesLinePerPage: 4,
                            subtitlesZoomMeasurerSize: 10,
                            subtitlesLineHeight: 64,
                        }}
                        durationInFrames={30 * Math.ceil(file.metadata?.duration)}
                        compositionWidth={1920}
                        compositionHeight={1080}
                        fps={30}
                        style={{
                            width: '50%',
                            height: '100%',
                        }}
                        controls
                    />
                }
            </div>
        </div>
    );
}));