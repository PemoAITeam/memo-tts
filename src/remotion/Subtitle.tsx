import React, { useEffect, useRef, useState } from 'react';
import { continueRender, delayRender, interpolate, useCurrentFrame } from 'remotion';

import { COLOR_1, COLOR_1_bg, FONT_FAMILY } from './constants';

const subtitle: React.CSSProperties = {
	fontFamily: FONT_FAMILY,
	textAlign: 'center',
	position: 'absolute',
	bottom: 0,
	width: '100%',
	padding: '15px',
	textShadow: 'rgb(1 1 1) 0px 0px 7px, rgb(1 1 1) 0px 0px 7px, rgb(1 1 1) 0px 0px 7px, rgb(1 1 1) 0px 0px 7px, rgb(1 1 1) 0px 0px 7px, rgb(1 1 1) 0px 0px 7px, rgb(1 1 1) 0px 0px 7px, rgb(1 1 1) 0px 0px 7px, rgb(1 1 1) 0px 0px 7px, rgb(1 1 1) 0px 0px 7px, rgb(1 1 1) 0px 0px 7px, rgb(1 1 1) 0px 0px 7px',
	fontWeight: 'bold'
};

const codeStyle: React.CSSProperties = {
	color: COLOR_1,
	backgroundColor: COLOR_1_bg
};

interface SubtitleProps {
	text: string;
	subtitlesLineHeight: number;
	linesPerPage: number;
	subtitlesSize: number;
}

export const Subtitle: React.FC<SubtitleProps> = ({
	text,
	subtitlesLineHeight,
	linesPerPage,
	subtitlesSize
}: SubtitleProps) => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [0, 30], [0, 1]);
	const [lineOffset, setLineOffset] = useState(0);
	// const [containerHeight, setContainerHeight] = useState(0);
	const [handle] = useState(() => delayRender());
	const windowRef = useRef<HTMLDivElement>(null);
	// const zoomMeasurer = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// const cHeight = subtitlesSize * subtitlesLineHeight * linesPerPage;
		const linesRendered =
			(windowRef.current?.getBoundingClientRect().height as number) /
			(subtitlesLineHeight * subtitlesSize);
		const linesToOffset = Math.max(0, linesRendered - linesPerPage);
		setLineOffset(linesToOffset);
		// setContainerHeight(cHeight)
		continueRender(handle);
	}, [
		frame,
		handle,
		linesPerPage,
		subtitlesLineHeight,
		subtitlesSize,
	]);

	return (
		<div style={{
			position: 'absolute',
			// overflow: 'hidden',
			paddingBottom: '20px',
			width: '100%',
			bottom: 0,
			// height: `${containerHeight}px`
		}}>
			<div ref={windowRef} style={{
				...subtitle,
				opacity,
				...codeStyle,
				fontSize: subtitlesSize,
				lineHeight: subtitlesLineHeight,
				transform: `translateY(-${lineOffset * subtitlesLineHeight}px)`
			}}>
				<span>{text}</span>
			</div>
			{/* <div
				ref={zoomMeasurer}
				style={{
					height: subtitlesZoomMeasurerSize,
					width: subtitlesZoomMeasurerSize,
				}}
			/> */}
		</div>
	);
};
