/* eslint-disable react-refresh/only-export-components */
import './style.css'
import React from 'react';
import {
    AbsoluteFill,
    Audio,
    Img,
    Sequence,
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
});

export const MyComp: React.FC<z.infer<typeof myCompSchema>> = ({
    bgm,
    type,
    audioFileName,
    fileList,
    duration,
}) => {

    return (
        <AbsoluteFill>
            <Sequence from={0} durationInFrames={duration}>
                {!!bgm && <Audio volume={0.5} src={bgm} />}
                <Audio src={audioFileName} />
                {type === 'video' && fileList.map((file: TemoFileList, index: number) => (
                    <Sequence key={index} from={30 * file.from!} durationInFrames={30 * file.duration!}>
                        {file.pic && <div className="w-full">
                            <Img className="cover w-full h-full object-cover" src={getLocalFileUrl(file.pic.path)} />

                            <Subtitle text={file.text} />
                        </div>}
                    </Sequence>
                ))}
                {type !== 'video' && fileList.map((file: TemoFileList, index: number) => (
                    <Sequence key={index} from={30 * file.from!} durationInFrames={30 * file.duration!}>
                        <div className="w-full">
                            <Subtitle text={file.text} />
                        </div>
                    </Sequence>
                ))}
            </Sequence>
        </AbsoluteFill>
    );
};