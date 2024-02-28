/* eslint-disable @typescript-eslint/no-unused-vars */
export function parseSRT(srtContent: string) {
    const subtitles = srtContent.split('\n\n');

    const result: any[] = [];

    subtitles.forEach((subtitle: string) => {
        const lines = subtitle.split('\n');

        if (lines.length >= 3) {
            const time = lines[1].split(' --> ');

            if (time.length === 2) {
                const startTime = time[0];
                const endTime = time[1];

                // Extract words and corresponding timings
                const words = lines.slice(2).join(' ').split(/\s+/);

                // Calculate timing for each word
                const wordTimings = calculateWordTimings(startTime, endTime, words.length);

                // Create objects with word and corresponding timing
                const subtitleObjects = words.map((word: any, i: number) => ({
                    word,
                    startTime: wordTimings[i],
                    endTime: i < wordTimings.length - 1 ? wordTimings[i + 1] : endTime,
                }));

                result.push(subtitleObjects);
            }
        }
    });

    return result;
}

function calculateWordTimings(startTime: any, endTime: any, wordCount: number) {
    const startMillis = timeToMillis(startTime);
    const endMillis = timeToMillis(endTime);
    const duration = endMillis - startMillis;

    const wordInterval = duration / wordCount;

    const wordTimings = [];
    for (let i = 0; i < wordCount; i++) {
        const wordTiming = startMillis + i * wordInterval;
        wordTimings.push(millisToTime(wordTiming));
    }

    return wordTimings;
}

function timeToMillis(time: { split: (arg0: RegExp) => { (): any; new(): any; map: { (arg0: NumberConstructor): [any, any, any, any]; new(): any; }; }; }) {
    const [hours, minutes, seconds, milliseconds] = time.split(/[:,]/).map(Number);
    return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

function millisToTime(millis: string | number | Date) {
    const date = new Date(millis);
    return date.toISOString().substr(11, 8);
}

export function mergeSubtitlesToSRT(subtitles: any[]) {
    let srtString = '';

    subtitles.forEach((subtitle: any[], subtitleIndex: number) => {
        subtitle.forEach((wordObj: { startTime: any; endTime: any; word: any; }, index: number) => {
            srtString += `${subtitleIndex * subtitle.length + index + 1}\n`;
            srtString += `${wordObj.startTime},000 --> ${wordObj.endTime},000\n`;
            srtString += `${wordObj.word}\n\n`;
        });
    });

    return srtString.trim();
}

// Example usage
// const srtContent1 = `1
// 00:00:00,000 --> 00:00:03,000
// This is an example subtitle.`;

// const srtContent2 = `1
// 00:00:03,500 --> 00:00:07,000
// Another subtitle for demonstration purposes.`;

// const subtitles1 = parseSRT(srtContent1);
// const subtitles2 = parseSRT(srtContent2);

// const mergedSubtitles = [subtitles1[0], subtitles2[0]]; // Assuming you want to merge the first subtitles of each

// const mergedSRT = mergeSubtitlesToSRT(mergedSubtitles);
// console.log(mergedSRT);
