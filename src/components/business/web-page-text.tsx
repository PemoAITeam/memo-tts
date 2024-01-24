import { useState, useEffect } from 'react';
import axios from 'axios';

interface WebContentProps {
    url: string
}
const WebContentFetcher = ({url}: WebContentProps) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(url); // 替换为您的网页链接
        setContent(response.data);
      } catch (error) {
        console.error('Error fetching web content:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2>Web Content:</h2>
      <pre>{content}</pre>
    </div>
  );
};

export default WebContentFetcher;