/* eslint-disable react-refresh/only-export-components */
import './style.css'
import React from 'react';
import {
    AbsoluteFill,
    Audio,
    Img,
    Sequence,
    staticFile,
} from 'remotion';
import { z } from 'zod';
import { TemoFileList } from '@/app/interface';
import { getLocalFileUrl } from '@/app/lib/utils';
import { Subtitle } from './Subtitle';

export const fps = 30;
export const myCompSchema = z.object({
    audioFileName: z.string().refine((s) => s.endsWith('.mp3'), {
        message: 'Audio file must be a .mp3 file',
    }),
    bgm: z.any(),
    type: z.string(),
    fileList: z.any(),
    duration: z.number().int().min(0),
    subtitlesLinePerPage: z.number().int().min(0),
    subtitlesLineHeight: z.number().int().min(0),
    subtitlesSize: z.number().int().min(0),
});

export const MyComp: React.FC<z.infer<typeof myCompSchema>> = ({
    bgm,
    type,
    audioFileName,
    fileList,
    duration,
    subtitlesLinePerPage,
    subtitlesLineHeight,
    subtitlesSize,
}) => {

    return (
        <AbsoluteFill>
            <Sequence from={0} durationInFrames={duration}>
                {!!bgm && <Audio volume={0.3} src={bgm} />}
                <Audio volume={0.8} src={audioFileName} />
                {type !== 'video' && <Img className="cover w-full h-full object-cover" src={staticFile('cd.png')} />}
                {type === 'video' && fileList.map((file: TemoFileList, index: number) => (
                    <Sequence key={index} from={30 * file.from!} durationInFrames={30 * file.duration!}>
                        {file.pic && <div className="w-full">
                            <Img className="cover w-full h-full object-cover" src={getLocalFileUrl(file.pic.path)} />

                            <Subtitle linesPerPage={subtitlesLinePerPage} subtitlesSize={subtitlesSize}
                                subtitlesLineHeight={subtitlesLineHeight} text={file.text} />
                        </div>}
                    </Sequence>
                ))}
                {type !== 'video' && fileList.map((file: TemoFileList, index: number) => (
                    <Sequence key={index} from={30 * file.from!} durationInFrames={30 * file.duration!}>
                        <div className="w-full">

                            <Subtitle linesPerPage={subtitlesLinePerPage} subtitlesSize={subtitlesSize}
                                subtitlesLineHeight={subtitlesLineHeight} text={file.text} />
                        </div>
                    </Sequence>
                ))}
            </Sequence>
        </AbsoluteFill>
    );
};