import React, { useEffect, useState } from 'react';
import axios from 'axios';
import cheerio from 'cheerio';

const WebPageTextFetcher = ({ url }) => {
    const [textContent, setTextContent] = useState<string>('');

    useEffect(() => {
        const fetchWebPageText = async () => {
            try {
                const response = await axios.get(url);
                const html = response.data;

                // 使用cheerio解析HTML
                const $ = cheerio.load(html);

                // 提取文本内容
                const extractedTextContent = $('body').text();

                setTextContent(extractedTextContent);
            } catch (error) {
                console.error('Error fetching web page:', error.message);
                setTextContent(null);
            }
        };

        fetchWebPageText();
    }, [url]);

    return (
        <div>
            <h2>Web Page Text Content:</h2>
            {textContent !== null ? (
                <p>{textContent}</p>
            ) : (
                <p>Loading or Error occurred while fetching content.</p>
            )}
        </div>
    );
};