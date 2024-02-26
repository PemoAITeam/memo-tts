import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import React, { useEffect, useRef, useState } from 'react';
import {
    AbsoluteFill,
    Audio,
    continueRender,
    delayRender,
    Img,
    Sequence,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion';

type AudiogramCompositionSchemaType = z.infer<typeof AudioGramSchema>;

export const MyComp: React.FC<{ text: string }> = ({ text }) => {
    const { durationInFrames } = useVideoConfig();

    const [handle] = useState(() => delayRender());
    const [subtitles, setSubtitles] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    return (
        <div ref={ref}>
            <AbsoluteFill>
                <Sequence from={-audioOffsetInFrames}>
                    <Audio src={audioFileName} />

                    <div
                        className="container"
                        style={{
                            fontFamily: 'IBM Plex Sans',
                        }}
                    >
                        <div className="row">
                            <Img className="cover" src={coverImgFileName} />

                            <div className="title" style={{ color: titleColor }}>
                                {titleText}
                            </div>
                        </div>

                        <div>
                            <AudioViz
                                audioSrc={audioFileName}
                                mirrorWave={mirrorWave}
                                waveColor={waveColor}
                                numberOfSamples={Number(waveNumberOfSamples)}
                                freqRangeStartIndex={waveFreqRangeStartIndex}
                                waveLinesToDisplay={waveLinesToDisplay}
                            />
                        </div>

                        <div
                            style={{ lineHeight: `${subtitlesLineHeight}px` }}
                            className="captions"
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
                        </div>
                    </div>
                </Sequence>
            </AbsoluteFill>
        </div>
    );
};