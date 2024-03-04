import './style.css'
import React, { useEffect, useRef, useState } from 'react';
import {
    AbsoluteFill,
    Audio,
    continueRender,
    delayRender,
    Img,
    Sequence,
    // useVideoConfig,
} from 'remotion';
// import { PaginatedSubtitles } from './Subtitles';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';
import { TemoFileList } from '@/app/interface';
import { getLocalFileUrl } from '@/app/lib/utils';

export const fps = 30;
export const AudioGramSchema = z.object({
    audioOffsetInSeconds: z.number().min(0),
    subtitlesFileName: z.string().refine((s) => s.endsWith('.srt'), {
        message: 'Subtitles file must be a .srt file',
    }),
    audioFileName: z.string().refine((s) => s.endsWith('.mp3'), {
        message: 'Audio file must be a .mp3 file',
    }),
    // coverImgFileName: z
    //     .string()
    //     .refine(
    //         (s) =>
    //             s.endsWith('.jpg') ||
    //             s.endsWith('.jpeg') ||
    //             s.endsWith('.png') ||
    //             s.endsWith('.bmp'),
    //         {
    //             message: 'Image file must be a .jpg / .jpeg / .png / .bmp file',
    //         }
    //     ),
    // titleText: z.string(),
    // titleColor: zColor(),
    subText: z.string(),
    subtitlesTextColor: zColor(),
    subtitlesLinePerPage: z.number().int().min(0),
    subtitlesLineHeight: z.number().int().min(0),
    subtitlesZoomMeasurerSize: z.number().int().min(0),
    onlyDisplayCurrentSentence: z.boolean(),
});

// const defaultWave = {
//     waveColor: '#a3a5ae',
//     waveFreqRangeStartIndex: 7,
//     waveLinesToDisplay: 29,
//     waveNumberOfSamples: '256', // This is string for Remotion controls and will be converted to a number
//     mirrorWave: true,
// }

type AudiogramCompositionSchemaType = z.infer<typeof AudioGramSchema>;
export const MyComp: React.FC<AudiogramCompositionSchemaType & { bgm?: string, fileList: TemoFileList[], duration: number, type: 'audio' | 'video' }> = ({
    subtitlesFileName,
    subText,
    bgm,
    type,
    audioFileName,
    // coverImgFileName,
    // titleText,
    // titleColor,
    // subtitlesTextColor,
    // subtitlesLinePerPage,
    // audioOffsetInSeconds,
    // subtitlesZoomMeasurerSize,
    // subtitlesLineHeight,
    // onlyDisplayCurrentSentence,
    fileList,
    duration,
}) => {
    // const { durationInFrames } = useVideoConfig();

    const [handle] = useState(() => delayRender());
    const [subtitles, setSubtitles] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (subText) {
            setSubtitles(subText);
            continueRender(handle);
        } else {
            fetch(subtitlesFileName)
                .then((res) => res.text())
                .then((text) => {
                    setSubtitles(text);
                    continueRender(handle);
                })
                .catch((err) => {
                    console.log('Error fetching subtitles', err);
                });
        }
    }, [handle, subtitlesFileName, subText]);

    if (!subtitles) {
        return null;
    }
    // const audioOffsetInFrames = Math.round(audioOffsetInSeconds * fps);

    return (
        <div ref={ref}>
            <AbsoluteFill>
                <Sequence from={0} durationInFrames={duration}>
                    {!!bgm && <Audio src={bgm} />}
                    <Audio src={audioFileName} />

                    <div
                        className="container w-full max-w-none"
                        style={{
                            fontFamily: 'IBM Plex Sans',
                        }}
                    >
                        {/* <div className="row">
                            <Img className="cover" src={coverImgFileName} />

                            <div className="title" style={{ color: titleColor }}>
                                {titleText}
                            </div>
                        </div> */}

                        {/* <div
                            style={{ lineHeight: `${subtitlesLineHeight}px` }}
                            className="captions z-10 absolute bottom-2 left-0 w-full px-6"
                        >
                            <PaginatedSubtitles
                                subtitles={subtitles}
                                startFrame={audioOffsetInFrames}
                                endFrame={audioOffsetInFrames + durationInFrames}
                                linesPerPage={subtitlesLinePerPage}
                                subtitlesTextColor={subtitlesTextColor}
                                subtitlesZoomMeasurerSize={subtitlesZoomMeasurerSize}
                                subtitlesLineHeight={subtitlesLineHeight}
                                onlyDisplayCurrentSentence={onlyDisplayCurrentSentence}
                            />
                        </div> */}
                    </div>
                    {type === 'video' && fileList.map((file: TemoFileList, index: number) => (
                        <Sequence key={index} from={30 * file.from!} durationInFrames={30 * file.duration!}>
                            {file.pic && <div className="w-full">
                                <Img className="cover w-full h-full object-cover" src={getLocalFileUrl(file.pic.path)} />

                                <div className="subtitle absolute w-full p-6 left-0 bottom-0 opacity-0 font-text">
                                    {file.text}
                                </div>
                            </div>}
                        </Sequence>
                    ))}
                    {type !== 'video' && fileList.map((file: TemoFileList, index) => (
                        <Sequence key={index} from={30 * file.from!} durationInFrames={30 * file.duration!}>
                            <div className="w-full">
                                <div className="subtitle absolute w-full p-6 left-0 bottom-0 opacity-0 font-text">
                                    {file.text}
                                </div>
                            </div>
                        </Sequence>
                    ))}
                </Sequence>
            </AbsoluteFill>
        </div>
    );
};