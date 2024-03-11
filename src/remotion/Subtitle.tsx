import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

import { COLOR_1, COLOR_1_bg, FONT_FAMILY } from './constants';

const subtitle: React.CSSProperties = {
	fontFamily: FONT_FAMILY,
	fontSize: '5rem',
	lineHeight: '1.2',
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
	text: string
}

export const Subtitle: React.FC<SubtitleProps> = ({ text }: SubtitleProps) => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [0, 30], [0, 1]);

	return (
		<div style={{ ...subtitle, opacity, ...codeStyle }}>
			{text}
		</div>
	);
};
